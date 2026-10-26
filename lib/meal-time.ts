export type MealType = 'breakfast' | 'lunch' | 'dinner'

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner']

// 자정부터의 분. lib/date.ts의 식사 시각과 같아야 한다.
export const MEAL_SCHEDULE: Record<MealType, { start: number; end: number }> = {
  breakfast: { start: 7 * 60, end: 8 * 60 + 30 },
  lunch: { start: 12 * 60, end: 13 * 60 },
  dinner: { start: 18 * 60 + 30, end: 20 * 60 },
}

export type MealPhase =
  | { kind: 'now'; minutesLeft: number }
  | { kind: 'upcoming'; minutesUntil: number }
  | { kind: 'ended' }
  | { kind: 'later' }

export function getSeoulMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

// dayOffset: 보고 있는 날이 실제 오늘이면 0, 내일이면 1
export function getMealPhases(nowMinutes: number, dayOffset: 0 | 1): Record<MealType, MealPhase> {
  const shift = dayOffset * 1440
  const phases = {} as Record<MealType, MealPhase>
  let upcomingAssigned = false
  for (const type of MEAL_ORDER) {
    const start = MEAL_SCHEDULE[type].start + shift
    const end = MEAL_SCHEDULE[type].end + shift
    if (nowMinutes >= start && nowMinutes < end) {
      phases[type] = { kind: 'now', minutesLeft: end - nowMinutes }
    } else if (nowMinutes >= end) {
      phases[type] = { kind: 'ended' }
    } else {
      phases[type] = { kind: 'later' }
    }
  }
  const hasNow = MEAL_ORDER.some((t) => phases[t].kind === 'now')
  if (!hasNow) {
    for (const type of MEAL_ORDER) {
      if (!upcomingAssigned && phases[type].kind === 'later') {
        phases[type] = { kind: 'upcoming', minutesUntil: MEAL_SCHEDULE[type].start + shift - nowMinutes }
        upcomingAssigned = true
      }
    }
  }
  return phases
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}
