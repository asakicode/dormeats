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