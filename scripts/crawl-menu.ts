import { config } from 'dotenv'
config({ path: '.env.local' })

import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'
import { getKoreaToday, getMondayOfWeek, formatDate, getWeekMondaysFrom } from '../lib/date'
import { appendFileSync } from 'node:fs'
import { findExactMenuItem, findGroupIdByKey } from '../lib/menu-group'
import { fetchAllRows } from '../lib/fetch-all'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const MEAL_TYPE_MAP: Record<string, string> = {
  아침: 'breakfast',
  점심: 'lunch',
  저녁: 'dinner',
}

// '&'로 시작하는 줄은 앞 메뉴의 연속(콤보 구성)이므로 앞 항목에 붙이기
// 예: "청파래새우튀김" + "&마요소스" → "청파래새우튀김&마요소스"
function mergeAmpersandContinuations(items: string[]): string[] {
  const merged: string[] = []
  for (const item of items) {
    if (item.startsWith('&') && merged.length > 0) {
      merged[merged.length - 1] = merged[merged.length - 1] + item
    } else {
      merged.push(item)
    }
  }
  return merged
}

// 괄호가 여러 줄에 걸쳐 열려있으면 닫힐 때까지 계속 이어붙이기
// 예: "셀프햄버거" + "(햄버거빵," + "양념함박패티" + "오이피클,소스,양상추)"
//     → "셀프햄버거(햄버거빵, 양념함박패티 오이피클,소스,양상추)"
function mergeParenthesesItems(items: string[]): string[] {
  const merged: string[] = []
  let openParenBuffer: string | null = null

  for (const item of items) {
    if (openParenBuffer !== null) {
      openParenBuffer += ' ' + item
      if (item.includes(')')) {
        merged.push(openParenBuffer)
        openParenBuffer = null
      }
      continue
    }

    const openCount = (item.match(/\(/g) || []).length
    const closeCount = (item.match(/\)/g) || []).length

    if (openCount > closeCount) {
      if (/^\(/.test(item) && merged.length > 0) {
        openParenBuffer = merged.pop()! + item
      } else {
        openParenBuffer = item
      }
    } else if (/^\(.+\)$/.test(item) && merged.length > 0) {
      merged[merged.length - 1] = merged[merged.length - 1] + item
    } else {
      merged.push(item)
    }
  }

  if (openParenBuffer !== null) {
    merged.push(openParenBuffer)
  }

  return merged
}

// 이번 실행에서 새로 등록된 메뉴 이름 (Actions 요약용)
const newMenuNames: string[] = []

async function crawlWeek(monday: Date) {
  let menuItemCache = await fetchAllRows<{ id: string; name: string; group_id: string | null }>((from, to) =>
    supabase.from('menu_items').select('id, name, group_id').order('id').range(from, to)
  )

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const startStr = formatDate(monday)
  const endStr = formatDate(sunday)

  const url = `https://injae.gwd.go.kr/others/food/menu/week/dobong/${startStr}/${endStr}`
  console.log(`요청: ${url}`)

  const res = await fetch(url)
  const html = await res.text()
  const $ = cheerio.load(html)

  const dateHeaderRow = $('table tbody tr').first()
  const dates: string[] = []
  dateHeaderRow.find('th').each((i, el) => {
    if (i === 0) return
    const text = $(el).text().trim()
    if (text) dates.push(text)
  })

  if (dates.length === 0) {
    console.error('날짜를 찾지 못했습니다. 사이트 구조가 바뀌었을 수 있습니다.')
    return
  }

  const mealRows = $('table tbody tr').slice(1)
  let totalInserted = 0

  for (const row of mealRows.toArray()) {
    const $row = $(row)
    const mealTypeKr = $row.find('td').first().text().trim()
    const mealType = MEAL_TYPE_MAP[mealTypeKr]
    if (!mealType) continue

    const cells = $row.find('td').slice(1)

    for (let i = 0; i < cells.length; i++) {
      const cell = cells.eq(i)
      const dateStr = dates[i]
      if (!dateStr) continue

      const cellHtml = cell.html() || ''
      const rawItems = cellHtml
        .split('<br>')
        .map((s) =>
          s
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim()
        )
        .filter((s) => s.length > 0)

      const items = mergeParenthesesItems(mergeAmpersandContinuations(rawItems))

      if (items.length === 0) continue

      const { data: mealRow, error: mealError } = await supabase
        .from('meals')
        .upsert(
          {
            meal_date: dateStr,
            meal_type: mealType,
            dorm: '도봉학사',
            source: 'crawled',
          },
          { onConflict: 'meal_date,meal_type,dorm' }
        )
        .select()
        .single()

      if (mealError || !mealRow) {
        console.error(`meals 저장 실패 (${dateStr} ${mealType}):`, mealError?.message)
        continue
      }

      await supabase.from('meal_items').delete().eq('meal_id', mealRow.id)

      for (let order = 0; order < items.length; order++) {
        const itemName = items[order]

        let menuItem = findExactMenuItem(itemName, menuItemCache)

        if (!menuItem) {
          const groupId = findGroupIdByKey(itemName, menuItemCache)
          const { data: newMenuItem, error: menuError } = await supabase
            .from('menu_items')
            .insert({ name: itemName, group_id: groupId })
            .select()
            .single()

          if (menuError || !newMenuItem) {
            console.error(`menu_items 저장 실패 (${itemName}):`, menuError?.message)
            continue
          }

          menuItem = newMenuItem
          menuItemCache = [...menuItemCache, newMenuItem]
          newMenuNames.push(itemName)
          console.log(groupId ? `  신규 메뉴 자동 묶음: ${itemName}` : `  신규 메뉴 등록: ${itemName}`)
        }

        if (!menuItem) continue

        const { error: linkError } = await supabase.from('meal_items').insert({
          meal_id: mealRow.id,
          menu_item_id: menuItem.id,
          display_order: order,
        })

        if (linkError) {
          console.error('meal_items 저장 실패:', linkError.message)
        } else {
          totalInserted++
        }
      }

      console.log(`${dateStr} ${mealTypeKr}: ${items.length}개 항목 저장 완료`)
    }
  }

  console.log(`\n완료! 총 ${totalInserted}개 메뉴 항목이 저장됐습니다.`)
}

// 묶이지 않은 메뉴 개수를 출력하고, GitHub Actions에서는 실행 결과 화면(job summary)에도 남긴다
async function reportUngrouped() {
  const { count, error } = await supabase
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .is('group_id', null)

  if (error) {
    console.error('묶이지 않은 메뉴 개수 조회 실패:', error.message)
    return
  }

  console.log(`묶이지 않은 메뉴 ${count}개, 이번 실행 새 이름 ${newMenuNames.length}개`)

  const summaryPath = process.env.GITHUB_STEP_SUMMARY
  if (!summaryPath) return

  const lines = [
    `### 묶이지 않은 메뉴 ${count}개`,
    '',
    newMenuNames.length ? `이번 실행에서 새로 생긴 이름: ${newMenuNames.join(', ')}` : '이번 실행에서 새로 생긴 이름 없음',
    '',
    'Claude Code에서 "새 메뉴 묶어줘"라고 하면 묶음표에 추가합니다.',
    '',
  ]
  appendFileSync(summaryPath, lines.join('\n'))
}

// --from YYYY-MM-DD: 그 날짜가 속한 주부터 이번 주까지 다시 크롤링 (없으면 이번 주만)
async function main() {
  const today = getKoreaToday()
  const fromIdx = process.argv.indexOf('--from')
  const from = fromIdx >= 0 ? process.argv[fromIdx + 1] : null

  if (!from) {
    await crawlWeek(getMondayOfWeek(today))
  } else {
    for (const mondayStr of getWeekMondaysFrom(from, formatDate(today))) {
      await crawlWeek(new Date(`${mondayStr}T00:00:00`))
    }
  }

  await reportUngrouped()
}

main()