import { supabase } from '@/lib/supabase'
import { getMondayOfWeek, formatDate, getKoreaToday } from '@/lib/date'
import Link from 'next/link'


const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
}
const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner']
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export default async function WeekPage() {
  const today = getKoreaToday()
  const monday = getMondayOfWeek(today)
  const weekDates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    weekDates.push(formatDate(d))
  }
  const startStr = weekDates[0]
  const endStr = weekDates[6]

  const { data: meals, error } = await supabase
    .from('meals')
    .select(
      `
      id,
      meal_date,
      meal_type,
      meal_items ( display_order, menu_items ( name ) )
    `
    )
    .gte('meal_date', startStr)
    .lte('meal_date', endStr)
    .eq('dorm', '도봉학사')
    .order('display_order', { referencedTable: 'meal_items' })

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <h1 className="font-serif text-xl font-bold text-danger">오류 발생 😢</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  const mealMap: Record<string, Record<string, string[]>> = {}
  for (const meal of meals ?? []) {
    if (!mealMap[meal.meal_date]) mealMap[meal.meal_date] = {}
    const items = [...meal.meal_items]
      .sort((a, b) => a.display_order - b.display_order)
      .map((mi) => mi.menu_items?.name)
      .filter(Boolean) as string[]
    mealMap[meal.meal_date][meal.meal_type] = items
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">주간 식단</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {startStr} ~ {endStr}{' '}
            <span className="mx-1 text-border-strong">·</span> 도봉학사
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          오늘의 식단으로 →
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-3 w-16 text-xs font-semibold text-muted-foreground border-b border-border">
                구분
              </th>
              {weekDates.map((dateStr, i) => {
                const isToday = dateStr === formatDate(today)
                return (
                  <th
                    key={dateStr}
                    className={`p-3 border-b border-l border-border font-medium ${
                      isToday ? 'bg-accent-soft' : ''
                    }`}
                  >
                    <div className={isToday ? 'text-primary-hover font-bold' : ''}>
                      {DAY_LABELS[i]}
                    </div>
                    <div className="text-xs font-normal text-muted-foreground mt-0.5">
                      {dateStr.slice(5)}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPE_ORDER.map((mealType, rowIdx) => (
              <tr key={mealType}>
                <td
                  className={`p-3 font-semibold text-center text-foreground/80 ${
                    rowIdx > 0 ? 'border-t border-border' : ''
                  }`}
                >
                  {MEAL_TYPE_LABEL[mealType]}
                </td>
                {weekDates.map((dateStr) => {
                  const items = mealMap[dateStr]?.[mealType]
                  const isToday = dateStr === formatDate(today)
                  return (
                    <td
                      key={dateStr}
                      className={`p-3 align-top border-l border-border ${
                        rowIdx > 0 ? 'border-t' : ''
                      } ${isToday ? 'bg-accent-soft/40' : ''}`}
                    >
                      {items && items.length > 0 ? (
                        <ul className="space-y-1 leading-snug">
                          {items.map((name, idx) => (
                            <li key={idx}>{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-border-strong">–</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}