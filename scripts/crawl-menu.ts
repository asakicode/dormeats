import { config } from 'dotenv'
config({ path: '.env.local' })

import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const MEAL_TYPE_MAP: Record<string, string> = {
  아침: 'breakfast',
  점심: 'lunch',
  저녁: 'dinner',
}

// 메뉴명 정규화: 공백 제거, 특수문자 정리
function normalize(name: string): string {
  return name.replace(/\s+/g, '').trim()
}

// 기존 menu_items 중에서 같은 메뉴로 볼 수 있는 게 있는지 규칙 기반으로 찾기
// 나중에 여기에 "규칙으로 애매하면 LLM에게 판단 맡기기" 단계를 추가할 수 있음
function findMatchingMenuItem(
  newName: string,
  existingItems: { id: string; name: string }[]
): { id: string; name: string } | null {
  const normalizedNew = normalize(newName)

  const exactMatch = existingItems.find(
    (item) => normalize(item.name) === normalizedNew
  )
  if (exactMatch) return exactMatch

  if (normalizedNew.length >= 2) {
    const partialMatch = existingItems.find((item) => {
      const normalizedExisting = normalize(item.name)
      return (
        normalizedExisting.length >= 2 &&
        (normalizedNew.includes(normalizedExisting) ||
          normalizedExisting.includes(normalizedNew))
      )
    })
    if (partialMatch) return partialMatch
  }

  return null
}

function getMondayOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)
  return monday
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

async function crawlWeek(monday: Date) {
  // 기존 menu_items 전체를 미리 불러와서 메모리에 캐싱 (매칭용)
  const { data: existingMenuItems } = await supabase
    .from('menu_items')
    .select('id, name')

  let menuItemCache = existingMenuItems ?? []

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
      const items = cellHtml
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

        let menuItem = findMatchingMenuItem(itemName, menuItemCache)

        if (!menuItem) {
          const { data: newMenuItem, error: menuError } = await supabase
            .from('menu_items')
            .insert({ name: itemName })
            .select()
            .single()

          if (menuError || !newMenuItem) {
            console.error(`menu_items 저장 실패 (${itemName}):`, menuError?.message)
            continue
          }

          menuItem = newMenuItem
          menuItemCache = [...menuItemCache, newMenuItem]
          console.log(`  신규 메뉴 등록: ${itemName}`)
        } else if (normalize(menuItem.name) !== normalize(itemName)) {
          console.log(`  기존 메뉴로 매칭: "${itemName}" → "${menuItem.name}"`)
        }

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

const today = new Date()
const monday = getMondayOfWeek(today)
crawlWeek(monday)