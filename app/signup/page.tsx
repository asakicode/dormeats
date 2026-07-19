'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usernameToEmail } from '@/lib/auth'

export default function SignupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const email = usernameToEmail(username)

    // 1. Supabase Auth로 계정 생성
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? '회원가입 실패')
      setLoading(false)
      return
    }

    // 2. users 프로필 row 생성 (Auth의 id와 동일하게)
    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      nickname,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-16">
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft border border-accent-soft-border px-3 py-1 text-xs font-semibold text-primary-hover mb-4">
          🍚 도봉학사 식단 커뮤니티
        </span>
        <h1 className="font-serif text-2xl font-bold tracking-tight">회원가입</h1>
        <p className="text-sm text-muted-foreground mt-1">몇 가지 정보만 입력하면 바로 시작할 수 있어요</p>
      </div>
      <form
        onSubmit={handleSignup}
        className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(36,26,16,0.04)]"
      >
        <div>
          <label className="block text-sm font-medium mb-1.5">아이디</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-border rounded-xl px-3.5 py-2.5 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            required
            pattern="[a-zA-Z0-9]+"
            title="영문/숫자만 입력해주세요"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border rounded-xl px-3.5 py-2.5 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            required
            minLength={6}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">닉네임</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full border border-border rounded-xl px-3.5 py-2.5 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            required
          />
        </div>
        {error && <p className="text-danger text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {loading ? '가입 중...' : '가입하기'}
        </button>
      </form>
      <p className="mt-7 text-sm text-muted-foreground text-center">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-primary font-medium hover:text-primary-hover transition-colors">
          로그인
        </Link>
      </p>
    </div>
  )
}