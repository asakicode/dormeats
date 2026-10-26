'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Soup, MessageCircleHeart, MessagesSquare, Heart, User } from 'lucide-react'

const TABS = [
  { href: '/', label: '식단', Icon: Soup },
  { href: '/board', label: '희망메뉴', Icon: MessageCircleHeart },
  { href: '/free-board', label: '자유', Icon: MessagesSquare },
  { href: '/favorites', label: '즐겨찾기', Icon: Heart },
  { href: '/mypage', label: '마이', Icon: User },
]

export default function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background">
      <div className="max-w-xl mx-auto grid grid-cols-5 px-1.5 py-1.5">
        {TABS.map(({ href, label, Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href} className="flex flex-col items-center justify-center py-1">
              <span
                className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 transition-colors ${
                  isActive ? 'text-foreground' : 'text-faint'
                }`}
              >
                <Icon size={19} strokeWidth={isActive ? 2.4 : 1.75} />
                <span className={`text-[10px] leading-none ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}