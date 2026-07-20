'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Favorite = {
  id: string
  menu_items: { id: string; name: string } | null
}

export default function FavoritesPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('favorites')
        .select('id, menu_items ( id, name )')
        .eq('user_id', user.id)

      setFavorites((data as unknown as Favorite[]) ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return <div className="max-w-xl mx-auto px-6 py-16 text-muted-foreground">불러오는 중...</div>
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className="font-serif text-3xl font-bold tracking-tight mb-1">즐겨찾기 메뉴</h1>
      <p className="text-sm text-muted-foreground mb-7">{favorites.length}개 등록됨</p>

      {favorites.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-8 text-center text-muted-foreground">
          아직 즐겨찾기한 메뉴가 없습니다. 오늘의 식단에서 하트를 눌러보세요.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {favorites.map((f) => (
            <li
              key={f.id}
              className="border rounded-full px-3.5 py-1.5 text-sm bg-danger/10 border-danger/20 text-danger font-medium"
            >
              ❤️ {f.menu_items?.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}