'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, getKoreaToday, getCurrentMealType, getNextMealType, getWeekDates } from '@/lib/date'
import { MEAL_ORDER, getMealPhases, getSeoulMinutes } from '@/lib/meal-time'
import { useNow } from '@/lib/useNow'
import DateStrip from './components/home/DateStrip'
import MealSection from './components/home/MealSection'
import TopWishPost from './components/home/TopWishPost'

export type MealItem = { display_order: number; menu_items: { id: string; name: string } | null }
export type Meal = { id: string; meal_type: string; meal_date: string; meal_items: MealItem[] }
export type TopPost = { id: string; title: string; content: string; like_count: number; is_anonymous: boolean; created_at: string; author_nickname: string | null }

export default function Home() {
  const now = useNow()
  const [todayStr, setTodayStr] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [mealMap, setMealMap] = useState<Record<string, Record<string, Meal>>>({})
  const [expandedMeal, setExpandedMeal] = useState<string>('')
  const [topPost, setTopPost] = useState<TopPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const today = getKoreaToday()
      const todayFormatted = formatDate(today)

      const currentMeal = getCurrentMealType()
      const nextMeal = currentMeal ? null : getNextMealType()
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      const tomorrowFormatted = formatDate(tomorrow)
      const todayHasEnded = !currentMeal && nextMeal?.when === 'tomorrow'
      const effective = todayHasEnded ? tomorrowFormatted : todayFormatted
      const dates = getWeekDates(effective)

      setTodayStr(todayFormatted)
      setEffectiveDate(effective)
      setSelectedDate(effective)

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

      setExpandedMeal(currentMeal ?? nextMeal?.type ?? '')

      const { data: topPosts } = await supabase
        .from('posts_view')
        .select('id, title, content, like_count, is_anonymous, created_at, author_nickname')
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

  const weekDates = getWeekDates(effectiveDate)
  const dayMeals = mealMap[selectedDate] ?? {}
  const phases =
    selectedDate === effectiveDate
      ? getMealPhases(getSeoulMinutes(now), effectiveDate === todayStr ? 0 : 1)
      : null
  const viewingRealToday = selectedDate === todayStr

  return (
    <div className="max-w-xl mx-auto px-5 py-6">
      <DateStrip
        weekDates={weekDates}
        selectedDate={selectedDate}
        todayStr={todayStr}
        effectiveDate={effectiveDate}
        onSelect={setSelectedDate}
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
              onExpand={() => setExpandedMeal(mealType)}
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
