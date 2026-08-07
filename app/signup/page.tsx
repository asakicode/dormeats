'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Supabase Auth로 계정 생성
    // users 프로필 row는 DB의 handle_new_user() 트리거가 nickname을 받아 자동 생성함
    // (signUp 직후엔 세션이 없어 auth.uid()가 비어있으므로, 클라이언트에서 직접 insert할 수 없음)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname } },
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? '회원가입 실패')
      setLoading(false)
      return
    }

    // Confirm email이 꺼져 있으면 signUp이 세션을 바로 내려줌 → 인증 대기 없이 로그인 처리
    if (data.session) {
      router.push('/')
      router.refresh()
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto px-6 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight mb-3">이메일을 확인해주세요</h1>
        <p className="text-sm text-muted-foreground mb-7">
          {email}로 인증 메일을 보냈어요. 메일 속 링크를 눌러 인증을 완료하면 로그인할 수 있어요.
        </p>
        <Link href="/login" className="text-primary font-medium hover:text-primary-hover transition-colors">
          로그인하러 가기
        </Link>
      </div>
    )
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
        className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(118,85,42,0.04)]"
      >
        <div>
          <label className="block text-sm font-medium mb-1.5">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border rounded-xl px-3.5 py-2.5 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            required
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
            minLength={8}
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