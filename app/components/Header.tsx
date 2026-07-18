'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
    <header className="border-b p-4 flex justify-between items-center">
      <Link href="/" className="font-bold">
        🍚 DormEats
      </Link>
      <nav className="flex gap-4 items-center text-sm">
        <Link href="/week">주간식단</Link>
        {loading ? null : nickname ? (
          <>
            <span className="text-gray-500">{nickname}님</span>
            <button onClick={handleLogout} className="text-gray-500 underline">
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link href="/login">로그인</Link>
            <Link href="/signup">회원가입</Link>
          </>
        )}
      </nav>
    </header>
  )
}