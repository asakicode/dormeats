'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Comment = {
  id: string
  content: string
  is_anonymous: boolean
  created_at: string
  users: { nickname: string } | null
}

export default function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('id, content, is_anonymous, created_at, users ( nickname )')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    setComments((data as unknown as Comment[]) ?? [])
  }

  useEffect(() => {
    loadComments()
  }, [postId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert('로그인이 필요합니다.')
      setLoading(false)
      return
    }

    await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content,
      is_anonymous: isAnonymous,
    })

    setContent('')
    setIsAnonymous(false)
    await loadComments()
    setLoading(false)
  }

  return (
    <div>
      <h2 className="font-semibold mb-3">댓글 {comments.length}</h2>
      <ul className="space-y-3 mb-4">
        {comments.map((c) => (
          <li key={c.id} className="text-sm border-b pb-2">
            <span className="font-medium">
              {c.is_anonymous ? '익명' : c.users?.nickname ?? '알 수 없음'}
            </span>
            <span className="text-gray-400 ml-2">
              {new Date(c.created_at).toLocaleString('ko-KR')}
            </span>
            <p className="mt-1">{c.content}</p>
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 입력하세요"
          className="w-full border rounded-lg p-2 text-sm"
        />
        <div className="flex justify-between items-center">
          <label className="flex items-center gap-2 text-sm text-gray-500">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            익명으로 작성
          </label>
          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            등록
          </button>
        </div>
      </form>
    </div>
  )
}