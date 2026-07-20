'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function FavoriteButton({ menuItemId }: { menuItemId: string }) {
  const [favorited, setFavorited] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('menu_item_id', menuItemId)
        .eq('user_id', user.id)
        .maybeSingle()

      setFavorited(!!data)
    }
    check()
  }, [menuItemId])

  const toggle = async () => {
    if (!userId) {
      alert('로그인이 필요합니다.')
      return
    }
    setLoading(true)
    if (favorited) {
      await supabase
        .from('favorites')
        .delete()
        .eq('menu_item_id', menuItemId)
        .eq('user_id', userId)
      setFavorited(false)
    } else {
      await supabase
        .from('favorites')
        .insert({ menu_item_id: menuItemId, user_id: userId })
      setFavorited(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-transform hover:scale-110 disabled:opacity-50 ${
        favorited ? 'bg-danger/10' : 'hover:bg-accent-soft'
      }`}
    >
      {favorited ? '❤️' : '🤍'}
    </button>
  )
}