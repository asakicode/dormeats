'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Soup, Calendar, MessageCircleHeart, MessagesSquare, Heart, User } from 'lucide-react'

const TABS = [
  { href: '/', label: '오늘', Icon: Soup },
  { href: '/week', label: '주간', Icon: Calendar },
  { href: '/board', label: '희망메뉴', Icon: MessageCircleHeart },
  { href: '/free-board', label: '자유', Icon: MessagesSquare },
  { href: '/favorites', label: '즐겨찾기', Icon: Heart },
  { href: '/mypage', label: '마이', Icon: User },
]

export default function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="max-w-xl mx-auto grid grid-cols-6 px-1.5 py-1.5">
        {TABS.map(({ href, label, Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center py-1"
            >
              <span
                className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-2xl transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}