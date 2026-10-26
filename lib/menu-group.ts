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

// 즐겨찾기·다음 등장을 묶는 단위: 묶음이 있으면 묶음, 없으면 메뉴 하나
export function groupKeyOf(item: { id: string; group_id: string | null }): string {
  return item.group_id ?? `item:${item.id}`
}

export type NextOccurrence = { meal_date: string; meal_type: string; rank: number; name: string }

type UpcomingMeal = {
  meal_date: string
  meal_type: string
  meal_items: { menu_item_id: string; menu_items: { name: string; group_id: string | null } | null }[]
}

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner']

// 다가오는 식단을 날짜·끼니 순으로 훑어 묶음 키별 첫 등장(그때의 실제 이름 포함)을 찾는다
export function computeNextByGroup(meals: UpcomingMeal[]): Record<string, NextOccurrence> {
  const sorted = [...meals].sort((a, b) => {
    if (a.meal_date !== b.meal_date) return a.meal_date < b.meal_date ? -1 : 1
    return MEAL_TYPE_ORDER.indexOf(a.meal_type) - MEAL_TYPE_ORDER.indexOf(b.meal_type)
  })

  const next: Record<string, NextOccurrence> = {}
  sorted.forEach((meal, rank) => {
    for (const item of meal.meal_items ?? []) {
      if (!item.menu_items) continue
      const key = groupKeyOf({ id: item.menu_item_id, group_id: item.menu_items.group_id })
      if (!next[key]) {
        next[key] = { meal_date: meal.meal_date, meal_type: meal.meal_type, rank, name: item.menu_items.name }
      }
    }
  })
  return next
}

// 같은 묶음의 즐겨찾기를 한 줄로 모은다 (먼저 나온 즐겨찾기가 대표)
export function groupFavorites<F extends { id: string; menu_items: { id: string; name: string; group_id: string | null } | null }>(
  favs: F[]
): { key: string; primary: F; all: F[] }[] {
  const rows = new Map<string, { key: string; primary: F; all: F[] }>()
  for (const fav of favs) {
    if (!fav.menu_items) continue
    const key = groupKeyOf(fav.menu_items)
    const row = rows.get(key)
    if (row) row.all.push(fav)
    else rows.set(key, { key, primary: fav, all: [fav] })
  }
  return [...rows.values()]
}
