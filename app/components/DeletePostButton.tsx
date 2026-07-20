'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DeletePostButton({
  postId,
  authorId,
  boardType,
}: {
  postId: string
  authorId: string
  boardType: 'wish' | 'free'
}) {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
    })
  })

  if (userId !== authorId) return null

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까? 삭제 후 되돌릴 수 없습니다.')) return
    setLoading(true)

    // 1. 삭제 전 원본 내용을 로그 테이블에 백업
    const { data: post } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (post) {
      await supabase.from('deleted_posts_log').insert({
        original_post_id: post.id,
        user_id: post.user_id,
        board_type: post.board_type,
        category: post.category,
        title: post.title,
        content: post.content,
        is_anonymous: post.is_anonymous,
      })
    }

    // 2. 실제 삭제
    const { error } = await supabase.from('posts').delete().eq('id', postId)

    if (error) {
      alert('삭제 실패: ' + error.message)
      setLoading(false)
      return
    }

    router.push(boardType === 'wish' ? '/board' : '/free-board')
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-danger underline disabled:opacity-50"
    >
      {loading ? '삭제 중...' : '삭제'}
    </button>
  )
}