import { cleanMenuName } from './menu'

// 메뉴명 비교용: 공백만 제거
export function normalizeMenuName(name: string): string {
  return name.replace(/\s+/g, '')
}

// 원본 식단표에 반복해서 나오는 오타·줄임말 [틀린 표기, 바른 표기]
export const TYPO_FIXES: [string, string][] = [
  ['씨러얼', '씨리얼'],
  ['캐마일', '캐모마일'],
  ['카모마일', '캐모마일'],
  ['메알', '메추리알'],
]

// 같은 음식인지 규칙으로 비교하기 위한 키: 오타 교정, 괄호 상세와 '&'·'*' 뒤 곁들임 제거
export function menuKey(name: string): string {
  const base = normalizeMenuName(cleanMenuName(name))
  let key = base
  for (const [wrong, right] of TYPO_FIXES) key = key.split(wrong).join(right)
  key = key.replace(/\(.*$/, '').replace(/[&*].*$/, '')
  return key || base
}

// 이미 묶음에 들어 있는 항목 중 키가 같은 것의 묶음
export function findGroupIdByKey(name: string, items: { name: string; group_id: string | null }[]): string | null {
  const key = menuKey(name)
  if (!key) return null
  return items.find((item) => item.group_id && menuKey(item.name) === key)?.group_id ?? null
}

// 공백만 무시하고 이름이 정확히 같은 항목만 찾는다 (부분 문자열 매칭은 다른 음식을 섞어서 쓰지 않음)
export function findExactMenuItem<T extends { name: string }>(name: string, items: T[]): T | null {
  const normalized = normalizeMenuName(name)
  return items.find((item) => normalizeMenuName(item.name) === normalized) ?? null
}

// data/menu-groups.json 형식: { 묶음 이름: [메뉴 이름, ...] }
export type GroupFile = Record<string, string[]>

type GroupedItem = { id: string; name: string; group_id: string | null }
type Group = { id: string; name: string }

// 묶음 파일과 DB를 비교해 새로 만들 묶음과 바꿀 배정을 계산한다 (파일에 없는 항목은 건드리지 않음)
export function planGroupSync(file: GroupFile, items: GroupedItem[], groups: Group[]) {
  const groupNameById = new Map(groups.map((g) => [g.id, g.name]))
  const existingGroupNames = new Set(groups.map((g) => g.name))

  const groupsByName = new Map<string, string[]>()
  for (const [groupName, names] of Object.entries(file)) {
    for (const name of names) {
      const key = normalizeMenuName(name)
      const list = groupsByName.get(key) ?? []
      if (!list.includes(groupName)) list.push(groupName)
      groupsByName.set(key, list)
    }
  }

  const duplicateNames = Object.values(file)
    .flat()
    .filter((name, i, all) => (groupsByName.get(normalizeMenuName(name)) ?? []).length > 1
      && all.findIndex((n) => normalizeMenuName(n) === normalizeMenuName(name)) === i)

  const itemNames = new Set(items.map((item) => normalizeMenuName(item.name)))
  const missingNames = Object.values(file).flat().filter((name) => !itemNames.has(normalizeMenuName(name)))

  const assignments: { menuItemId: string; groupName: string }[] = []
  for (const item of items) {
    const targets = groupsByName.get(normalizeMenuName(item.name))
    if (!targets || targets.length !== 1) continue
    const groupName = targets[0]
    if (item.group_id && groupNameById.get(item.group_id) === groupName) continue
    assignments.push({ menuItemId: item.id, groupName })
  }

  const groupsToCreate = [...new Set(assignments.map((a) => a.groupName))].filter((name) => !existingGroupNames.has(name))

  return { groupsToCreate, assignments, missingNames, duplicateNames }
}

// 크롤러가 자동으로 묶었지만 묶음 파일에는 아직 없는 이름 (파일에 옮겨 적을 대상)
export function findAutoGroupedNotInFile(file: GroupFile, items: GroupedItem[], groups: Group[]) {
  const groupNameById = new Map(groups.map((g) => [g.id, g.name]))
  const fileNames = new Set(Object.values(file).flat().map(normalizeMenuName))
  return items
    .filter((item) => item.group_id && !fileNames.has(normalizeMenuName(item.name)))
    .map((item) => ({ name: item.name, groupName: groupNameById.get(item.group_id!) ?? '' }))
}
