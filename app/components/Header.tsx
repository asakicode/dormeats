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
      <div className="max-w-xl mx-auto px-5 py-3 flex justify-between items-center gap-4">
        <Link href="/" className="flex items-baseline gap-2 shrink-0">
          <span className="font-serif text-lg font-bold tracking-tight text-primary">
            🍚 DormEats
          </span>
          <span className="text-xs text-muted-foreground">도봉학사</span>
        </Link>

        <div className="flex items-center gap-3">
          {loading ? null : nickname ? (
            <>
              <NotificationBell />
              <span className="hidden sm:inline text-xs text-muted-foreground">
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
                className="text-xs font-medium text-foreground/70 hover:text-foreground transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 rounded-full font-semibold bg-primary text-primary-foreground text-xs hover:bg-primary-hover transition-colors"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}