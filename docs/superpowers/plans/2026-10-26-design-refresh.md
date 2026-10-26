# DormEats 디자인 리프레시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기능은 그대로 두고, 베이지·세리프·이모지 조합을 흑백 + Pretendard + Lucide로 바꾼다. 식단 홈의 날짜 이동, 메뉴 배치, 식사시간 표시도 다듬는다.

**Architecture:** 토큰 이름은 그대로 두고 `app/globals.css`의 값만 바꾼다. 그러면 대부분의 화면이 클래스 수정 없이 새 색을 받는다. 시간 계산은 순수 함수(`lib/meal-time.ts`, `lib/date.ts`)로 빼고 `node:test`로 검증한다. 홈(`app/page.tsx`)은 컴포넌트 3개로 나눠 다시 쓴다.

**Tech Stack:** Next.js 16.2 (App Router, 일반 Next.js와 다름. 코드를 쓰기 전에 `AGENTS.md`를 따르고 `node_modules/next/dist/docs/`를 확인한다), React 19, Tailwind v4 (`@theme inline`), lucide-react, Supabase, `next/font/local`, 테스트는 `tsx --test` (node:test).

**Spec:** `docs/superpowers/specs/2026-10-26-design-refresh-design.md` (모든 태스크의 근거. 함께 읽을 것)

## Global Constraints

- 배경은 순백 `#ffffff`(다크 `#0a0b0d`)이다. 베이지·크림·누런 톤이 하나도 남으면 안 된다.
- 색은 흑백만 쓴다. 빨강은 **눌린 좋아요 하트**(`like`)와 **오류·삭제 문구**(`danger`)에만 쓴다.
- 폰트는 Pretendard 하나만 쓴다. `font-serif` 클래스와 `Gothic_A1`, `Gowun_Dodum`은 전부 제거한다.
- 아이콘은 lucide-react만 쓴다. `app/`, `lib/`에 이모지가 0개여야 한다.
- 카드 박스(`rounded-2xl border bg-surface p-4` 같은 리스트 항목)는 1px `border-border` 구분선으로 바꾼다. 갈색 그림자 `rgba(118,85,42,…)`는 제거한다.
- 선택 상태는 `bg-primary text-primary-foreground`(검정/흰) 또는 `text-foreground font-bold`로 표시한다.
- 데이터, Supabase 쿼리 조건, 탭 5개 구성은 바꾸지 않는다. 예외는 홈의 주 범위 계산 하나다(Task 4).
- 다크 모드를 유지한다. `text-white`, `bg-white`를 하드코딩하지 말고 토큰을 쓴다.
- 데모(스펙에 적힌 `.superpowers/brainstorm/.../content/*.html`)에 없는 화면은 공통 규칙만 적용하고 레이아웃은 그대로 둔다.
- 매 태스크가 끝나면 `npm run build`와 `npm run lint`를 통과해야 한다.

## Review Focus

1. **페이지를 켜 둔 채 식사 경계를 지나는 경우** (예: 12:59에서 13:00으로 넘어갈 때): "지금 · 1분 남음"이 사라지고, 점심이 흐려지고, 저녁에 "N시간 M분 후"가 떠야 한다. 이는 `useNow`로 1분마다 다시 그려서 처리한다. 테스트는 Task 2의 경계값 테스트가 담당한다.
2. **일요일 20:00 이후**: 요일 띠가 다음 주(월~일)를 보여주고, 다음 주 월요일이 선택되며, 오늘 점은 없어야 한다. 쿼리 범위도 다음 주여야 한다. 테스트는 Task 2의 `getWeekDates` 테스트가 담당한다.
3. **00:00~07:00 (새벽)**: 아직 오늘이므로 기본 날짜는 오늘이다. 아침에 "N시간 M분 후"가 뜨고 흐린 끼니는 없어야 한다. 테스트는 Task 2가 담당한다.
4. **메뉴가 없거나 메뉴 이름이 긴 경우**: 끼니 row가 없거나 메뉴가 0개이면 "등록된 메뉴가 없습니다"를 표시한다. 긴 이름은 2열 grid 안에서 줄바꿈되고, 같은 줄 두 칸의 높이가 맞아야 한다(`min-w-0`, `break-keep`). Task 4에서 수동으로 확인한다.
5. **다크 모드 대비**: `bg-primary`가 흰색으로 뒤집히므로 그 위 글자는 반드시 `text-primary-foreground`여야 한다. 토스트처럼 `bg-foreground`인 곳은 `text-background`여야 한다. Task 7에서 하드코딩 흰색을 검사한다.

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `app/globals.css` | 토큰 값 교체, `--like`·`--faint` 추가, `pulse-dot` 키프레임 추가 |
| `app/layout.tsx` | Pretendard 로컬 폰트 |
| `app/fonts/PretendardVariable.woff2` (신규) | 폰트 파일 |
| `lib/date.ts` | `getWeekDates`, `getRelativeDayLabel`, `formatKoreanDate` 추가 |
| `lib/meal-time.ts` (신규) | 끼니 시각표, 끼니 상태 계산, 남은 시간 문구 |
| `lib/date.test.ts`, `lib/meal-time.test.ts` (신규) | 순수 함수 테스트 |
| `lib/useNow.ts` (신규) | 1분마다 갱신되는 현재 시각 훅 |
| `app/components/EmptyState.tsx` (신규) | 점선 박스를 대체하는 공통 빈 상태 |
| `app/components/home/DateStrip.tsx` (신규) | 날짜 라벨, 제목, "오늘로" 버튼, 요일 띠 |
| `app/components/home/MealSection.tsx` (신규) | 끼니 하나(접힘/펼침), 상태 문구, 흐리게 처리 |
| `app/components/home/TopWishPost.tsx` (신규) | 희망메뉴 1위 |
| `app/page.tsx` | 데이터 로딩과 조립만 담당 |
| `lib/categories.ts` | 4색 제거 |
| 그 밖의 `app/**` | 공통 규칙 적용 |
| `app/week/page.tsx` | 삭제 |

---

### Task 1: 토큰과 폰트

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`, `.gitignore`, `package.json`
- Create: `app/fonts/PretendardVariable.woff2`
- Modify: `font-serif`를 쓰는 15개 파일 전부 (`grep -rln font-serif app`)

**Interfaces:**
- Produces: Tailwind 클래스 `text-like`, `fill-like`, `bg-like`, `text-faint`, `bg-faint`와 CSS 클래스 `animate-pulse-dot`. 기존 토큰 이름은 모두 유지한다.

- [ ] **Step 1: 폰트 파일 준비**

```bash
npm install pretendard@1.3.9
mkdir -p app/fonts && cp node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2 app/fonts/
npm uninstall pretendard
```
Expected: `app/fonts/PretendardVariable.woff2`가 생기고 `package.json`에는 의존성이 남지 않는다.

- [ ] **Step 2: `app/layout.tsx`**

`next/font/google` import를 지우고 `localFont({ src: './fonts/PretendardVariable.woff2', variable: '--font-body', weight: '45 920', display: 'swap' })` 하나만 둔다. `<html>` className에서 `gowunDodum.variable`을 제거한다.

- [ ] **Step 3: `app/globals.css` 토큰 교체**

스펙의 "디자인 토큰" 표 값을 `:root`와 다크 블록에 그대로 넣는다. 추가로 다음을 반영한다.
- `--like: #e5484d`, 다크 `#ff6369`
- `--faint: #8a919e`, 다크 `#6b7280`
- `--social`은 `var(--like)`로 둔다.
- `--star`, `--live`, `--success`는 `var(--foreground)`로 둔다.

`@theme inline`에는 `--color-like`, `--color-faint`를 추가하고, `--font-serif: var(--font-body)`로 바꾼다. 이렇게 하면 지우지 못한 `font-serif`가 있어도 안전하다. `::selection` 배경은 `var(--foreground)`, 글자는 `var(--background)`로 둔다. 키프레임은 아래와 같이 추가한다.

```css
@keyframes pulse-dot { 0%, 100% { opacity: 1 } 50% { opacity: .25 } }
.animate-pulse-dot { animation: pulse-dot 1.6s ease-in-out infinite; }
```

- [ ] **Step 4: `font-serif` 제거**

Run: `grep -rln "font-serif" app | xargs sed -i 's/ font-serif//g; s/font-serif //g'`
그다음 `grep -rn "font-serif" app`을 실행한다.
Expected: `globals.css`의 `--font-serif` 한 줄만 남는다.

- [ ] **Step 5: `.gitignore`에 `.superpowers/` 추가, `package.json`에 `"test": "tsx --test lib/*.test.ts"` 추가**

- [ ] **Step 6: 검증**

`npm run build && npm run lint`를 실행한다. 이어서 `grep -rn "f6f4ee\|Gowun\|Gothic" app`도 실행한다.
Expected: 빌드가 성공하고 grep 결과가 0줄이다. `npm run dev`로 홈을 열었을 때 배경이 순백이고 글꼴이 Pretendard여야 한다.

- [ ] **Step 7: Commit**

```bash
git add -A app package.json package-lock.json .gitignore docs
git commit -m "style: 흑백 토큰과 Pretendard 폰트로 교체"
```

---

### Task 2: 날짜·끼니 시간 순수 함수

**Files:**
- Create: `lib/meal-time.ts`, `lib/meal-time.test.ts`, `lib/date.test.ts`
- Modify: `lib/date.ts` (함수 추가만. 기존 함수는 건드리지 않음)

**Interfaces:**
- Produces (`lib/meal-time.ts`):
  - `type MealType = 'breakfast' | 'lunch' | 'dinner'`
  - `const MEAL_ORDER: MealType[]` 값: `['breakfast','lunch','dinner']`
  - `const MEAL_SCHEDULE: Record<MealType, { start: number; end: number }>` 값(자정부터 분): breakfast 420~510, lunch 720~780, dinner 1110~1200. `lib/date.ts`의 기존 시각과 같아야 한다.
  - `type MealPhase = { kind: 'now'; minutesLeft: number } | { kind: 'upcoming'; minutesUntil: number } | { kind: 'ended' } | { kind: 'later' }`
  - `getSeoulMinutes(now: Date): number`: 서울 기준 0~1439
  - `getMealPhases(nowMinutes: number, dayOffset: 0 | 1): Record<MealType, MealPhase>`
  - `formatDuration(minutes: number): string`
- Produces (`lib/date.ts`):
  - `getWeekDates(dateStr: string): string[]`: dateStr이 속한 주의 월~일 `YYYY-MM-DD` 7개
  - `getRelativeDayLabel(dateStr: string, todayStr: string): '오늘' | '내일' | '모레' | '어제' | ''`
  - `formatKoreanDate(dateStr: string): string`: 예) `'10월 26일 월요일'`

`getMealPhases` 규칙:
- `dayOffset`은 보고 있는 날이 실제 오늘이면 0, 내일이면 1이다.
- 각 끼니의 시각은 `start + dayOffset*1440`, `end + dayOffset*1440`으로 계산한다.
- `start ≤ now < end`이면 `now`이고, `minutesLeft = end - now`이다.
- `end ≤ now`이면 `ended`이다.
- `now`가 하나도 없을 때, 시작 전인 끼니 중 가장 이른 것 하나만 `upcoming`이고, `minutesUntil = start - now`이다.
- 나머지는 `later`이다.

- [ ] **Step 1: 실패하는 테스트 작성** (`import { test } from 'node:test'`, `import assert from 'node:assert/strict'`)

`lib/meal-time.test.ts`:
```ts
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
```

`lib/date.test.ts`:
```ts
test('getWeekDates 월요일/일요일', () => {
  assert.deepEqual(getWeekDates('2026-10-26'), ['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01'])
  assert.equal(getWeekDates('2026-11-01')[0], '2026-10-26')
  assert.equal(getWeekDates('2026-11-02')[0], '2026-11-02') // 일요일 저녁 이후 → 다음 주
})
test('getRelativeDayLabel', () => {
  assert.equal(getRelativeDayLabel('2026-10-26', '2026-10-26'), '오늘')
  assert.equal(getRelativeDayLabel('2026-10-27', '2026-10-26'), '내일')
  assert.equal(getRelativeDayLabel('2026-10-28', '2026-10-26'), '모레')
  assert.equal(getRelativeDayLabel('2026-10-25', '2026-10-26'), '어제')
  assert.equal(getRelativeDayLabel('2026-10-30', '2026-10-26'), '')
  assert.equal(getRelativeDayLabel('2026-11-01', '2026-10-31'), '내일') // 월 경계
})
test('formatKoreanDate', () => assert.equal(formatKoreanDate('2026-10-26'), '10월 26일 월요일'))
```

- [ ] **Step 2: `npm test` 실행 → import 실패로 FAIL 확인**

- [ ] **Step 3: 구현**

날짜 문자열은 `new Date(\`${s}T00:00:00\`)`로 파싱하고 기존 `getMondayOfWeek`, `formatDate`를 재사용한다. 날짜 차이는 하루 단위로 반올림해서 계산한다(`Math.round(ms / 86400000)`). `getSeoulMinutes`는 기존 `getCurrentMealType`과 같은 `Intl.DateTimeFormat` 방식을 쓴다. `hour`가 `'24'`로 나오는 환경도 0으로 처리한다(`% 24`).

- [ ] **Step 4: `npm test` → 모두 PASS**

- [ ] **Step 5: Commit** `git commit -m "feat: 끼니 상태·남은 시간·주 계산 순수 함수 추가"`

---

### Task 3: 공통 컴포넌트

**Files:**
- Create: `app/components/EmptyState.tsx`, `lib/useNow.ts`
- Modify: `app/components/LikeButton.tsx`, `FavoriteButton.tsx`, `BottomTabBar.tsx`, `Header.tsx`, `lib/categories.ts`, `app/free-board/page.tsx`(칩·라벨 부분만), `app/free-board/[id]/page.tsx:88`

**Interfaces:**
- Produces:
  - `EmptyState({ icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: { href: string; label: string } }): JSX.Element`
  - `useNow(intervalMs = 60_000): Date` (`'use client'` 훅, `setInterval`로 갱신하고 언마운트 시 정리)
  - `CATEGORY_LABEL: Record<Category, string>`. `CATEGORY_STYLE`은 삭제하고 `getCategoryLabel`은 유지한다.

- [ ] **Step 1: `EmptyState`**

가운데 정렬로 `py-12` 안에 다음을 배치한다.
- 48px 원(`bg-accent-soft`) 안에 아이콘(22px, `text-faint`)
- 제목(15px, `font-bold`)
- 설명(13px, `text-muted-foreground`)
- action이 있으면 `Link`. 스타일은 `mt-4 rounded-full border border-border-strong px-4 py-2 text-sm font-semibold`

- [ ] **Step 2: `LikeButton`**

이모지를 `<Heart size={16} />`로 바꾼다.
- 눌림: `fill-like text-like`, 버튼은 `border-like/40 text-like`
- 안 눌림: `text-muted-foreground`, `border-border`

`bg-social/10`은 제거한다.

- [ ] **Step 3: `FavoriteButton`**

`social`을 `like`로 바꾸고, 눌림 배경 `bg-social/10`을 제거한다. 안 눌림 아이콘은 `text-faint`로 바꾼다.

- [ ] **Step 4: `BottomTabBar`**

활성 탭의 알약 배경을 제거한다.
- 활성: 아이콘 `strokeWidth={2.4}` + `text-foreground`, 라벨 `font-bold text-foreground`
- 비활성: 아이콘 `strokeWidth={1.75}` + `text-faint`, 라벨 `text-faint`

바 배경은 `bg-background`, 위 테두리는 `border-border`로 둔다.

- [ ] **Step 5: `Header`**

로고 텍스트는 `font-extrabold tracking-tight text-foreground`로 바꾸고, Soup 아이콘은 `text-foreground`로 바꾼다. 회원가입 알약은 `bg-primary text-primary-foreground`를 유지한다.

- [ ] **Step 6: 카테고리**

`lib/categories.ts`의 hex를 전부 제거하고 라벨 맵만 남긴다. `free-board/page.tsx`는 다음과 같이 바꾼다.
- 칩: 비선택 `bg-accent-soft text-muted-foreground`, 선택 `bg-primary text-primary-foreground`
- 글 목록의 카테고리 라벨: `text-xs font-bold text-muted-foreground` (배경 없음)

`free-board/[id]`의 `[식당]` 대괄호는 같은 라벨 스타일로 바꾼다.

- [ ] **Step 7: 검증**

`npm run build && npm run lint && npm test`를 실행한다. 이어서 `grep -rn "#[0-9A-Fa-f]\{6\}" lib app --include=*.ts --include=*.tsx`도 실행한다.
Expected: grep 결과가 0줄이다.

- [ ] **Step 8: Commit** `git commit -m "style: 하트·탭바·헤더·카테고리를 흑백 규칙으로"`

---

### Task 4: 식단 홈

**Files:**
- Create: `app/components/home/DateStrip.tsx`, `MealSection.tsx`, `TopWishPost.tsx`
- Modify: `app/page.tsx` (전체 재작성)

**Interfaces:**
- Consumes:
  - Task 2: `getWeekDates`, `getRelativeDayLabel`, `formatKoreanDate`, `getMealPhases`, `getSeoulMinutes`, `formatDuration`, `MEAL_ORDER`, `MealPhase`, `MealType`
  - Task 3: `useNow`
- Produces:
  - `DateStrip({ weekDates, selectedDate, todayStr, effectiveDate, onSelect }: { weekDates: string[]; selectedDate: string; todayStr: string; effectiveDate: string; onSelect: (d: string) => void })`
  - `MealSection({ mealType, meal, expanded, onExpand, phase, dimmed, showReviews }: { mealType: MealType; meal: Meal | undefined; expanded: boolean; onExpand: () => void; phase: MealPhase | null; dimmed: boolean; showReviews: boolean })`
  - `TopWishPost({ post }: { post: TopPost })`
  - `Meal`, `MealItem`, `TopPost` 타입은 `page.tsx`에서 export해서 쓴다.

**`page.tsx` 상태와 계산**
- `todayStr`, `effectiveDate`는 지금 코드와 같은 방식으로 로드할 때 한 번 계산한다.
- `weekDates = getWeekDates(effectiveDate)`이다. 쿼리 범위는 `weekDates[0]`~`weekDates[6]`이고, `queryEndDate` 계산은 삭제한다.
- 삭제: `view` 상태, 토글 버튼, "도봉학사" 줄, "내일 메뉴로 자동 전환됐어요", `nextMealInfo` 상태
- `expandedMeal`의 초기값은 지금과 같다(현재 끼니 ?? 다음 끼니).
- `now = useNow()`일 때 `phases`는 다음과 같다.
  - `selectedDate === effectiveDate`이면 `getMealPhases(getSeoulMinutes(now), effectiveDate === todayStr ? 0 : 1)`
  - 아니면 `null`
- `dimmed = selectedDate === todayStr && phases?.[t].kind === 'ended'`
- `showReviews = selectedDate === todayStr && !!meal` (지금 동작 유지)

- [ ] **Step 1: `DateStrip`** (데모 `date-nav.html` B안)

윗줄 구성:
- 왼쪽에 라벨 `getRelativeDayLabel(selectedDate, todayStr)`. 13px, bold, muted. 빈 문자열이면 렌더하지 않는다.
- 그 아래 제목 `formatKoreanDate(selectedDate)`. 26px, bold, `tracking-[-0.03em]`.
- `selectedDate !== effectiveDate`이면 오른쪽에 "오늘로" 버튼을 둔다. 스타일은 `rounded-full border border-border-strong px-3 py-1.5 text-xs font-semibold`이고, 누르면 `onSelect(effectiveDate)`를 호출한다.

아랫줄 `grid grid-cols-7`:
- 각 칸은 요일(11px, faint)과 36px 원 안의 날짜 숫자(15px, semibold)로 구성한다.
- 선택된 칸은 원 `bg-primary text-primary-foreground`이다.
- `dateStr === todayStr`인 칸은 숫자 아래에 4px 점(`bg-foreground`)을 둔다.
- 띠 아래에는 `border-b border-border`를 둔다.

- [ ] **Step 2: `MealSection`** (데모 `menu-layout.html` C안 + `badge.html` C안)

상태 문구 `MealStatus(phase)`:
- `now`: `● 지금 · {formatDuration(minutesLeft)} 남음`. 점은 6px `bg-foreground animate-pulse-dot`, "지금"은 bold, 나머지는 `font-medium text-muted-foreground`, 12px.
- `upcoming`: `{formatDuration(minutesUntil)} 후`. 12px, semibold, muted.
- `ended`와 `later`는 표시하지 않는다.
- 알약 모양, 테두리, 빨강은 쓰지 않는다.

접힘:
- `button` 하나로 만든다. 박스 없이 `py-3.5 border-b border-border`를 둔다.
- 첫 줄: 끼니명(16px, bold) + 시간(12px, faint) + 상태 문구(시간 옆, `ml-2`)
- 둘째 줄: 미리보기(13px, muted). 문구 규칙은 지금과 같다(앞 3개 + "외 N개").
- 오른쪽에 `ChevronRight`(18px, `text-faint`)
- `dimmed`이면 끼니명, 시간, 미리보기에 `opacity-45`를 준다.

펼침:
- 박스 없이 `pt-4 pb-2 border-b border-border`를 둔다.
- 첫 줄: 끼니명(18px, bold) + 시간 + 상태 문구(`ml-auto`). `dimmed` 규칙은 접힘과 같다.
- 메뉴는 `grid grid-cols-2 gap-x-4` 하나로 배치한다.
  - 각 칸은 `flex items-center justify-between gap-2 py-2.5 border-b border-border min-w-0`이다.
  - 마지막 줄의 두 칸은 아래 선을 없앤다. 칸 수가 홀수이면 마지막 한 칸만 없앤다.
  - 이름은 14px `break-keep`, detail은 11px muted이다. 오른쪽에 `FavoriteButton`을 둔다.
- `leftItems`/`rightItems`는 만들지 않는다.
- 메뉴가 없으면 "등록된 메뉴가 없습니다"(13px, muted)를 표시한다.
- `showReviews`이면 `ReviewSection`을 표시한다.

- [ ] **Step 3: `TopWishPost`** (데모 `wish-top.html` A안)

머리줄:
- 왼쪽 "희망메뉴 인기"(13px, bold, muted)
- 오른쪽 `Link href="/board"` "전체보기" + `ChevronRight` 14px (13px, semibold)

본문은 `Link href=/board/{id}` 하나로 만들고, 박스·기울임·배경은 없앤다.
- 왼쪽에 큰 "1"(28px, extrabold, `tabular-nums`)
- 오른쪽 첫 줄: 제목(15px, bold)
- 오른쪽 둘째 줄: 본문(13px, muted, `line-clamp-2`)
- 오른쪽 셋째 줄: `{작성자} · {formatRelativeTime}`(12px, faint) + 오른쪽 끝 `Heart` 14px `fill-like text-like` + 숫자(12px, bold)

"Community", 📌, 🔥, "TOP 1"은 쓰지 않는다. 섹션 위에는 `mt-8`을 둔다.

- [ ] **Step 4: `page.tsx` 조립**

컨테이너 `max-w-xl mx-auto px-5 py-6` 안에 `DateStrip`, `MealSection` × 3, `TopWishPost` 순서로 배치한다. 로딩 문구는 그대로 둔다.

- [ ] **Step 5: 수동 확인**

`npm run dev`를 실행한다. 아래 항목은 브라우저 개발자도구의 시간 덮어쓰기 대신 `getSeoulMinutes` 반환값을 잠깐 고정해서 확인하고, 확인이 끝나면 원복한다.
- [ ] 12:20 → 아침 흐림, 점심 펼침 + "지금 · 40분 남음"
- [ ] 15:00 → 저녁 "3시간 30분 후"
- [ ] 20:30 → 라벨 "내일", 아침 "10시간 30분 후", 흐린 끼니 없음
- [ ] 다른 요일을 누르면 "오늘로"가 나타나고, 누르면 원래 날짜로 돌아오며, 상태 문구가 사라짐
- [ ] 메뉴 이름이 긴 줄에서도 두 칸 높이가 맞음
- [ ] 다크 모드에서 선택 원이 흰 원 + 검정 숫자로 보임

- [ ] **Step 6: `npm run build && npm run lint && npm test` 통과**

- [ ] **Step 7: Commit** `git commit -m "feat: 식단 홈을 요일 띠·줄 맞춘 2열·남은 시간 표시로 재구성"`

---

### Task 5: 희망메뉴·자유게시판 목록

**Files:**
- Modify: `app/board/page.tsx`, `app/free-board/page.tsx`

**Interfaces:**
- Consumes: Task 3 `EmptyState`, lucide `Heart`

- [ ] **Step 1: `board/page.tsx`**
  - 실시간 TOP 박스(`bg-accent-soft`)를 없앤다. 섹션 라벨 "실시간 TOP"(12px, semibold, faint) 아래에 각 행을 `flex items-center gap-3 py-3 border-b border-border`로 둔다. 행 구성은 순위 숫자(16px, extrabold, `w-5`) + 제목(15px, medium, `truncate`, `flex-1`) + `Heart` 13px `fill-like text-like` + 숫자다. 숫자 원은 제거한다.
  - 전체 글은 `sm:grid-cols-2` 카드를 1열로 바꾼다. 각 행은 `block py-3.5 border-b border-border`, 제목은 15px medium, 메타 줄은 12px faint(작성자 · 시간 · 하트 수)로 둔다.
  - 빈 상태는 `EmptyState icon={MessageCircleHeart} title="아직 희망메뉴가 없어요" description="먹고 싶은 메뉴를 처음으로 올려 보세요" action={{ href: '/board/new', label: '글쓰기' }}`로 바꾼다.
  - "오류 발생 😢"은 `text-danger`로 "오류가 발생했어요"라고 쓴다.
- [ ] **Step 2: `free-board/page.tsx`** 글 목록을 같은 1열 행 규칙으로 바꾼다. 카테고리 라벨은 제목 위 한 줄에 둔다. ❤️와 😢 처리는 board와 같다. 빈 상태는 `icon={MessagesSquare} title="아직 글이 없어요"`, 글쓰기 action으로 둔다.
- [ ] **Step 3:** `npm run build && npm run lint`를 실행한다. 이어서 `grep -nP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" app/board/page.tsx app/free-board/page.tsx`도 실행한다. Expected: grep 결과가 0줄이다.
- [ ] **Step 4: Commit** `git commit -m "style: 게시판 목록을 1열 구분선 리스트로"`

---

### Task 6: 즐겨찾기·마이·후기

**Files:**
- Modify: `app/favorites/page.tsx`, `app/mypage/page.tsx`, `app/components/ReviewSection.tsx`

- [ ] **Step 1: `favorites`**
  - 각 항목은 박스 대신 `py-3.5 border-b border-border` 행으로 바꾼다.
  - "다음 등장: …"은 `text-foreground font-semibold`로 쓰고 앞에 5px 점(`bg-foreground`)을 둔다. "이번 주 예정 없음"은 `text-faint`로 쓴다.
  - 토스트의 `text-star`와 `bg-star/70`은 각각 `text-background font-bold`와 `bg-background/60`으로 바꾼다. 토스트 글자가 `text-white`이면 `text-background`로 바꾼다.
  - 빈 상태는 `EmptyState icon={Heart} title="즐겨찾기한 메뉴가 없어요" description="식단에서 하트를 누르면 여기 모여요" action={{ href: '/', label: '오늘의 식단 보기' }}`로 바꾼다.
- [ ] **Step 2: `mypage`**
  - 프로필: 박스를 없애고 48px 원(`bg-primary text-primary-foreground`, 닉네임 첫 글자) + 닉네임(18px, bold) + 기숙사(13px, muted 텍스트)로 구성한다.
  - 통계: `grid grid-cols-3 py-4 border-y border-border`로 두고, 각 칸은 숫자(22px, bold, `tabular-nums`, 왼쪽 정렬) + 라벨(12px, muted)이다.
  - 탭: 알약 대신 `flex border-b border-border`로 둔다. 선택 탭은 `text-foreground font-bold border-b-2 border-foreground -mb-px`, 비선택 탭은 `text-muted-foreground`다.
  - 글 목록은 1열 행으로 바꾼다(Task 5 규칙). `[희망메뉴]`는 `text-xs font-bold text-muted-foreground` 라벨로 바꾸고, ❤️는 lucide `Heart`(`fill-like text-like`)로 바꾼다.
  - 즐겨찾기 탭의 `bg-danger/10 … ❤️` 칩은 `bg-accent-soft text-foreground` 칩으로 바꾸고 이모지를 제거한다.
- [ ] **Step 3: `ReviewSection`**
  - 별의 `fill-star text-star`는 `fill-foreground text-foreground`로 바꾼다. 빈 별은 `text-border-strong`을 유지한다.
  - "후기 작성" 링크/버튼은 `text-foreground font-semibold`로 바꾼다.
  - 박스(`rounded-…border…bg-surface`)는 `pt-3`과 위 구분선으로 바꾼다.
- [ ] **Step 4:** `npm run build && npm run lint` 통과
- [ ] **Step 5: Commit** `git commit -m "style: 즐겨찾기·마이·후기를 흑백 규칙으로"`

---

### Task 7: 나머지 화면, `/week` 삭제, 최종 점검

**Files:**
- Delete: `app/week/` 폴더 전체
- Modify (공통 규칙만): `app/login`, `signup`, `forgot-password`, `reset-password`, `board/new`, `free-board/new`, `board/[id]`, `free-board/[id]`, `app/components/CommentSection.tsx`, `NotificationBell.tsx`, `DeletePostButton.tsx`

- [ ] **Step 1:** `grep -rn "\"/week\|'/week\|\`/week" app lib`를 실행해 0줄인지 확인한다. 그다음 `git rm -r app/week`로 삭제한다.
- [ ] **Step 2:** `signup/page.tsx`의 "🍚 도봉학사 식단 커뮤니티"에서 🍚를 제거한다. 나머지 파일에서는 다음을 바꾼다.
  - 카드 박스 리스트 → 구분선
  - `bg-accent-soft` 강조 박스 → 배경 없음
  - 점선 빈 상태 → `EmptyState`
  - 입력 폼과 버튼의 모양(둥근 정도)은 유지하되 색은 토큰을 따르게 한다.
- [ ] **Step 3: 최종 grep 점검** (모두 0줄이어야 함)

```bash
grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" app lib
grep -rn "font-serif\|Gowun\|Gothic_A1\|f6f4ee\|rgba(118" app lib --include=*.tsx --include=*.ts
grep -rn "border-dashed" app
grep -rn "text-white\|bg-white" app
grep -rn "text-star\|fill-star\|text-live\|bg-live\|text-social\|bg-social\|text-success" app
```

- [ ] **Step 4:** `npm run build && npm run lint && npm test`를 통과시킨다. 이어서 `npm run dev`로 라이트·다크 모드 양쪽에서 5개 탭과 로그인·글쓰기·글 상세를 한 번씩 열어 본다.
- [ ] **Step 5: Commit** `git commit -m "style: 나머지 화면 정리와 /week 삭제"`
- [ ] **Step 6: 보고** 바뀐 파일 목록, 직접 열어 보지 못한 화면, 계획과 다르게 처리한 부분을 정리한다.
