export function getMondayOfWeek(date: Date): Date {
  const day = date.getDay() // 0 = 일요일
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)
  return monday
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getKoreaToday(): Date {
  const now = new Date()
  const koreaDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  // koreaDateStr은 'YYYY-MM-DD' 형식
  return new Date(koreaDateStr + 'T00:00:00')
}

export function getCurrentMealType(): 'breakfast' | 'lunch' | 'dinner' {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  const minutesNow = hour * 60 + minute

  const breakfastEnd = 8 * 60 + 30 // 08:30
  const lunchEnd = 13 * 60 // 13:00

  if (minutesNow < breakfastEnd) return 'breakfast'
  if (minutesNow < lunchEnd) return 'lunch'
  return 'dinner'
}

export function formatRelativeTime(dateString: string): string {
  const postDate = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - postDate.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return '방금'
  if (diffMinutes < 60) return `${diffMinutes}분 전`

  const dateFmt = { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' } as const
  const postDateStr = new Intl.DateTimeFormat('en-CA', dateFmt).format(postDate)
  const nowDateStr = new Intl.DateTimeFormat('en-CA', dateFmt).format(now)

  if (postDateStr === nowDateStr) {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(postDate)
  }

  const [, month, day] = postDateStr.split('-')
  return `${month}/${day}`
}