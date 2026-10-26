'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getKoreaToday, formatDate } from '@/lib/date'
import { splitMenuName } from '@/lib/menu'
import { computeNextByGroup, groupFavorites, type NextOccurrence } from '@/lib/menu-group'
import { Heart } from 'lucide-react'
import FavoriteButton from '../components/FavoriteButton'
import EmptyState from '../components/EmptyState'

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
}
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const UNDO_DURATION_MS = 5000

type Favorite = {
  id: string
  menu_items: { id: string; name: string; group_id: string | null } | null
}

type FavoriteRow = ReturnType<typeof groupFavorites<Favorite>>[number]
type RemovedToast = { row: FavoriteRow; menuItemIds: string[] }

function describeOccurrence(dateStr: string, mealType: string, todayStr: string, tomorrowStr: string): string {
  const label = MEAL_TYPE_LABEL[mealType] ?? mealType
  const [, m, d] = dateStr.split('-')
  const shortDate = `${Number(m)}/${Number(d)}`

  if (dateStr === todayStr) return `오늘 ${label} (${shortDate})`
  if (dateStr === tomorrowStr) return `내일 ${label} (${shortDate})`

  const dow = DOW_LABELS[new Date(`${dateStr}T00:00:00`).getDay()]
  return `${shortDate}(${dow}) ${label}`
}

function sortByNextOccurrence(rows: FavoriteRow[], nextMap: Record<string, NextOccurrence>): FavoriteRow[] {
  return [...rows].sort((a, b) => (nextMap[a.key]?.rank ?? Infinity) - (nextMap[b.key]?.rank ?? Infinity))
}

async function fetchFavoriteRows(userId: string): Promise<FavoriteRow[]> {
  const { data } = await supabase
    .from('favorites')
    .select('id, menu_items ( id, name, group_id )')
    .eq('user_id', userId)
  return groupFavorites((data as unknown as Favorite[]) ?? [])
}

export default function FavoritesPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteRow[]>([])
  const [nextByGroup, setNextByGroup] = useState<Record<string, NextOccurrence>>({})
  const [todayStr, setTodayStr] = useState('')
  const [tomorrowStr, setTomorrowStr] = useState('')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [removedToast, setRemovedToast] = useState<RemovedToast | null>(null)
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

      const rows = await fetchFavoriteRows(user.id)

      const { data: upcomingMeals } = await supabase
        .from('meals')
        .select('meal_date, meal_type, meal_items ( menu_item_id, menu_items ( name, group_id ) )')
        .eq('dorm', '도봉학사')
        .gte('meal_date', todayFormatted)
        .order('meal_date', { ascending: true })

      const nextMap = computeNextByGroup((upcomingMeals as unknown as Parameters<typeof computeNextByGroup>[0]) ?? [])
      setNextByGroup(nextMap)
      setFavorites(sortByNextOccurrence(rows, nextMap))
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

  const removeFavorite = (row: FavoriteRow, menuItemIds: string[]) => {
    setFavorites((prev) => prev.filter((r) => r.key !== row.key))

    if (toastTimer.current) clearTimeout(toastTimer.current)
    setRemovedToast({ row, menuItemIds })
    requestAnimationFrame(() => setToastVisible(true))
    toastTimer.current = setTimeout(dismissToast, UNDO_DURATION_MS)
  }

  const undoRemove = async () => {
    if (!removedToast || !userId) return
    if (toastTimer.current) clearTimeout(toastTimer.current)

    // 묶음 전체를 되살린다. 하나가 실패해도 나머지는 계속
    for (const menuItemId of removedToast.menuItemIds) {
      await supabase.from('favorites').insert({ user_id: userId, menu_item_id: menuItemId })
    }

    const rows = await fetchFavoriteRows(userId)
    setFavorites(sortByNextOccurrence(rows, nextByGroup))
    setToastVisible(false)
    setTimeout(() => setRemovedToast(null), 200)
  }

  if (loading) {
    return <div className="max-w-xl mx-auto px-6 py-16 text-muted-foreground">불러오는 중...</div>
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight mb-1">즐겨찾기 메뉴</h1>
      <p className="text-sm text-muted-foreground mb-7">{favorites.length}개 등록됨</p>

      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="즐겨찾기한 메뉴가 없어요"
          description="식단에서 하트를 누르면 여기 모여요"
          action={{ href: '/', label: '오늘의 식단 보기' }}
        />
      ) : (
        <ul className="flex flex-col">
          {favorites.map((row) => {
            const menuItem = row.primary.menu_items
            if (!menuItem) return null
            const { main, detail } = splitMenuName(menuItem.name)
            const next = nextByGroup[row.key]
            const nextMain = next ? splitMenuName(next.name).main : ''

            return (
              <li
                key={row.key}
                className="py-3.5 border-b border-border flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-semibold text-sm text-foreground">{main}</div>
                  {detail && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{detail}</div>
                  )}
                  {next ? (
                    <div className="text-xs font-semibold text-foreground mt-1.5 flex items-center gap-1.5">
                      <span className="w-[5px] h-[5px] rounded-full bg-foreground" />
                      다음 등장: {nextMain !== main && `${nextMain} · `}
                      {describeOccurrence(next.meal_date, next.meal_type, todayStr, tomorrowStr)}
                    </div>
                  ) : (
                    <div className="text-xs text-faint mt-1.5">이번 주 예정 없음</div>
                  )}
                </div>
                <FavoriteButton
                  menuItemId={menuItem.id}
                  groupId={menuItem.group_id}
                  onToggle={(favorited, removedMenuItemIds) => {
                    if (!favorited) removeFavorite(row, removedMenuItemIds)
                  }}
                />
              </li>
            )
          })}
        </ul>
      )}

      {removedToast?.row.primary.menu_items && (
        <div
          className={`fixed inset-x-0 bottom-24 z-50 flex justify-center px-6 transition-all duration-200 ${
            toastVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <div className="relative overflow-hidden flex items-center gap-3 rounded-full bg-foreground text-background pl-4 pr-2 py-2 shadow-lg max-w-full">
            <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
              {splitMenuName(removedToast.row.primary.menu_items.name).main} 즐겨찾기에서 제거됨
            </span>
            <button
              onClick={undoRemove}
              className="text-sm font-bold text-background shrink-0 rounded-full px-3 py-1 hover:bg-background/10"
            >
              실행취소
            </button>
            <div
              key={removedToast.row.key}
              className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-background/60"
              style={{ animation: `toast-progress ${UNDO_DURATION_MS}ms linear forwards` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
