'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewPostPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setChecking(false)
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('로그인이 필요합니다.')
      setLoading(false)
      return
    }

    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        board_type: 'wish',
        title,
        content,
        is_anonymous: isAnonymous,
      })
      .select()
      .single()

    if (insertError || !newPost) {
      setError(insertError?.message ?? '글 작성에 실패했습니다.')
      setLoading(false)
      return
    }

    router.push(`/board/${newPost.id}`)
  }

  if (checking) {
    return <div className="max-w-2xl mx-auto px-6 py-16 text-muted-foreground">확인 중...</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl font-bold tracking-tight mb-7">희망메뉴 작성</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-border rounded-xl px-3.5 py-2.5 bg-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-border rounded-xl px-3.5 py-2.5 bg-surface h-32 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="accent-primary"
          />
          익명으로 작성
        </label>
        {error && <p className="text-danger text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {loading ? '작성 중...' : '작성하기'}
        </button>
      </form>
    </div>
  )
}