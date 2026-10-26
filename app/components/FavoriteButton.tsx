'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Heart } from 'lucide-react'

// 같은 묶음(groupId)의 메뉴 중 하나라도 즐겨찾기했으면 채워서 보여준다
async function fetchFavoriteRows(userId: string, menuItemId: string, groupId: string | null) {
  if (!groupId) {
    const { data } = await supabase
      .from('favorites')
      .select('id, menu_item_id')
      .eq('menu_item_id', menuItemId)
      .eq('user_id', userId)
    return data ?? []
  }

  const { data } = await supabase
    .from('favorites')
    .select('id, menu_item_id, menu_items!inner(group_id)')
    .eq('user_id', userId)
    .eq('menu_items.group_id', groupId)
  return data ?? []
}

export default function FavoriteButton({
  menuItemId,
  groupId,
  onToggle,
}: {
  menuItemId: string
  groupId: string | null
  onToggle?: (favorited: boolean, removedMenuItemIds: string[]) => void
}) {
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

      const rows = await fetchFavoriteRows(user.id, menuItemId, groupId)
      setFavorited(rows.length > 0)
    }
    check()
  }, [menuItemId, groupId])

  const toggle = async () => {
    if (!userId) {
      alert('로그인이 필요합니다.')
      return
    }
    setLoading(true)
    if (favorited) {
      // 끄면 같은 묶음의 즐겨찾기를 모두 해제
      const rows = await fetchFavoriteRows(userId, menuItemId, groupId)
      if (rows.length > 0) {
        await supabase
          .from('favorites')
          .delete()
          .in('id', rows.map((row) => row.id))
      }
      setFavorited(false)
      onToggle?.(false, rows.map((row) => row.menu_item_id))
    } else {
      // 이미 있으면 유니크 위반이 나지만 결과는 같으므로 성공으로 본다
      await supabase
        .from('favorites')
        .insert({ menu_item_id: menuItemId, user_id: userId })
      setFavorited(true)
      onToggle?.(true, [])
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110 disabled:opacity-50 ${
        'hover:bg-accent-soft'
      }`}
    >
      <Heart
        size={16}
        strokeWidth={2.2}
        className={favorited ? 'fill-like text-like' : 'text-faint'}
      />
    </button>
  )
}
