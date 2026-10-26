# 메뉴 묶음 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이름이 조금씩 다른 같은 음식을 "묶음"으로 관리해, 즐겨찾기 다음 등장과 홈 하트가 묶음 단위로 동작하게 한다. 그 전에 크롤러의 부분 문자열 매칭 버그를 고친다.

**Architecture:** `menu_groups` 테이블과 `menu_items.group_id`를 추가한다. 묶음의 원본은 저장소의 `data/menu-groups.json`이고, 스크립트가 DB에 반영한다. 순수 로직(이름 키, 묶음 키, 다음 등장 계산, 동기화 계획)은 `lib/menu-group.ts`에 두고 `tsx --test`로 검증한다. 화면은 묶음 키(`group_id` 또는 `item:<id>`) 기준으로 동작한다.

**Tech Stack:** Next.js 16 App Router(AGENTS.md: 코드 작성 전 `node_modules/next/dist/docs/` 확인), React 19, supabase-js, tsx, node:test, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-26-menu-groups-design.md`

## Global Constraints

- 사용자 규칙: **코드를 바꾸기 전에 반드시 사용자에게 확인받는다.** 이 계획 실행 자체가 승인이지만, 계획에 없는 코드 변경은 물어본다.
- **git commit / push / 브랜치 생성은 사용자가 직접 한다.** 커밋 단계에서는 붙여넣을 명령만 코드 블록으로 준다. 작업 브랜치: `menu-groups`(사용자가 `git checkout -b menu-groups`로 생성).
- **운영 DB에 쓰는 실행(재크롤링, `apply-menu-groups`)은 실행 직전에 사용자 확인을 받는다.** 스키마 SQL은 사용자가 Supabase SQL 편집기에서 실행한다.
- `.env.local`을 읽거나 비밀값을 출력하지 않는다. 스크립트는 기존처럼 `config({ path: '.env.local' })`로만 로드한다. 즐겨찾기 관련 출력은 개수만, 사용자 식별 정보는 출력하지 않는다.
- 글자 유사도 기반 자동 묶기, 유료 AI API, 로컬 LLM 금지.
- 기숙사는 `도봉학사`만.
- Task 3의 크롤러 변경(`group_id` 쓰기)은 Task 2 스키마가 운영 DB에 적용된 뒤에만 main에 머지한다(매일 05:30 KST cron이 main의 크롤러를 실행함).
- 응답과 코드 주석은 한국어, 주변 코드 스타일(세미콜론 없음, 작은따옴표)을 따른다.

## Review Focus

1. 같은 묶음 메뉴가 같은 화면에 두 개 보일 때 한쪽 하트를 끄면 다른 쪽은 새로고침 전까지 채워진 채로 남는다 — 스펙상 허용, 하지만 끈 쪽은 반드시 비워져야 한다.
2. `group_id`가 null인 메뉴(혼자인 메뉴)가 지금과 똑같이 동작해야 한다(자기 id로만 매칭, 하트 켜기/끄기).
3. 실행취소 시 묶음에서 지워진 행이 여러 개여도 전부 복구되고, 유니크 인덱스 때문에 실패하는 행이 있어도 나머지는 복구된다.
4. 재크롤링 `--from` 루프가 과거 주 페이지가 비어 있을 때(날짜 없음) 멈추지 않고 다음 주로 넘어간다.
5. `menuKey`가 곁들임 제거 후 빈 문자열이 되는 이름(예: `&마요소스`만 있는 이름)을 다른 이름과 묶지 않는다.

---

### Task 1: 크롤러 정확 매칭 + `--from` 재크롤링

**Files:**
- Create: `lib/menu-group.ts`, `lib/menu-group.test.ts`
- Modify: `lib/date.ts`, `lib/date.test.ts`, `scripts/crawl-menu.ts`

**Interfaces:**
- Produces: `normalizeMenuName(name: string): string`(공백 제거), `findExactMenuItem<T extends { name: string }>(name: string, items: T[]): T | null`(lib/menu-group.ts); `getWeekMondaysFrom(fromStr: string, todayStr: string): string[]`(lib/date.ts, `YYYY-MM-DD` 월요일 목록, fromStr이 속한 주부터 todayStr이 속한 주까지 포함).

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// lib/menu-group.test.ts
test('findExactMenuItem: 공백만 무시하고 정확히 같은 이름만', () => {
  const items = [{ id: '1', name: '바나나우유' }, { id: '2', name: '미역 냉국' }]
  assert.equal(findExactMenuItem('바나나', items), null)
  assert.equal(findExactMenuItem('미역냉국', items)?.id, '2')
})
// lib/date.test.ts
test('getWeekMondaysFrom', () => {
  assert.deepEqual(getWeekMondaysFrom('2026-10-14', '2026-10-26'), ['2026-10-12', '2026-10-19', '2026-10-26'])
  assert.deepEqual(getWeekMondaysFrom('2026-10-26', '2026-11-01'), ['2026-10-26'])
})
```

- [ ] **Step 2: `npm test` → 두 테스트 FAIL(함수 없음) 확인**

- [ ] **Step 3: 구현**
  - `lib/menu-group.ts`에 두 함수 작성.
  - `lib/date.ts`에 `getWeekMondaysFrom` 작성(`getMondayOfWeek`, `formatDate` 재사용).
  - `scripts/crawl-menu.ts`: `findMatchingMenuItem`와 `normalize`를 삭제하고 `findExactMenuItem` 사용. "메뉴명 보강"(이름 update) 분기와 "기존 메뉴로 매칭" 로그 삭제. 하단 실행부: `process.argv`에서 `--from YYYY-MM-DD`를 읽어 있으면 `getWeekMondaysFrom(from, 오늘)`의 각 주를 순서대로 `await crawlWeek(...)`, 없으면 지금처럼 이번 주만. `crawlWeek`가 날짜를 못 찾으면 return하므로 루프는 계속된다.

- [ ] **Step 4: `npm test` → 전부 PASS, `npx tsc --noEmit -p .` 오류 없음 확인**

- [ ] **Step 5: 커밋 (사용자 실행)**

```bash
git add lib/menu-group.ts lib/menu-group.test.ts lib/date.ts lib/date.test.ts scripts/crawl-menu.ts
git commit -m "fix: 크롤러 부분 문자열 매칭 제거, --from 재크롤링 추가"
```

- [ ] **Step 6: 재크롤링 (사용자 확인 후 실행)**
  - 사용자에게 "운영 DB에 2026-07-13 주부터 이번 주까지 다시 씁니다" 확인 받기.
  - Run: `npx tsx scripts/crawl-menu.ts --from 2026-07-13 > <scratchpad>/recrawl.log 2>&1`, 로그 끝과 "날짜를 찾지 못했습니다" 줄 수 확인.
  - 확인 스크립트(스크래치패드, 커밋 안 함): 2026-10-19 주 사이트 원본 이름과 DB 이름이 일치하는지(바나나, 사과, 김치전이 DB에 그대로 있는지), 그리고 **어떤 `meal_items`에도 연결되지 않은 `menu_items`를 참조하는 favorites 개수**를 출력. 스펙의 "덮어쓰인 행을 참조하는 즐겨찾기 개수"는 덮어쓰기 이력이 DB에 없으므로 이 개수로 대신한다(Ruling 후보로 ledger에 기록).
  - Expected: 원본과 DB 이름 일치, 개수를 사용자에게 보고.

### Task 2: 스키마 SQL

**Files:**
- Create: `supabase/menu_groups.sql`
- Modify: `supabase/rls_policies.sql`(menu_items 블록 아래에 menu_groups 정책 추가, 같은 내용)

**Interfaces:**
- Produces: 테이블 `menu_groups(id uuid pk default gen_random_uuid(), name text unique not null, created_at timestamptz default now())`, 컬럼 `menu_items.group_id uuid null references menu_groups(id) on delete set null`, 인덱스 `menu_items(group_id)`, 유니크 인덱스 `favorites_user_menu_item_key on favorites(user_id, menu_item_id)`.

- [ ] **Step 1: `supabase/menu_groups.sql` 작성**
  - 맨 위 주석에 실행 전 중복 확인 쿼리: `select user_id, menu_item_id, count(*) from favorites group by 1, 2 having count(*) > 1;` (결과가 있으면 중복 행을 지운 뒤 진행).
  - `create table if not exists`, `alter table ... add column if not exists`, `create unique index if not exists`로 여러 번 실행해도 안전하게.
  - RLS: `menu_items`와 동일(enable, revoke all from anon/authenticated, grant select, `menu_groups_select_all` 정책).

- [ ] **Step 2: 사용자에게 SQL 편집기에서 실행 요청** (중복 확인 쿼리 → 본문 순서)

- [ ] **Step 3: 확인** — anon 키로 `menu_groups` select와 `menu_items` select `id, group_id`가 오류 없이 되는지 스크래치패드 스크립트로 확인. Expected: 둘 다 오류 없음, menu_groups 0행.

- [ ] **Step 4: 커밋 (사용자 실행)**

```bash
git add supabase/menu_groups.sql supabase/rls_policies.sql
git commit -m "feat: menu_groups 테이블, menu_items.group_id, favorites 유니크 인덱스"
```

### Task 3: 이름 키 규칙 + 크롤러 자동 묶기 + Actions 요약

**Files:**
- Modify: `lib/menu-group.ts`, `lib/menu-group.test.ts`, `scripts/crawl-menu.ts`

**Interfaces:**
- Consumes: `normalizeMenuName`, `findExactMenuItem`(Task 1), `menu_items.group_id`(Task 2).
- Produces: `TYPO_FIXES: [string, string][]`, `menuKey(name: string): string`, `findGroupIdByKey(name: string, items: { name: string; group_id: string | null }[]): string | null`.

`menuKey` 순서: `cleanMenuName`(lib/menu.ts) → 공백 제거 → `TYPO_FIXES` 치환(`씨러얼→씨리얼`, `캐마일→캐모마일`, `카모마일→캐모마일`, `메알→메추리알`; 재크롤링 후 이름을 보고 추가 가능) → 괄호 상세 제거 → 첫 `&` 또는 `*`부터 끝까지 제거. 결과가 빈 문자열이면 원래 공백 제거 이름을 반환.
`findGroupIdByKey`: `group_id`가 있는 항목 중 `menuKey`가 같은 첫 항목의 `group_id`, 없거나 키가 빈 문자열이면 null.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
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
```

- [ ] **Step 2: `npm test` → FAIL 확인**

- [ ] **Step 3: 구현**
  - `lib/menu-group.ts`에 위 함수 작성.
  - `scripts/crawl-menu.ts`: `menu_items` 조회를 `id, name, group_id`로. 새 메뉴 insert 시 `group_id: findGroupIdByKey(itemName, menuItemCache)`를 함께 넣고, 묶였으면 로그 `  신규 메뉴 자동 묶음: ${itemName}`. 이번 실행에서 새로 생긴 이름 목록을 모은다.
  - 모든 주 크롤링이 끝난 뒤 `group_id is null`인 `menu_items` 개수를 조회해 출력하고, `process.env.GITHUB_STEP_SUMMARY`가 있으면 그 파일에 append: `### 묶이지 않은 메뉴 N개` + 이번 실행 새 이름 목록(없으면 "새 이름 없음"). 문구 끝에 `Claude Code에서 "새 메뉴 묶어줘"` 안내 한 줄.

- [ ] **Step 4: `npm test` PASS, `npx tsc --noEmit -p .` 확인**

- [ ] **Step 5: 커밋 (사용자 실행)**

```bash
git add lib/menu-group.ts lib/menu-group.test.ts scripts/crawl-menu.ts
git commit -m "feat: 새 메뉴 이름 키로 자동 묶기, Actions 요약에 미분류 개수 표시"
```

### Task 4: 묶음 파일 반영·조회 스크립트

**Files:**
- Create: `data/menu-groups.json`(초기값 `{}`), `scripts/apply-menu-groups.ts`, `scripts/list-ungrouped-menus.ts`
- Modify: `lib/menu-group.ts`, `lib/menu-group.test.ts`

**Interfaces:**
- Produces:
  - `type GroupFile = Record<string, string[]>`
  - `planGroupSync(file: GroupFile, items: { id: string; name: string; group_id: string | null }[], groups: { id: string; name: string }[]): { groupsToCreate: string[]; assignments: { menuItemId: string; groupName: string }[]; missingNames: string[]; duplicateNames: string[] }` — 이름 비교는 `normalizeMenuName`. 이미 같은 묶음에 있는 항목은 assignments에서 제외. 한 이름이 두 묶음에 있으면 `duplicateNames`에 넣고 배정하지 않음. JSON에 없는 항목은 건드리지 않음.
  - `findAutoGroupedNotInFile(file, items, groups): { name: string; groupName: string }[]` — `group_id`가 있지만 JSON 어디에도 없는 이름.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
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
```

- [ ] **Step 2: `npm test` → FAIL 확인**

- [ ] **Step 3: 구현**
  - 두 lib 함수 작성.
  - `scripts/apply-menu-groups.ts`: service role 키로 접속(크롤러와 같은 env 이름), JSON·`menu_items`·`menu_groups` 조회 → `planGroupSync` → 묶음 insert → `group_id` update → 멤버 없는 `menu_groups` 삭제 → 생성/배정/삭제 개수와 `missingNames`, `duplicateNames` 출력. `--dry-run`이면 쓰지 않고 출력만.
  - `scripts/list-ungrouped-menus.ts`: anon 키로 충분. `group_id` 없는 이름을 `meal_items` 등장 횟수 내림차순으로 출력, 이어서 `findAutoGroupedNotInFile` 결과 출력.

- [ ] **Step 4: `npm test` PASS, `npx tsx scripts/apply-menu-groups.ts --dry-run`이 빈 JSON으로 "생성 0, 배정 0" 출력 확인**

- [ ] **Step 5: 커밋 (사용자 실행)**

```bash
git add data/menu-groups.json scripts/apply-menu-groups.ts scripts/list-ungrouped-menus.ts lib/menu-group.ts lib/menu-group.test.ts
git commit -m "feat: 메뉴 묶음 파일 반영/미분류 조회 스크립트"
```

### Task 5: 하트 버튼 묶음 동작 + 홈

**Files:**
- Modify: `app/components/FavoriteButton.tsx`, `app/page.tsx`(MealItem 타입·select), `app/components/home/MealSection.tsx`

**Interfaces:**
- Consumes: `menu_items.group_id`.
- Produces: `FavoriteButton({ menuItemId: string; groupId: string | null; onToggle?: (favorited: boolean, removedMenuItemIds: string[]) => void })`. `MealItem.menu_items`에 `group_id: string | null` 추가.

- [ ] **Step 1: 구현**
  - 채움 판단: `groupId`가 있으면 `favorites`에서 `id, menu_item_id, menu_items!inner(group_id)`를 `user_id`와 `menu_items.group_id = groupId`로 조회해 1개 이상이면 채움. 없으면 지금처럼 `menu_item_id`로.
  - 끄기: 같은 조회로 행들을 가져와 `id in (...)`으로 삭제, `onToggle(false, 삭제된 menu_item_id들)`.
  - 켜기: 누른 `menuItemId` 한 행만 insert, `onToggle(true, [])`. 유니크 위반(이미 있음)은 성공으로 취급.
  - `app/page.tsx` select를 `menu_items ( id, name, group_id )`로, `MealSection`이 `groupId={item.menu_items.group_id}` 전달.

- [ ] **Step 2: 확인** — `npx tsc --noEmit -p .`, `npm run lint` 통과. 개발 서버에서 Task 7 이전이면 임시로 같은 묶음인 두 메뉴(스크래치패드 스크립트로 확인할 수 있는 실제 묶음, 없으면 Task 7 후로 미룸)로 하트 켜기/끄기가 묶음 단위인지 확인.

- [ ] **Step 3: 커밋 (사용자 실행)**

```bash
git add app/components/FavoriteButton.tsx app/page.tsx app/components/home/MealSection.tsx
git commit -m "feat: 하트를 메뉴 묶음 단위로 표시/해제"
```

### Task 6: 즐겨찾기 탭 + 마이페이지

**Files:**
- Modify: `lib/menu-group.ts`, `lib/menu-group.test.ts`, `app/favorites/page.tsx`, `app/mypage/page.tsx`

**Interfaces:**
- Consumes: `FavoriteButton`(Task 5).
- Produces:
  - `groupKeyOf(item: { id: string; group_id: string | null }): string` → `group_id ?? 'item:' + id`.
  - `type NextOccurrence = { meal_date: string; meal_type: string; rank: number; name: string }`
  - `computeNextByGroup(meals: { meal_date: string; meal_type: string; meal_items: { menu_item_id: string; menu_items: { name: string; group_id: string | null } | null }[] }[]): Record<string, NextOccurrence>` — 날짜, 끼니(아침·점심·저녁) 순으로 정렬 후 묶음 키별 첫 등장. 현재 `app/favorites/page.tsx`의 정렬·nextMap 로직을 옮긴다.
  - `groupFavorites<F extends { id: string; menu_items: { id: string; name: string; group_id: string | null } | null }>(favs: F[]): { key: string; primary: F; all: F[] }[]` — 첫 등장 순서 유지, `menu_items`가 null인 즐겨찾기는 제외.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('computeNextByGroup: 같은 묶음의 다른 이름이 다음 등장', () => {
  const next = computeNextByGroup([
    { meal_date: '2026-10-30', meal_type: 'lunch', meal_items: [{ menu_item_id: 'b', menu_items: { name: '미역오이냉국', group_id: 'g' } }] },
    { meal_date: '2026-10-28', meal_type: 'dinner', meal_items: [{ menu_item_id: 'c', menu_items: { name: '쌀밥', group_id: null } }] },
  ])
  assert.equal(next['g'].name, '미역오이냉국')
  assert.equal(next['g'].meal_date, '2026-10-30')
  assert.equal(next['item:c'].rank, 0)
})
test('computeNextByGroup: 같은 날은 아침→점심→저녁', () => {
  const m = (t: string) => ({ meal_date: '2026-10-28', meal_type: t, meal_items: [{ menu_item_id: 'x', menu_items: { name: '김', group_id: null } }] })
  assert.equal(computeNextByGroup([m('dinner'), m('breakfast')])['item:x'].meal_type, 'breakfast')
})
test('groupFavorites: 같은 묶음은 한 줄, 혼자인 메뉴는 각자', () => {
  const f = (id: string, mid: string, g: string | null) => ({ id, menu_items: { id: mid, name: mid, group_id: g } })
  const r = groupFavorites([f('1', 'a', 'g'), f('2', 'b', null), f('3', 'c', 'g')])
  assert.deepEqual(r.map((x) => [x.key, x.primary.id, x.all.map((y) => y.id)]), [['g', '1', ['1', '3']], ['item:b', '2', ['2']]])
})
```

- [ ] **Step 2: `npm test` → FAIL 확인**

- [ ] **Step 3: 구현**
  - lib 함수 작성.
  - `app/favorites/page.tsx`: 즐겨찾기 select `id, menu_items ( id, name, group_id )`, 다가오는 식단 select `meal_date, meal_type, meal_items ( menu_item_id, menu_items ( name, group_id ) )`. `computeNextByGroup`, `groupFavorites`로 상태 구성(상태 단위는 묶음 줄). 정렬은 지금처럼 다음 등장 rank 순.
  - 표시: 이름은 `primary`의 이름. 다음 등장 이름이 `primary` 이름과 (`splitMenuName().main` 기준) 다르면 `다음 등장: {다음 이름 main} · {describeOccurrence(...)}`, 같으면 지금 문구 그대로.
  - 하트: `FavoriteButton menuItemId={primary.menu_items.id} groupId={primary.menu_items.group_id}`. 끄면 그 줄 제거, 토스트에 `removedMenuItemIds` 보관. 실행취소는 각 id를 insert(하나가 실패해도 나머지 계속)하고 다시 조회해 줄 복구.
  - `app/mypage/page.tsx`: select에 `group_id` 추가, `groupFavorites`의 `primary`만 칩으로 표시.

- [ ] **Step 4: `npm test` PASS, `npx tsc --noEmit -p .`, `npm run lint`, `npm run build` 통과 확인**

- [ ] **Step 5: 커밋 (사용자 실행)**

```bash
git add lib/menu-group.ts lib/menu-group.test.ts app/favorites/page.tsx app/mypage/page.tsx
git commit -m "feat: 즐겨찾기 다음 등장을 메뉴 묶음 기준으로 계산"
```

### Task 7: 초기 묶음표 작성·검토·반영 (운영 작업)

**Files:**
- Modify: `data/menu-groups.json`

- [ ] **Step 1:** 재크롤링(Task 1) 이후 DB의 전체 메뉴 이름과 등장 횟수를 뽑아(`list-ungrouped-menus`) 스펙의 "묶는 기준"대로 `data/menu-groups.json` 초안 작성. 묶음 이름은 사람이 읽는 음식 이름("김치찌개", "삼치"). 메뉴가 아닌 문구와 혼자인 이름은 넣지 않는다. 필요하면 `TYPO_FIXES`에 항목 추가(테스트 한 줄과 함께).
- [ ] **Step 2: 사용자 검토 (HARD STOP)** — 멤버 2개 이상인 묶음만 목록으로 보여주고, 애매하게 판단한 묶음은 따로 표시. 사용자 수정 반영 후 확정.
- [ ] **Step 3:** `npx tsx scripts/apply-menu-groups.ts --dry-run` 결과(`missingNames`, `duplicateNames` 0인지) 확인 → 사용자 확인 후 실제 실행.
- [ ] **Step 4:** 개발 서버에서 확인: 미역냉국 하트 → 미역오이냉국도 채워짐, 즐겨찾기 탭에 한 줄 + "다음 등장: {다른 이름}"(해당 메뉴가 다가오는 식단에 있을 때), 하트 끄기 → 묶음 전체 해제, 실행취소 → 복구.
- [ ] **Step 5: 커밋 (사용자 실행)**

```bash
git add data/menu-groups.json lib/menu-group.ts lib/menu-group.test.ts
git commit -m "data: 초기 메뉴 묶음표"
```

### 머지 순서 (사용자 실행)

Task 2 SQL이 운영 DB에 적용됐는지 확인한 뒤 PR로 main에 머지한다.

```bash
git push -u origin menu-groups
gh pr create --base main --head menu-groups --title "메뉴 묶음: 같은 음식 다른 이름 묶기" --body "spec: docs/superpowers/specs/2026-10-26-menu-groups-design.md"
```
