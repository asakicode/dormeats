'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getKoreaToday, formatDate } from '@/lib/date'
import { splitMenuName } from '@/lib/menu'
import FavoriteButton from '../components/FavoriteButton'

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
}
const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner']
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const UNDO_DURATION_MS = 5000

type Favorite = {
  id: string
  menu_items: { id: string; name: string } | null
}

type NextOccurrence = { meal_date: string; meal_type: string; rank: number }

function describeOccurrence(dateStr: string, mealType: string, todayStr: string, tomorrowStr: string): string {
  const label = MEAL_TYPE_LABEL[mealType] ?? mealType
  const [, m, d] = dateStr.split('-')
  const shortDate = `${Number(m)}/${Number(d)}`

  if (dateStr === todayStr) return `오늘 ${label} (${shortDate})`
  if (dateStr === tomorrowStr) return `내일 ${label} (${shortDate})`

  const dow = DOW_LABELS[new Date(`${dateStr}T00:00:00`).getDay()]
  return `${shortDate}(${dow}) ${label}`
}

function sortByNextOccurrence(favs: Favorite[], nextMap: Record<string, NextOccurrence>): Favorite[] {
  return [...favs].sort((a, b) => {
    const rankA = a.menu_items ? nextMap[a.menu_items.id]?.rank ?? Infinity : Infinity
    const rankB = b.menu_items ? nextMap[b.menu_items.id]?.rank ?? Infinity : Infinity
    return rankA - rankB
  })
}

export default function FavoritesPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [nextByMenuItem, setNextByMenuItem] = useState<Record<string, NextOccurrence>>({})
  const [todayStr, setTodayStr] = useState('')
  const [tomorrowStr, setTomorrowStr] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [removedToast, setRemovedToast] = useState<Favorite | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const today = getKoreaToday()
      const todayFormatted = formatDate(today)
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      const tomorrowFormatted = formatDate(tomorrow)
      setTodayStr(todayFormatted)
      setTomorrowStr(tomorrowFormatted)

      const { data: favData } = await supabase
        .from('favorites')
        .select('id, menu_items ( id, name )')
        .eq('user_id', user.id)

      const favs = (favData as unknown as Favorite[]) ?? []

      const { data: upcomingMeals } = await supabase
        .from('meals')
        .select('meal_date, meal_type, meal_items ( menu_item_id )')
        .eq('dorm', '도봉학사')
        .gte('meal_date', todayFormatted)
        .order('meal_date', { ascending: true })

      type UpcomingMeal = { meal_date: string; meal_type: string; meal_items: { menu_item_id: string }[] }
      const sortedMeals = ((upcomingMeals as unknown as UpcomingMeal[]) ?? []).sort((a, b) => {
        if (a.meal_date !== b.meal_date) return a.meal_date < b.meal_date ? -1 : 1
        return MEAL_TYPE_ORDER.indexOf(a.meal_type) - MEAL_TYPE_ORDER.indexOf(b.meal_type)
      })

      const nextMap: Record<string, NextOccurrence> = {}
      let rank = 0
      for (const meal of sortedMeals) {
        for (const item of meal.meal_items ?? []) {
          if (!nextMap[item.menu_item_id]) {
            nextMap[item.menu_item_id] = { meal_date: meal.meal_date, meal_type: meal.meal_type, rank }
          }
        }
        rank++
      }
      setNextByMenuItem(nextMap)

      const sortedFavs = sortByNextOccurrence(favs, nextMap)

      setFavorites(sortedFavs)
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const dismissToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastVisible(false)
    setTimeout(() => setRemovedToast(null), 200)
  }

  const removeFavorite = (favorite: Favorite) => {
    setFavorites((prev) => prev.filter((f) => f.id !== favorite.id))

    if (toastTimer.current) clearTimeout(toastTimer.current)
    setRemovedToast(favorite)
    requestAnimationFrame(() => setToastVisible(true))
    toastTimer.current = setTimeout(dismissToast, UNDO_DURATION_MS)
  }

  const undoRemove = async () => {
    if (!removedToast?.menu_items || !userId) return
    if (toastTimer.current) clearTimeout(toastTimer.current)

    const menuItemId = removedToast.menu_items.id
    const { data } = await supabase
      .from('favorites')
      .insert({ user_id: userId, menu_item_id: menuItemId })
      .select('id, menu_items ( id, name )')
      .maybeSingle()

    const restored = (data as unknown as Favorite) ?? removedToast
    setFavorites((prev) => sortByNextOccurrence([...prev, restored], nextByMenuItem))
    setToastVisible(false)
    setTimeout(() => setRemovedToast(null), 200)
  }

  if (loading) {
    return <div className="max-w-xl mx-auto px-6 py-16 text-muted-foreground">불러오는 중...</div>
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className="font-serif text-3xl font-bold tracking-tight mb-1">즐겨찾기 메뉴</h1>
      <p className="text-sm text-muted-foreground mb-7">{favorites.length}개 등록됨</p>

      {favorites.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-8 text-center text-muted-foreground">
          아직 즐겨찾기한 메뉴가 없습니다. 오늘의 식단에서 하트를 눌러보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {favorites.map((f) => {
            if (!f.menu_items) return null
            const { main, detail } = splitMenuName(f.menu_items.name)
            const next = nextByMenuItem[f.menu_items.id]

            return (
              <li
                key={f.id}
                className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-semibold text-sm text-foreground">{main}</div>
                  {detail && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{detail}</div>
                  )}
                  {next ? (
                    <div className="text-xs font-semibold text-primary-hover mt-1.5 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-current" />
                      다음 등장: {describeOccurrence(next.meal_date, next.meal_type, todayStr, tomorrowStr)}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1.5">이번 주 예정 없음</div>
                  )}
                </div>
                <FavoriteButton
                  menuItemId={f.menu_items.id}
                  onToggle={(favorited) => {
                    if (!favorited) removeFavorite(f)
                  }}
                />
              </li>
            )
          })}
        </ul>
      )}

      {removedToast?.menu_items && (
        <div
          className={`fixed inset-x-0 bottom-24 z-50 flex justify-center px-6 transition-all duration-200 ${
            toastVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <div className="relative overflow-hidden flex items-center gap-3 rounded-full bg-foreground text-background pl-4 pr-2 py-2 shadow-lg max-w-full">
            <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
              {splitMenuName(removedToast.menu_items.name).main} 즐겨찾기에서 제거됨
            </span>
            <button
              onClick={undoRemove}
              className="text-sm font-semibold text-star shrink-0 rounded-full px-3 py-1 hover:bg-background/10"
            >
              실행취소
            </button>
            <div
              key={removedToast.id}
              className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-star/70"
              style={{ animation: `toast-progress ${UNDO_DURATION_MS}ms linear forwards` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
