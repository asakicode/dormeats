import { ChevronRight } from 'lucide-react'
import { splitMenuName } from '@/lib/menu'
import { formatDuration, type MealPhase, type MealType } from '@/lib/meal-time'
import FavoriteButton from '../FavoriteButton'
import ReviewSection from '../ReviewSection'
import type { Meal } from '@/app/page'

const MEAL_TYPE_LABEL: Record<MealType, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁' }
const MEAL_TYPE_TIME: Record<MealType, string> = {
  breakfast: '07:00 ~ 08:30',
  lunch: '12:00 ~ 13:00',
  dinner: '18:30 ~ 20:00',
}

function MealStatus({ phase, className = '' }: { phase: MealPhase | null; className?: string }) {
  if (phase?.kind === 'now') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
        <i className="block h-1.5 w-1.5 rounded-full bg-foreground animate-pulse-dot" />
        <b>지금</b>
        <span className="font-medium text-muted-foreground">· {formatDuration(phase.minutesLeft)} 남음</span>
      </span>
    )
  }
  if (phase?.kind === 'upcoming') {
    return (
      <span className={`text-xs font-semibold text-muted-foreground ${className}`}>
        {formatDuration(phase.minutesUntil)} 후
      </span>
    )
  }
  return null
}

export default function MealSection({
  mealType,
  meal,
  expanded,
  onExpand,
  phase,
  dimmed,
  showReviews,
}: {
  mealType: MealType
  meal: Meal | undefined
  expanded: boolean
  onExpand: () => void
  phase: MealPhase | null
  dimmed: boolean
  showReviews: boolean
}) {
  const dim = dimmed ? 'opacity-60' : ''
  const sortedItems = meal?.meal_items ? [...meal.meal_items].sort((a, b) => a.display_order - b.display_order) : []

  if (!expanded) {
    return (
      <button
        onClick={onExpand}
        className="w-full flex items-center justify-between py-3.5 border-b border-border text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-base font-bold ${dim}`}>{MEAL_TYPE_LABEL[mealType]}</span>
            <span className={`text-xs text-faint ${dim}`}>{MEAL_TYPE_TIME[mealType]}</span>
            <MealStatus phase={phase} className="ml-1" />
          </div>
          <p className={`mt-1 text-[13px] text-muted-foreground ${dim}`}>
            {sortedItems.length
              ? `${sortedItems
                  .slice(0, 3)
                  .map((mi) => (mi.menu_items ? splitMenuName(mi.menu_items.name).main : ''))
                  .join(', ')}${sortedItems.length > 3 ? ` 외 ${sortedItems.length - 3}개` : ''}`
              : '등록된 메뉴가 없습니다'}
          </p>
        </div>
        <ChevronRight size={18} className="shrink-0 text-faint" />
      </button>
    )
  }

  const rows = Math.ceil(sortedItems.length / 2)
  return (
    <section className="pt-4 pb-2 border-b border-border">
      <div className="flex items-center gap-2 mb-1">
        <h2 className={`text-lg font-bold ${dim}`}>{MEAL_TYPE_LABEL[mealType]}</h2>
        <span className={`text-xs text-faint ${dim}`}>{MEAL_TYPE_TIME[mealType]}</span>
        <MealStatus phase={phase} className="ml-auto" />
      </div>

      {sortedItems.length ? (
        <div className="grid grid-cols-2 gap-x-4">
          {sortedItems.map((item, idx) => {
            if (!item.menu_items) return null
            const { main, detail } = splitMenuName(item.menu_items.name)
            const lastRow = Math.floor(idx / 2) === rows - 1
            return (
              <div
                key={item.menu_items.id}
                className={`flex min-w-0 items-center justify-between gap-2 py-2.5 ${lastRow ? '' : 'border-b border-border'}`}
              >
                <div className="min-w-0 text-sm break-keep">
                  <div>{main}</div>
                  {detail && <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{detail}</div>}
                </div>
                <FavoriteButton menuItemId={item.menu_items.id} groupId={item.menu_items.group_id} />
              </div>
            )
          })}
        </div>
      ) : (
        <p className="py-3 text-[13px] text-muted-foreground">등록된 메뉴가 없습니다.</p>
      )}

      {showReviews && meal && <ReviewSection mealId={meal.id} />}
    </section>
  )
}
