'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DeletePostButton({
  postId,
  isOwner,
  boardType,
}: {
  postId: string
  isOwner: boolean
  boardType: 'wish' | 'free'
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!isOwner) return null

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까? 삭제 후 되돌릴 수 없습니다.')) return
    setLoading(true)

    const { error } = await supabase.rpc('delete_own_post', { p_post_id: postId })

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
