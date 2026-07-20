'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getMondayOfWeek, formatDate, getKoreaToday } from '@/lib/date'

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
}
const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner']
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export default function WeekPage() {
  const [weekDates, setWeekDates] = useState<string[]>([])
  const [todayStr, setTodayStr] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [mealMap, setMealMap] = useState<Record<string, Record<string, string[]>>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

      setWeekDates(dates)
      setTodayStr(todayFormatted)
      setSelectedDate(dates.includes(todayFormatted) ? todayFormatted : dates[0])

      const { data: meals, error: fetchError } = await supabase
        .from('meals')
        .select(
          `
          id,
          meal_date,
          meal_type,
          meal_items ( display_order, menu_items ( name ) )
        `
        )
        .gte('meal_date', dates[0])
        .lte('meal_date', dates[6])
        .eq('dorm', '도봉학사')
        .order('display_order', { referencedTable: 'meal_items' })

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      const map: Record<string, Record<string, string[]>> = {}
      for (const meal of meals ?? []) {
        if (!map[meal.meal_date]) map[meal.meal_date] = {}
        const items = [...meal.meal_items]
          .sort((a, b) => a.display_order - b.display_order)
          .map((mi) => mi.menu_items?.name)
          .filter(Boolean) as string[]
        map[meal.meal_date][meal.meal_type] = items
      }
      setMealMap(map)
      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return <div className="max-w-xl mx-auto px-6 py-16 text-muted-foreground">불러오는 중...</div>
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <h1 className="font-serif text-xl font-bold text-danger">오류 발생 😢</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  const selectedMeals = mealMap[selectedDate] ?? {}

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">주간 식단</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {weekDates[0]} ~ {weekDates[6]}
            <span className="mx-1 text-border-strong">·</span> 도봉학사
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          오늘로 →
        </Link>
      </div>

      {/* 요일 탭 */}
      <div className="grid grid-cols-7 gap-1.5 mb-7">
        {weekDates.map((dateStr, i) => {
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === todayStr
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : isToday
                  ? 'bg-accent-soft text-primary-hover'
                  : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{DAY_LABELS[i]}</span>
              <span className="text-xs opacity-80">{dateStr.slice(5)}</span>
            </button>
          )
        })}
      </div>

      {/* 선택된 요일의 끼니 카드 */}
      <div className="space-y-4">
        {MEAL_TYPE_ORDER.map((mealType) => {
          const items = selectedMeals[mealType]
          return (
            <div
              key={mealType}
              className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(118,85,42,0.04)]"
            >
              <h2 className="font-serif text-lg font-bold mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden />
                {MEAL_TYPE_LABEL[mealType]}
              </h2>
              {items && items.length > 0 ? (
                <ul className="space-y-1.5 text-[15px] text-foreground/90">
                  {items.map((name, idx) => (
                    <li key={idx}>{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">등록된 메뉴가 없습니다.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}