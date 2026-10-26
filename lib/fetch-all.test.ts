import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchAllRows } from './fetch-all'

test('fetchAllRows: 1000행 한도를 넘어도 끝까지 가져온다', async () => {
  const all = Array.from({ length: 2500 }, (_, i) => i)
  const rows = await fetchAllRows(async (from, to) => ({ data: all.slice(from, to + 1), error: null }))
  assert.equal(rows.length, 2500)
  assert.equal(rows[2499], 2499)
})

test('fetchAllRows: 조회 실패는 에러로 던진다', async () => {
  await assert.rejects(
    fetchAllRows(async () => ({ data: null, error: { message: 'boom' } })),
    /boom/
  )
})
