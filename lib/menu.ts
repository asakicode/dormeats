// 원본 식단표 사이트의 오타로 항목명 끝에 남는 낙오된 '&' 제거 (예: "모듬쌈&쌈무&")
export function cleanMenuName(name: string): string {
  return name.replace(/&\s*$/, '').trim()
}

export function splitMenuName(fullName: string): { main: string; detail: string | null } {
  const cleaned = cleanMenuName(fullName)
  const match = cleaned.match(/^(.+?)\s*\((.+)\)\s*$/)
  if (match) {
    return { main: match[1].trim(), detail: match[2].trim() }
  }
  return { main: cleaned, detail: null }
}