import { supabase } from '@/lib/supabase'
import { getMondayOfWeek, formatDate } from '@/lib/date'
import Link from 'next/link'

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
}
const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner']
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export default async function WeekPage() {
  const today = new Date()
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
      <div className="p-10">
        <h1 className="text-xl font-bold text-red-600">오류 발생 😢</h1>
        <p className="mt-2 text-sm text-gray-600">{error.message}</p>
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
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">📅 주간 식단</h1>
          <p className="text-gray-500">
            {startStr} ~ {endStr} · 도봉학사
          </p>
        </div>
        <Link href="/" className="text-sm text-blue-600 underline">
          오늘의 식단으로
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-50 w-16">구분</th>
              {weekDates.map((dateStr, i) => (
                <th key={dateStr} className="border p-2 bg-gray-50 text-sm">
                  <div>{DAY_LABELS[i]}</div>
                  <div className="text-xs text-gray-400">{dateStr.slice(5)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPE_ORDER.map((mealType) => (
              <tr key={mealType}>
                <td className="border p-2 font-semibold bg-gray-50 text-center">
                  {MEAL_TYPE_LABEL[mealType]}
                </td>
                {weekDates.map((dateStr) => {
                  const items = mealMap[dateStr]?.[mealType]
                  return (
                    <td key={dateStr} className="border p-2 align-top text-sm">
                      {items && items.length > 0 ? (
                        <ul className="space-y-0.5">
                          {items.map((name, idx) => (
                            <li key={idx}>{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-300">-</span>
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