'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LikeButton({
  postId,
  initialCount,
}: {
  postId: string
  initialCount: number
}) {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle()

      setLiked(!!data)
    }
    check()
  }, [postId])

  const toggleLike = async () => {
    if (!userId) {
      alert('로그인이 필요합니다.')
      return
    }

    if (liked) {
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
      await supabase
        .from('posts')
        .update({ like_count: count - 1 })
        .eq('id', postId)
      setLiked(false)
      setCount((c) => c - 1)
      router.refresh()
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: userId })
      await supabase
        .from('posts')
        .update({ like_count: count + 1 })
        .eq('id', postId)
      setLiked(true)
      setCount((c) => c + 1)
      router.refresh()
    }
  }

  return (
    <button
      onClick={toggleLike}
      className={`px-4 py-2 rounded-lg border text-sm ${
        liked ? 'bg-red-50 border-red-300 text-red-600' : 'border-gray-300'
      }`}
    >
      {liked ? '❤️' : '🤍'} {count}
    </button>
  )
}