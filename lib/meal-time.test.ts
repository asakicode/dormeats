import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getMealPhases, formatDuration, getSeoulMinutes, getEffectiveDay } from './meal-time'

test('점심 중 12:20', () => {
  const p = getMealPhases(740, 0)
  assert.deepEqual(p.breakfast, { kind: 'ended' })
  assert.deepEqual(p.lunch, { kind: 'now', minutesLeft: 40 })
  assert.deepEqual(p.dinner, { kind: 'later' })
})
test('식사 사이 15:00 → 저녁 upcoming 210분', () => {
  const p = getMealPhases(900, 0)
  assert.deepEqual(p.lunch, { kind: 'ended' })
  assert.deepEqual(p.dinner, { kind: 'upcoming', minutesUntil: 210 })
})
test('경계 13:00 → 점심 ended', () => assert.deepEqual(getMealPhases(780, 0).lunch, { kind: 'ended' }))
test('경계 12:59 → 1분 남음', () => assert.deepEqual(getMealPhases(779, 0).lunch, { kind: 'now', minutesLeft: 1 }))
test('새벽 03:00 → 아침 upcoming, ended 없음', () => {
  const p = getMealPhases(180, 0)
  assert.deepEqual(p.breakfast, { kind: 'upcoming', minutesUntil: 240 })
  assert.ok(Object.values(p).every((x) => x.kind !== 'ended'))
})
test('저녁 이후 20:30에 내일 보기 → 아침 630분 후', () => {
  const p = getMealPhases(1230, 1)
  assert.deepEqual(p.breakfast, { kind: 'upcoming', minutesUntil: 630 })
  assert.deepEqual(p.lunch, { kind: 'later' })
})
test('formatDuration', () => {
  assert.equal(formatDuration(40), '40분')
  assert.equal(formatDuration(60), '1시간')
  assert.equal(formatDuration(210), '3시간 30분')
  assert.equal(formatDuration(630), '10시간 30분')
})
test('getSeoulMinutes: UTC 03:20 = 서울 12:20', () =>
  assert.equal(getSeoulMinutes(new Date('2026-10-26T03:20:00Z')), 740))

// 시각은 UTC로 적는다. KST = UTC+9
test('getEffectiveDay: 점심 12:00 KST → 오늘 그대로', () => {
  assert.deepEqual(getEffectiveDay(new Date('2026-10-26T03:00:00Z')), {
    todayStr: '2026-10-26',
    effectiveDate: '2026-10-26',
  })
})
test('getEffectiveDay: 저녁 끝난 20:30 KST → 내일', () => {
  assert.deepEqual(getEffectiveDay(new Date('2026-10-26T11:30:00Z')), {
    todayStr: '2026-10-26',
    effectiveDate: '2026-10-27',
  })
})
test('getEffectiveDay: 자정 넘은 00:20 KST → 새 날짜가 오늘이자 기준일', () => {
  assert.deepEqual(getEffectiveDay(new Date('2026-10-26T15:20:00Z')), {
    todayStr: '2026-10-27',
    effectiveDate: '2026-10-27',
  })
})
test('getEffectiveDay: 월말 21:00 KST → 다음 달 1일', () => {
  assert.deepEqual(getEffectiveDay(new Date('2026-10-31T12:00:00Z')), {
    todayStr: '2026-10-31',
    effectiveDate: '2026-11-01',
  })
})
