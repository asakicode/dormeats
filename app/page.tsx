import { supabase } from '@/lib/supabase'
import ReviewSection from './components/ReviewSection'
import { getKoreaToday, formatDate } from '@/lib/date'
import FavoriteButton from './components/FavoriteButton'

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
}

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner']

export default async function Home() {
  const todayStr = formatDate(getKoreaToday())

  const { data: meals, error } = await supabase
    .from('meals')
    .select(
      `
      id,
      meal_type,
      meal_date,
      meal_items (
        display_order,
        menu_items ( id, name )
      )
    `
    )
    .eq('meal_date', todayStr)
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

  const sortedMeals = [...(meals ?? [])].sort(
    (a, b) => MEAL_TYPE_ORDER.indexOf(a.meal_type) - MEAL_TYPE_ORDER.indexOf(b.meal_type)
  )

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">🍚 오늘의 식단</h1>
      <p className="text-gray-500 mb-6">{todayStr} · 도봉학사</p>

      {sortedMeals.length === 0 && (
        <p className="text-gray-400">오늘 등록된 식단이 없습니다.</p>
      )}

      <div className="space-y-6">
        {sortedMeals.map((meal) => (
          <div key={meal.id} className="border rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-3">
              {MEAL_TYPE_LABEL[meal.meal_type] ?? meal.meal_type}
            </h2>
            <ul className="space-y-1">
              {meal.meal_items
                .sort((a, b) => a.display_order - b.display_order)
                .map((item, idx) => (
                  <li key={idx} className="text-gray-700 flex items-center gap-1.5">
                    <span>{item.menu_items?.name}</span>
                    {item.menu_items?.id && (
                      <FavoriteButton menuItemId={item.menu_items.id} />
                    )}
                  </li>
                ))}
            </ul>
            <ReviewSection mealId={meal.id} />
          </div>
        ))}
      </div>
    </div>
  )
}