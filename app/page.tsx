import { supabase } from '@/lib/supabase'
import ReviewSection from './components/ReviewSection'
import { getKoreaToday, formatDate, getCurrentMealType } from '@/lib/date'
import FavoriteButton from './components/FavoriteButton'

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
}
const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner']

export default async function Home() {
  const todayStr = formatDate(getKoreaToday())
  const currentMealType = getCurrentMealType()

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
      <div className="max-w-xl mx-auto px-6 py-16">
        <h1 className="font-serif text-xl font-bold text-danger">오류 발생 😢</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  const sortedMeals = [...(meals ?? [])].sort(
    (a, b) => MEAL_TYPE_ORDER.indexOf(a.meal_type) - MEAL_TYPE_ORDER.indexOf(b.meal_type)
  )

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight">오늘의 식단</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {todayStr} <span className="mx-1.5 text-border-strong">·</span>{' '}
          <span className="inline-block px-2 py-0.5 rounded-full bg-accent-soft text-primary-hover font-medium">
            도봉학사
          </span>
        </p>
      </header>
      {sortedMeals.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-8 text-center text-muted-foreground">
          오늘 등록된 식단이 없습니다.
        </p>
      )}
      <div className="space-y-5">
        {sortedMeals.map((meal) => {
          const isCurrent = meal.meal_type === currentMealType
          return (
            <div
              key={meal.id}
              className={
                isCurrent
                  ? 'rounded-2xl border border-accent-soft-border bg-accent-soft/40 p-6 shadow-[0_1px_2px_rgba(36,26,16,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(36,26,16,0.06)]'
                  : 'rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(36,26,16,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(36,26,16,0.06)]'
              }
            >
              <h2
                className={
                  isCurrent
                    ? 'font-serif text-xl font-bold mb-3.5 flex items-center gap-2'
                    : 'font-serif text-lg font-bold mb-3.5 flex items-center gap-2'
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden />
                {MEAL_TYPE_LABEL[meal.meal_type] ?? meal.meal_type}
                {isCurrent && (
                  <span className="ml-1 text-xs font-normal text-primary-hover bg-accent-soft px-2 py-0.5 rounded-full">
                    지금 식사시간
                  </span>
                )}
              </h2>
              <ul className="space-y-2">
                {meal.meal_items
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-2 text-[15px] text-foreground/90"
                    >
                      <span>{item.menu_items?.name}</span>
                      {item.menu_items?.id && (
                        <FavoriteButton menuItemId={item.menu_items.id} />
                      )}
                    </li>
                  ))}
              </ul>
              <ReviewSection mealId={meal.id} />
            </div>
          )
        })}
      </div>
    </div>
  )
}