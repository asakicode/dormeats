'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getMondayOfWeek, formatDate, getKoreaToday, getCurrentMealType, formatRelativeTime } from '@/lib/date'
import { splitMenuName } from '@/lib/menu'
import FavoriteButton from './components/FavoriteButton'
import ReviewSection from './components/ReviewSection'

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
}
const MEAL_TYPE_TIME: Record<string, string> = {
  breakfast: '07:00 ~ 08:30',
  lunch: '12:00 ~ 13:00',
  dinner: '18:30 ~ 20:00',
}
const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner']
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

type MealItem = { display_order: number; menu_items: { id: string; name: string } | null }
type Meal = { id: string; meal_type: string; meal_date: string; meal_items: MealItem[] }
type TopPost = { id: string; title: string; content: string; like_count: number; is_anonymous: boolean; created_at: string; users: { nickname: string } | null }

export default function Home() {
  const [view, setView] = useState<'today' | 'week'>('today')
  const [todayStr, setTodayStr] = useState('')
  const [weekDates, setWeekDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [currentMealType, setCurrentMealType] = useState<string>('')
  const [mealMap, setMealMap] = useState<Record<string, Record<string, Meal>>>({})
  const [expandedMeal, setExpandedMeal] = useState<string>('')
  const [topPost, setTopPost] = useState<TopPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const today = getKoreaToday()
      const todayFormatted = formatDate(today)
      const monday = getMondayOfWeek(today)
      const dates: string[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        dates.push(formatDate(d))
      }

      setTodayStr(todayFormatted)
      setWeekDates(dates)
      setSelectedDate(todayFormatted)
      setCurrentMealType(getCurrentMealType())

      const { data: meals } = await supabase
        .from('meals')
        .select('id, meal_type, meal_date, meal_items ( display_order, menu_items ( id, name ) )')
        .gte('meal_date', dates[0])
        .lte('meal_date', dates[6])
        .eq('dorm', '도봉학사')
        .order('display_order', { referencedTable: 'meal_items' })

      const map: Record<string, Record<string, Meal>> = {}
      for (const meal of (meals as unknown as Meal[]) ?? []) {
        if (!map[meal.meal_date]) map[meal.meal_date] = {}
        map[meal.meal_date][meal.meal_type] = meal
      }
      setMealMap(map)

      setExpandedMeal(getCurrentMealType())

      const { data: topPosts } = await supabase
        .from('posts')
        .select('id, title, content, like_count, is_anonymous, created_at, users ( nickname )')
        .eq('board_type', 'wish')
        .gt('like_count', 0)
        .order('like_count', { ascending: false })
        .limit(1)

      setTopPost((topPosts?.[0] as unknown as TopPost) ?? null)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="max-w-xl mx-auto px-6 py-16 text-muted-foreground">불러오는 중...</div>
  }

  const dayMeals = mealMap[selectedDate] ?? {}
  const isViewingToday = selectedDate === todayStr

  return (
    <div className="max-w-xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <div className="bg-accent-soft p-1 rounded-2xl flex text-xs font-semibold flex-1">
          <button
            onClick={() => { setView('today'); setSelectedDate(todayStr) }}
            className={`flex-1 py-2 rounded-xl transition-colors ${
              view === 'today' ? 'bg-surface text-foreground shadow-sm font-bold' : 'text-muted-foreground'
            }`}
          >
            오늘의 식단 ({todayStr.slice(5)})
          </button>
          <button
            onClick={() => setView('week')}
            className={`flex-1 py-2 rounded-xl transition-colors ${
              view === 'week' ? 'bg-surface text-foreground shadow-sm font-bold' : 'text-muted-foreground'
            }`}
          >
            주간 식단
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-5 px-1">도봉학사</p>

      {view === 'week' && (
        <div className="grid grid-cols-7 gap-1.5 mb-6">
          {weekDates.map((dateStr, i) => {
            const isSelected = dateStr === selectedDate
            const isToday = dateStr === todayStr
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isToday
                    ? 'bg-accent-soft text-primary-hover'
                    : 'bg-surface border border-border text-muted-foreground'
                }`}
              >
                <span>{DAY_LABELS[i]}</span>
                <span className="text-[10px] opacity-80">{dateStr.slice(5)}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="space-y-4">
        {MEAL_TYPE_ORDER.map((mealType) => {
          const meal = dayMeals[mealType]
          const isCurrent = isViewingToday && mealType === currentMealType
          const isExpanded = mealType === expandedMeal

          if (!isExpanded) {
            return (
              <button
                key={mealType}
                onClick={() => setExpandedMeal(mealType)}
                className="w-full rounded-2xl border border-border bg-surface px-5 py-4 flex justify-between items-center text-left hover:border-border-strong transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-foreground">{MEAL_TYPE_LABEL[mealType]}</span>
                    <span className="text-[11px] text-muted-foreground">{MEAL_TYPE_TIME[mealType]}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold text-primary-hover bg-accent-soft px-2 py-0.5 rounded-full">
                        지금
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {meal?.meal_items?.length
                      ? `${meal.meal_items
                          .slice(0, 3)
                          .map((mi) => (mi.menu_items ? splitMenuName(mi.menu_items.name).main : ''))
                          .join(', ')}${
                          meal.meal_items.length > 3 ? ` 외 ${meal.meal_items.length - 3}개` : ''
                        }`
                      : '등록된 메뉴가 없습니다'}
                  </p>
                </div>
                <span className="text-muted-foreground">›</span>
              </button>
            )
          }

          const sortedItems = meal?.meal_items
            ? [...meal.meal_items].sort((a, b) => a.display_order - b.display_order)
            : []
          const leftItems = sortedItems.filter((_, idx) => idx % 2 === 0)
          const rightItems = sortedItems.filter((_, idx) => idx % 2 === 1)

          const renderMenuCard = (item: MealItem, key: string) => {
            if (!item.menu_items) return null
            const { main, detail } = splitMenuName(item.menu_items.name)
            return (
              <div
                key={key}
                className="bg-surface border border-border rounded-xl px-3 py-2 flex justify-between items-center text-sm text-foreground/90"
              >
                <div>
                  <div>{main}</div>
                  {detail && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {detail}
                    </div>
                  )}
                </div>
                {item.menu_items.id && (
                  <FavoriteButton menuItemId={item.menu_items.id} />
                )}
              </div>
            )
          }

          return (
            <div
              key={mealType}
              className={
                isCurrent
                  ? 'rounded-2xl border border-accent-soft-border bg-accent-soft p-6 relative'
                  : 'rounded-2xl border border-border bg-surface p-5 relative'
              }
            >
              {isCurrent && (
                <span className="absolute top-0 right-5 -translate-y-1/2 bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  지금 식사시간
                </span>
              )}
              <div className="flex items-baseline gap-2 mb-4">
                <h2 className="font-serif text-xl font-bold text-foreground">{MEAL_TYPE_LABEL[mealType]}</h2>
                <span className="text-xs text-muted-foreground">{MEAL_TYPE_TIME[mealType]}</span>
              </div>

              {sortedItems.length ? (
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 flex flex-col gap-2">
                    {leftItems.map((item, idx) =>
                      renderMenuCard(item, item.menu_items?.id ?? `left-${idx}`)
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    {rightItems.map((item, idx) =>
                      renderMenuCard(item, item.menu_items?.id ?? `right-${idx}`)
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">등록된 메뉴가 없습니다.</p>
              )}

              {isViewingToday && meal && <ReviewSection mealId={meal.id} />}
            </div>
          )
        })}
      </div>

      {topPost && (
        <div className="mt-8">
          <div className="flex justify-between items-end mb-3 px-1">
            <div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-wide">Community</p>
              <h3 className="font-serif font-bold text-base text-foreground">실시간 희망메뉴 칠판 📌</h3>
            </div>
            <Link href="/board" className="text-xs font-semibold text-primary-hover">전체보기 →</Link>
          </div>
          <Link
            href={`/board/${topPost.id}`}
            className="block bg-accent-soft border border-accent-soft-border rounded-2xl p-4"
            style={{ transform: 'rotate(-0.6deg)' }}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md">TOP 1 🔥</span>
              <span className="text-[11px] text-muted-foreground">
                {topPost.is_anonymous ? '익명' : topPost.users?.nickname ?? '알 수 없음'} · {formatRelativeTime(topPost.created_at)}
              </span>
            </div>
            <h4 className="font-bold text-sm text-foreground mb-1">{topPost.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{topPost.content}</p>
            <div className="flex justify-end">
              <span className="bg-surface border border-accent-soft-border px-2.5 py-1 rounded-full text-xs font-bold text-danger">
                ❤️ {topPost.like_count}
              </span>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}