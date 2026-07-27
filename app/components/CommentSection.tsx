'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatRelativeTime } from '@/lib/date'

type Comment = {
  id: string
  content: string
  is_anonymous: boolean
  created_at: string
  is_owner: boolean
  author_nickname: string | null
}

export default function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments_view')
      .select('id, content, is_anonymous, created_at, is_owner, author_nickname')
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

    await supabase.rpc('notify_post_owner', {
      p_post_id: postId,
      p_notif_type: 'comment',
      p_is_anonymous: isAnonymous,
    })

    setContent('')
    setIsAnonymous(false)
    await loadComments()
    setLoading(false)
  }

  const handleDelete = async (comment: Comment) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return

    const { error } = await supabase.rpc('delete_own_comment', {
      p_comment_id: comment.id,
    })

    if (error) {
      alert('삭제 실패: ' + error.message)
      return
    }

    await loadComments()
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        댓글 {comments.length}
      </h2>
      <ul className="space-y-2.5 mb-5">
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl border border-border bg-surface p-3.5 text-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-medium">
                  {c.is_anonymous ? '익명' : c.author_nickname ?? '알 수 없음'}
                </span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {formatRelativeTime(c.created_at)}
                </span>
              </div>
              {c.is_owner && (
                <button
                  onClick={() => handleDelete(c)}
                  className="text-xs text-danger underline"
                >
                  삭제
                </button>
              )}
            </div>
            <p className="mt-1 text-foreground/90">{c.content}</p>
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 입력하세요"
          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <div className="flex justify-between items-center">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="accent-primary"
            />
            익명으로 작성
          </label>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            등록
          </button>
        </div>
      </form>
    </div>
  )
}
