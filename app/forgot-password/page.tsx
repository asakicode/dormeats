'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
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
          {email}로 비밀번호 재설정 링크를 보냈어요. 메일 속 링크를 눌러 새 비밀번호를 설정해주세요.
        </p>
        <Link href="/login" className="text-primary font-medium hover:text-primary-hover transition-colors">
          로그인으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <h1 className="font-serif text-3xl font-bold tracking-tight mb-1.5">비밀번호 찾기</h1>
      <p className="text-sm text-muted-foreground mb-9">가입한 이메일을 입력하면 재설정 링크를 보내드려요</p>
      <form onSubmit={handleSubmit} className="space-y-4">
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
        {error && <p className="text-danger text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {loading ? '전송 중...' : '재설정 링크 보내기'}
        </button>
      </form>
      <p className="mt-7 text-sm text-muted-foreground">
        <Link href="/login" className="text-primary font-medium hover:text-primary-hover transition-colors">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  )
}
