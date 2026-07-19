'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usernameToEmail } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const email = usernameToEmail(username)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <p className="text-2xl mb-1">🍚</p>
        <h1 className="font-serif text-2xl font-bold tracking-tight">로그인</h1>
      </div>
      <form
        onSubmit={handleLogin}
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
          />
        </div>
        {error && <p className="text-danger text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}