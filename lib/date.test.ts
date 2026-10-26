import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getWeekDates, getRelativeDayLabel, formatKoreanDate } from './date'

test('getWeekDates 월요일/일요일', () => {
  assert.deepEqual(getWeekDates('2026-10-26'), ['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01'])
  assert.equal(getWeekDates('2026-11-01')[0], '2026-10-26')
  assert.equal(getWeekDates('2026-11-02')[0], '2026-11-02')
})
test('getRelativeDayLabel', () => {
  assert.equal(getRelativeDayLabel('2026-10-26', '2026-10-26'), '오늘')
  assert.equal(getRelativeDayLabel('2026-10-27', '2026-10-26'), '내일')
  assert.equal(getRelativeDayLabel('2026-10-28', '2026-10-26'), '모레')
  assert.equal(getRelativeDayLabel('2026-10-25', '2026-10-26'), '어제')
  assert.equal(getRelativeDayLabel('2026-10-30', '2026-10-26'), '')
  assert.equal(getRelativeDayLabel('2026-11-01', '2026-10-31'), '내일')
})
test('formatKoreanDate', () => assert.equal(formatKoreanDate('2026-10-26'), '10월 26일 월요일'))
