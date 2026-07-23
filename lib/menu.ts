export function splitMenuName(fullName: string): { main: string; detail: string | null } {
  const match = fullName.match(/^(.+?)\s*\((.+)\)\s*$/)
  if (match) {
    return { main: match[1].trim(), detail: match[2].trim() }
  }
  return { main: fullName, detail: null }
}