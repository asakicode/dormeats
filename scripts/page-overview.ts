/**
 * 6개 하단 탭 페이지를 캡처해서 한 장의 미리보기 이미지로 합칩니다.
 * 실행: npm run overview
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { globSync } from 'fs'
import { spawn, spawnSync } from 'child_process'

const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'dev-overview')
const SHOTS_DIR = join(OUT_DIR, 'shots')
const BASE = 'http://localhost:3000'

const PREVIEW_USERNAME = 'devpreview392518'
const PREVIEW_PASSWORD = 'preview1234'
// nickname은 UNIQUE 제약이 있어 회원가입 폴백 시 충돌하지 않도록 username 기반으로 생성
const PREVIEW_NICKNAME = `프리뷰_${PREVIEW_USERNAME}`

function resolvePlaywright() {
  try {
    return require('playwright')
  } catch {}
  const candidates = globSync(join(homedir(), '.npm/_npx/*/node_modules/playwright'))
  if (candidates.length === 0) {
    throw new Error(
      '로컬에서 playwright를 찾을 수 없습니다. 한 번만 `npx playwright install chromium`을 실행해주세요.'
    )
  }
  return require(candidates[0])
}

function resolveChromiumExecutable(): string | undefined {
  const candidates = globSync(join(homedir(), '.cache/ms-playwright/chromium-*/chrome-linux64/chrome')).sort()
  return candidates.length > 0 ? candidates[candidates.length - 1] : undefined
}

function readTabs(): { href: string; label: string }[] {
  const src = readFileSync(join(ROOT, 'app/components/BottomTabBar.tsx'), 'utf-8')
  const tabs: { href: string; label: string }[] = []
  const re = /href:\s*'([^']+)',\s*label:\s*'([^']+)'/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) tabs.push({ href: m[1], label: m[2] })
  return tabs
}

async function ensureDevServer() {
  try {
    const res = await fetch(BASE)
    if (res.ok || res.status < 500) return
  } catch {}
  console.log('개발 서버가 꺼져 있어 새로 띄웁니다...')
  const child = spawn('npm', ['run', 'dev', '--', '-p', '3000'], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE)
      if (res.ok || res.status < 500) return
    } catch {}
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('개발 서버가 30초 안에 뜨지 않았습니다.')
}

async function main() {
  mkdirSync(SHOTS_DIR, { recursive: true })

  const tabs = readTabs()
  if (tabs.length === 0) throw new Error('BottomTabBar.tsx에서 탭을 찾지 못했습니다.')

  await ensureDevServer()

  const { chromium } = resolvePlaywright()
  const executablePath = resolveChromiumExecutable()

  const browser = await chromium.launch({
    args: ['--no-sandbox'],
    ...(executablePath ? { executablePath } : {}),
  })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()

  // 1) 고정 프리뷰 계정으로 로그인 시도, 실패하면 회원가입 후 재시도
  await page.goto(`${BASE}/login`, { waitUntil: 'load' })
  await page.fill('input[type="text"]', PREVIEW_USERNAME)
  await page.fill('input[type="password"]', PREVIEW_PASSWORD)
  await page.click('button[type="submit"]')

  let loggedIn = false
  try {
    // 개발 서버 첫 컴파일(cold start)은 느릴 수 있어 넉넉하게 대기
    await page.waitForURL(BASE + '/', { timeout: 15000 })
    loggedIn = true
  } catch {}

  if (!loggedIn) {
    console.log('로그인 실패 → 프리뷰 계정 회원가입 시도...')
    await page.goto(`${BASE}/signup`, { waitUntil: 'load' })
    await page.fill('input[type="text"] >> nth=0', PREVIEW_USERNAME)
    await page.fill('input[type="password"]', PREVIEW_PASSWORD)
    await page.fill('input[type="text"] >> nth=1', PREVIEW_NICKNAME)
    await page.click('button[type="submit"]')
    await page.waitForURL(BASE + '/', { timeout: 20000 })
  }

  const headerReady = await page
    .waitForSelector('header:has-text("로그아웃")', { timeout: 8000 })
    .then(() => true)
    .catch(() => false)
  if (!headerReady) {
    console.warn(
      `경고: ${PREVIEW_USERNAME} 계정의 프로필(닉네임) 행이 없는 것 같습니다. 헤더가 로그인 상태로 안 뜰 수 있습니다.`
    )
  }

  // 2) 탭 페이지 순서대로 캡처
  const manifest: { key: string; label: string; file: string }[] = []
  for (let i = 0; i < tabs.length; i++) {
    const { href, label } = tabs[i]
    const key = `${i + 1}_${href === '/' ? 'home' : href.replace(/^\//, '').replace(/\//g, '-')}`
    await page.goto(BASE + href, { waitUntil: 'load' })
    // 헤더는 getUser() 비동기 확인 후에야 알림벨/로그아웃으로 바뀌므로 그 상태를 기다림
    await page
      .waitForSelector('header:has-text("로그아웃")', { timeout: 5000 })
      .catch(() => {})
    await page.waitForTimeout(500)
    const file = join(SHOTS_DIR, `${key}.png`)
    await page.screenshot({ path: file })
    manifest.push({ key, label, file })
  }

  await browser.close()

  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

  // 3) 파이썬(PIL)으로 그리드 이미지 합성
  const compose = spawnSync('python3', [join(ROOT, 'scripts/compose-overview.py')], {
    cwd: ROOT,
    stdio: 'inherit',
  })
  if (compose.status !== 0) throw new Error('이미지 합성(compose-overview.py) 실패')

  console.log('완료:', join(OUT_DIR, 'overview.png'))
}

main().catch((err) => {
  console.error('ERROR', err)
  process.exit(1)
})
