'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getWeekDates } from '@/lib/date'
import { MEAL_ORDER, getEffectiveDay, getMealPhases, getSeoulMinutes } from '@/lib/meal-time'
import { useNow } from '@/lib/useNow'
import DateStrip from './components/home/DateStrip'
import MealSection from './components/home/MealSection'
import TopWishPost from './components/home/TopWishPost'

export type MealItem = { display_order: number; menu_items: { id: string; name: string } | null }
export type Meal = { id: string; meal_type: string; meal_date: string; meal_items: MealItem[] }
export type TopPost = { id: string; title: string; content: string; like_count: number; is_anonymous: boolean; created_at: string; author_nickname: string | null }

export default function Home() {
  const now = useNow()
  // 날짜 기준은 매 분 다시 계산한다. 탭을 켜 둔 채 자정이나 저녁 8시를 넘겨도 맞게 바뀐다.
  const { todayStr, effectiveDate } = getEffectiveDay(now)
  const weekDates = getWeekDates(effectiveDate)
  const weekStart = weekDates[0]

  // 사용자가 고르지 않았으면 기준일과 현재 끼니를 따라간다
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const [pickedMeal, setPickedMeal] = useState<string | null>(null)
  const [mealMap, setMealMap] = useState<Record<string, Record<string, Meal>>>({})
  const [loadedWeek, setLoadedWeek] = useState<string | null>(null)
  const [topPost, setTopPost] = useState<TopPost | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const dates = getWeekDates(weekStart)
      const { data: meals } = await supabase
        .from('meals')
        .select('id, meal_type, meal_date, meal_items ( display_order, menu_items ( id, name ) )')
        .gte('meal_date', dates[0])
        .lte('meal_date', dates[6])
        .eq('dorm', '도봉학사')
        .order('display_order', { referencedTable: 'meal_items' })
      if (cancelled) return

      const map: Record<string, Record<string, Meal>> = {}
      for (const meal of (meals as unknown as Meal[]) ?? []) {
        if (!map[meal.meal_date]) map[meal.meal_date] = {}
        map[meal.meal_date][meal.meal_type] = meal
      }
      setMealMap(map)
      setLoadedWeek(weekStart)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [weekStart])

  useEffect(() => {
    const load = async () => {
      const { data: topPosts } = await supabase
        .from('posts_view')
        .select('id, title, content, like_count, is_anonymous, created_at, author_nickname')
        .eq('board_type', 'wish')
        .gt('like_count', 0)
        .order('like_count', { ascending: false })
        .limit(1)
      setTopPost((topPosts?.[0] as unknown as TopPost) ?? null)
    }
    load()
  }, [])

  if (loadedWeek === null) {
    return <div className="max-w-xl mx-auto px-6 py-16 text-muted-foreground">불러오는 중...</div>
  }

  const selectedDate = pickedDate && weekDates.includes(pickedDate) ? pickedDate : effectiveDate
  const dayMeals = mealMap[selectedDate] ?? {}
  const effectivePhases = getMealPhases(getSeoulMinutes(now), effectiveDate === todayStr ? 0 : 1)
  const phases = selectedDate === effectiveDate ? effectivePhases : null
  const defaultMeal =
    MEAL_ORDER.find((t) => effectivePhases[t].kind === 'now' || effectivePhases[t].kind === 'upcoming') ?? ''
  const expandedMeal = pickedMeal ?? defaultMeal
  const viewingRealToday = selectedDate === todayStr

  return (
    <div className="max-w-xl mx-auto px-5 py-6">
      <DateStrip
        weekDates={weekDates}
        selectedDate={selectedDate}
        todayStr={todayStr}
        effectiveDate={effectiveDate}
        onSelect={(d) => setPickedDate(d === effectiveDate ? null : d)}
      />

      <div>
        {MEAL_ORDER.map((mealType) => {
          const meal = dayMeals[mealType]
          const phase = phases?.[mealType] ?? null
          return (
            <MealSection
              key={mealType}
              mealType={mealType}
              meal={meal}
              expanded={mealType === expandedMeal}
              onExpand={() => setPickedMeal(mealType)}
              phase={phase}
              dimmed={viewingRealToday && phase?.kind === 'ended'}
              showReviews={viewingRealToday && !!meal}
            />
          )
        })}
      </div>

      {topPost && <TopWishPost post={topPost} />}
    </div>
  )
}
