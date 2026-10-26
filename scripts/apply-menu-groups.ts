import { config } from 'dotenv'
config({ path: '.env.local' })

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { planGroupSync, type GroupFile } from '../lib/menu-group'

// data/menu-groups.json 을 DB에 반영한다. --dry-run 이면 바뀔 내용만 출력
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const dryRun = process.argv.includes('--dry-run')

async function main() {
  const file: GroupFile = JSON.parse(readFileSync('data/menu-groups.json', 'utf8'))

  const { data: items, error: itemsError } = await supabase.from('menu_items').select('id, name, group_id')
  const { data: groups, error: groupsError } = await supabase.from('menu_groups').select('id, name')
  if (itemsError || groupsError || !items || !groups) {
    throw new Error(`조회 실패: ${itemsError?.message ?? groupsError?.message}`)
  }

  const plan = planGroupSync(file, items, groups)

  // 반영 후 멤버가 하나도 없는 묶음 (지울 대상)
  const assignedIds = new Set(plan.assignments.map((a) => a.menuItemId))
  const usedGroupIds = new Set(items.filter((item) => item.group_id && !assignedIds.has(item.id)).map((item) => item.group_id))
  const usedGroupNames = new Set(plan.assignments.map((a) => a.groupName))
  const emptyGroups = groups.filter((g) => !usedGroupIds.has(g.id) && !usedGroupNames.has(g.name))

  console.log(`${dryRun ? '[dry-run] ' : ''}생성 ${plan.groupsToCreate.length}, 배정 ${plan.assignments.length}, 삭제 ${emptyGroups.length}`)
  if (plan.groupsToCreate.length) console.log(`새 묶음: ${plan.groupsToCreate.join(', ')}`)
  if (emptyGroups.length) console.log(`지울 묶음: ${emptyGroups.map((g) => g.name).join(', ')}`)
  if (plan.missingNames.length) console.log(`DB에 없는 이름 ${plan.missingNames.length}개: ${plan.missingNames.join(', ')}`)
  if (plan.duplicateNames.length) console.log(`두 묶음 이상에 있는 이름(배정 안 함): ${plan.duplicateNames.join(', ')}`)

  if (dryRun) return

  const groupIdByName = new Map(groups.map((g) => [g.name, g.id]))
  if (plan.groupsToCreate.length) {
    const { data: created, error } = await supabase
      .from('menu_groups')
      .insert(plan.groupsToCreate.map((name) => ({ name })))
      .select('id, name')
    if (error || !created) throw new Error(`묶음 생성 실패: ${error?.message}`)
    for (const g of created) groupIdByName.set(g.name, g.id)
  }

  // 같은 묶음으로 가는 항목끼리 한 번에 업데이트
  const idsByGroup = new Map<string, string[]>()
  for (const { menuItemId, groupName } of plan.assignments) {
    idsByGroup.set(groupName, [...(idsByGroup.get(groupName) ?? []), menuItemId])
  }
  for (const [groupName, ids] of idsByGroup) {
    const { error } = await supabase.from('menu_items').update({ group_id: groupIdByName.get(groupName) }).in('id', ids)
    if (error) throw new Error(`배정 실패 (${groupName}): ${error.message}`)
  }

  if (emptyGroups.length) {
    const { error } = await supabase.from('menu_groups').delete().in('id', emptyGroups.map((g) => g.id))
    if (error) throw new Error(`묶음 삭제 실패: ${error.message}`)
  }

  console.log('반영 완료')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
