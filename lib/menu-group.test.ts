import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findExactMenuItem, menuKey, findGroupIdByKey, planGroupSync, findAutoGroupedNotInFile } from './menu-group'

test('findExactMenuItem: 공백만 무시하고 정확히 같은 이름만', () => {
  const items = [{ id: '1', name: '바나나우유' }, { id: '2', name: '미역 냉국' }]
  assert.equal(findExactMenuItem('바나나', items), null)
  assert.equal(findExactMenuItem('미역냉국', items)?.id, '2')
})

test('menuKey: 오타·곁들임·괄호 차이는 같은 키', () => {
  assert.equal(menuKey('씨러얼&우유'), menuKey('씨리얼&우유'))
  assert.equal(menuKey('순대국&양념다대기'), menuKey('순대국&다대기'))
  assert.equal(menuKey('부대찌개*라면사리'), menuKey('부대찌개&라면사리'))
  assert.equal(menuKey('팩우유(딸기또는초코)'), menuKey('팩우유(딸기,초코,흰)'))
  assert.equal(menuKey('돈메알조림'), menuKey('돈메추리알조림'))
  assert.equal(menuKey('모듬쌈&쌈무&'), '모듬쌈')
})

test('menuKey: 재료가 다르면 다른 키', () => {
  assert.notEqual(menuKey('삼치카레구이'), menuKey('갈치카레구이'))
  assert.notEqual(menuKey('미역냉국'), menuKey('미역오이냉국'))
})

test('menuKey: 곁들임만 있는 이름은 빈 키가 되지 않음', () => {
  assert.equal(menuKey('&마요소스'), '&마요소스')
})

test('findGroupIdByKey: 묶음 있는 항목만 대상', () => {
  const items = [
    { name: '씨리얼&우유', group_id: 'g1' },
    { name: '순대국', group_id: null },
  ]
  assert.equal(findGroupIdByKey('씨러얼&우유', items), 'g1')
  assert.equal(findGroupIdByKey('순대국&다대기', items), null)
  assert.equal(findGroupIdByKey('갈치구이', items), null)
})

test('planGroupSync: 새 묶음 생성, 배정, 없는 이름, 파일 밖 항목 유지', () => {
  const file = { 미역냉국: ['미역냉국', '미역오이냉국', '오이미역냉국'], 삼치: ['삼치구이'] }
  const items = [
    { id: 'a', name: '미역냉국', group_id: null },
    { id: 'b', name: '미역오이냉국', group_id: null },
    { id: 'c', name: '삼치구이', group_id: 'gS' },
    { id: 'd', name: '씨리얼&우유', group_id: 'gX' },
  ]
  const groups = [{ id: 'gS', name: '삼치' }, { id: 'gX', name: '씨리얼' }]
  const plan = planGroupSync(file, items, groups)
  assert.deepEqual(plan.groupsToCreate, ['미역냉국'])
  assert.deepEqual(plan.assignments, [
    { menuItemId: 'a', groupName: '미역냉국' },
    { menuItemId: 'b', groupName: '미역냉국' },
  ])
  assert.deepEqual(plan.missingNames, ['오이미역냉국'])
  assert.deepEqual(plan.duplicateNames, [])
})

test('planGroupSync: 두 묶음에 있는 이름은 배정하지 않음', () => {
  const plan = planGroupSync({ A: ['x'], B: ['x'] }, [{ id: '1', name: 'x', group_id: null }], [])
  assert.deepEqual(plan.duplicateNames, ['x'])
  assert.deepEqual(plan.assignments, [])
})

test('findAutoGroupedNotInFile', () => {
  const r = findAutoGroupedNotInFile({ 씨리얼: ['씨리얼&우유'] },
    [{ id: '1', name: '씨러얼&우유', group_id: 'g' }, { id: '2', name: '씨리얼&우유', group_id: 'g' }],
    [{ id: 'g', name: '씨리얼' }])
  assert.deepEqual(r, [{ name: '씨러얼&우유', groupName: '씨리얼' }])
})
