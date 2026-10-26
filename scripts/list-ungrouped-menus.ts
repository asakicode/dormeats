import { config } from 'dotenv'
config({ path: '.env.local' })

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { findAutoGroupedNotInFile, type GroupFile } from '../lib/menu-group'
import { fetchAllRows } from '../lib/fetch-all'

// 묶음이 없는 메뉴를 자주 나온 순으로 보여준다 ("새 메뉴 묶어줘" 할 때 사용)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function main() {
  const file: GroupFile = JSON.parse(readFileSync('data/menu-groups.json', 'utf8'))

  const items = await fetchAllRows<{ id: string; name: string; group_id: string | null }>((from, to) =>
    supabase.from('menu_items').select('id, name, group_id').order('id').range(from, to)
  )
  const groups = await fetchAllRows<{ id: string; name: string }>((from, to) =>
    supabase.from('menu_groups').select('id, name').order('id').range(from, to)
  )
  const mealItems = await fetchAllRows<{ menu_item_id: string }>((from, to) =>
    supabase.from('meal_items').select('menu_item_id').order('id').range(from, to)
  )

  const counts = new Map<string, number>()
  for (const { menu_item_id } of mealItems) counts.set(menu_item_id, (counts.get(menu_item_id) ?? 0) + 1)

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
