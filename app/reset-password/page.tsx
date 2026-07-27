'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirm) {
      setError('비밀번호가 서로 일치하지 않습니다.')
      return
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  if (!ready) {
    return (
      <div className="max-w-sm mx-auto px-6 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight mb-3">링크를 확인하는 중이에요</h1>
        <p className="text-sm text-muted-foreground">
          이 페이지는 이메일로 받은 비밀번호 재설정 링크를 통해서만 열 수 있어요. 잠시만 기다려주세요.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <h1 className="font-serif text-3xl font-bold tracking-tight mb-1.5">새 비밀번호 설정</h1>
      <p className="text-sm text-muted-foreground mb-9">새로 사용할 비밀번호를 입력해주세요</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">새 비밀번호</label>
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
          <label className="block text-sm font-medium mb-1.5">새 비밀번호 확인</label>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="w-full border border-border rounded-xl px-3.5 py-2.5 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            required
            minLength={8}
          />
        </div>
        {error && <p className="text-danger text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {loading ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>
    </div>
  )
}
