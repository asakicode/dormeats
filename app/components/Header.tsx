'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NotificationBell from './NotificationBell'

export default function Header() {
  const router = useRouter()
  const [nickname, setNickname] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setNickname(null)
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('nickname')
        .eq('id', user.id)
        .single()

      setNickname(profile?.nickname ?? null)
      setLoading(false)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
      <div className="max-w-5xl mx-auto px-5 sm:px-6 py-3.5 flex justify-between items-center gap-4">
        <Link href="/" className="flex items-baseline gap-2 shrink-0">
          <span className="font-serif text-xl font-bold tracking-tight text-primary">
            🍚 DormEats
          </span>
          <span className="hidden sm:inline text-xs text-muted-foreground">도봉학사</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/week"
            className="relative py-2 font-medium text-foreground/70 hover:text-foreground transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform hover:after:scale-x-100"
          >
            주간식단
          </Link>
          <Link
            href="/board"
            className="relative py-2 font-medium text-foreground/70 hover:text-foreground transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform hover:after:scale-x-100"
          >
            희망메뉴
          </Link>
          <Link
            href="/free-board"
            className="relative py-2 font-medium text-foreground/70 hover:text-foreground transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform hover:after:scale-x-100"
          >
            자유게시판
          </Link>

          <span className="w-px h-5 bg-border" aria-hidden />

          {loading ? null : nickname ? (
            <>
              <NotificationBell />
              <Link
                href="/mypage"
                className="relative py-2 font-medium text-foreground/70 hover:text-foreground transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform hover:after:scale-x-100"
              >
                마이페이지
              </Link>
              <span className="px-3 py-1.5 rounded-full bg-accent-soft border border-accent-soft-border text-primary-hover text-xs font-semibold">
                {nickname}님
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="relative py-2 font-medium text-foreground/70 hover:text-foreground transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform hover:after:scale-x-100"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="ml-1 px-4 py-2 rounded-full font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}