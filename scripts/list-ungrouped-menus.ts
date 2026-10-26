import { config } from 'dotenv'
config({ path: '.env.local' })

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { findAutoGroupedNotInFile, type GroupFile } from '../lib/menu-group'

// 묶음이 없는 메뉴를 자주 나온 순으로 보여준다 ("새 메뉴 묶어줘" 할 때 사용)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const PAGE_SIZE = 1000

// supabase 기본 조회 한도(1000행)를 넘는 meal_items를 나눠서 모두 가져온다
async function fetchAllMealItemIds(): Promise<string[]> {
  const ids: string[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('meal_items')
      .select('menu_item_id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`meal_items 조회 실패: ${error.message}`)
    ids.push(...data.map((row) => row.menu_item_id))
    if (data.length < PAGE_SIZE) return ids
  }
}

async function main() {
  const file: GroupFile = JSON.parse(readFileSync('data/menu-groups.json', 'utf8'))

  const { data: items, error: itemsError } = await supabase.from('menu_items').select('id, name, group_id')
  const { data: groups, error: groupsError } = await supabase.from('menu_groups').select('id, name')
  if (itemsError || groupsError || !items || !groups) {
    throw new Error(`조회 실패: ${itemsError?.message ?? groupsError?.message}`)
  }

  const counts = new Map<string, number>()
  for (const id of await fetchAllMealItemIds()) counts.set(id, (counts.get(id) ?? 0) + 1)

  const ungrouped = items
    .filter((item) => !item.group_id)
    .map((item) => ({ name: item.name, count: counts.get(item.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)

  console.log(`묶이지 않은 메뉴 ${ungrouped.length}개`)
  for (const { name, count } of ungrouped) console.log(`${count}\t${name}`)

  const autoGrouped = findAutoGroupedNotInFile(file, items, groups)
  console.log(`\n자동으로 묶였지만 묶음 파일에 없는 이름 ${autoGrouped.length}개`)
  for (const { name, groupName } of autoGrouped) console.log(`${groupName}\t${name}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
