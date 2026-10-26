import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getMealPhases, formatDuration, getSeoulMinutes } from './meal-time'

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
