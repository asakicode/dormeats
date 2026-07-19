'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Post = {
  id: string
  title: string
  board_type: string
  like_count: number
  created_at: string
}

type Favorite = {
  id: string
  menu_items: { id: string; name: string } | null
}

type Comment = {
  id: string
  content: string
  created_at: string
  post_id: string
  posts: { title: string; board_type: string } | null
}

const boardLink = (boardType: string, id: string) =>
  boardType === 'wish' ? `/board/${id}` : `/free-board/${id}`

const BOARD_LABEL: Record<string, string> = {
  wish: '희망메뉴',
  free: '자유게시판',
}

export default function MyPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
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

      const { data: profile } = await supabase
        .from('users')
        .select('nickname')
        .eq('id', user.id)
        .single()
      setNickname(profile?.nickname ?? '')

      const { data: myPosts } = await supabase
        .from('posts')
        .select('id, title, board_type, like_count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setPosts(myPosts ?? [])

      const { data: myComments } = await supabase
        .from('comments')
        .select('id, content, created_at, post_id, posts ( title, board_type )')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setComments((myComments as unknown as Comment[]) ?? [])
      const { data: myFavorites } = await supabase
        .from('favorites')
        .select('id, menu_items ( id, name )')
        .eq('user_id', user.id)
      setFavorites((myFavorites as unknown as Favorite[]) ?? [])

      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return <div className="p-10 text-gray-400">불러오는 중...</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">🙋 마이페이지</h1>
      <p className="text-gray-500 mb-8">{nickname}님</p>

      <section className="mb-10">
        <h2 className="font-semibold mb-3">내가 쓴 글 ({posts.length})</h2>
        {posts.length === 0 ? (
          <p className="text-gray-400 text-sm">아직 작성한 글이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  href={boardLink(post.board_type, post.id)}
                  className="block border rounded-lg p-3 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <span>
                      <span className="text-xs text-gray-400 mr-2">
                        [{BOARD_LABEL[post.board_type] ?? post.board_type}]
                      </span>
                      {post.title}
                    </span>
                    <span className="text-sm text-gray-400">
                      ❤️ {post.like_count}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(post.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-3">내가 쓴 댓글 ({comments.length})</h2>
        {comments.length === 0 ? (
          <p className="text-gray-400 text-sm">아직 작성한 댓글이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id}>
                <Link
                  href={boardLink(c.posts?.board_type ?? 'wish', c.post_id)}
                  className="block border rounded-lg p-3 hover:bg-gray-50"
                >
                  <p className="text-xs text-gray-400">
                    {c.posts?.title ?? '삭제된 글'}
                  </p>
                  <p className="text-sm mt-1">{c.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(c.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

    <section className="mt-10">
        <h2 className="font-semibold mb-3">즐겨찾기 메뉴 ({favorites.length})</h2>
        {favorites.length === 0 ? (
          <p className="text-gray-400 text-sm">아직 즐겨찾기한 메뉴가 없습니다.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {favorites.map((f) => (
              <li
                key={f.id}
                className="border rounded-full px-3 py-1 text-sm bg-red-50 border-red-200"
              >
                ❤️ {f.menu_items?.name}
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  )
}