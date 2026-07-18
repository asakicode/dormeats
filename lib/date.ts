export function getMondayOfWeek(date: Date): Date {
  const day = date.getDay() // 0 = 일요일
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)
  return monday
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}