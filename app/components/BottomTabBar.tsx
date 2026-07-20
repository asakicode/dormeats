'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', label: '오늘', icon: '🍚' },
  { href: '/week', label: '주간', icon: '📅' },
  { href: '/board', label: '희망메뉴', icon: '🙋' },
  { href: '/free-board', label: '자유', icon: '💬' },
  { href: '/favorites', label: '즐겨찾기', icon: '❤️' },
  { href: '/mypage', label: '마이', icon: '👤' },
]

export default function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="max-w-xl mx-auto grid grid-cols-6">
        {TABS.map((tab) => {
          const isActive =
            tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}