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

type Comment = {
  id: string
  content: string
  created_at: string
  post_id: string
  posts: { title: string; board_type: string } | null
}

type Favorite = {
  id: string
  menu_items: { id: string; name: string } | null
}

const boardLink = (boardType: string, id: string) =>
  boardType === 'wish' ? `/board/${id}` : `/free-board/${id}`

const BOARD_LABEL: Record<string, string> = {
  wish: '희망메뉴',
  free: '자유게시판',
}

const TABS = [
  { key: 'posts', label: '글' },
  { key: 'comments', label: '댓글' },
  { key: 'favorites', label: '즐겨찾기' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function MyPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [dorm, setDorm] = useState('도봉학사')
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [reviewCount, setReviewCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('posts')

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
        .select('nickname, dorm')
        .eq('id', user.id)
        .single()
      setNickname(profile?.nickname ?? '')
      setDorm(profile?.dorm ?? '도봉학사')

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

      const { count } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      setReviewCount(count ?? 0)

      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return <div className="max-w-xl mx-auto px-6 py-16 text-muted-foreground">불러오는 중...</div>
  }

  const totalLikes = posts.reduce((sum, p) => sum + p.like_count, 0)

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      {/* 프로필 카드 */}
      <div className="rounded-2xl border border-accent-soft-border bg-accent-soft p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-serif font-bold shrink-0">
            {nickname.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold">{nickname}</h1>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-surface text-primary-hover border border-accent-soft-border font-medium">
              {dorm}
            </span>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-accent-soft-border">
          <div className="text-center">
            <p className="font-serif text-lg font-bold">{posts.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">작성한 글</p>
          </div>
          <div className="text-center">
            <p className="font-serif text-lg font-bold">{totalLikes}</p>
            <p className="text-xs text-muted-foreground mt-0.5">좋아요 받은 수</p>
          </div>
          <div className="text-center">
            <p className="font-serif text-lg font-bold">{reviewCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">후기 작성</p>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'posts' && (
        <>
          {posts.length === 0 ? (
            <p className="text-gray-400 text-sm">아직 작성한 글이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {posts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={boardLink(post.board_type, post.id)}
                    className="block rounded-2xl border border-border bg-surface p-4 hover:border-border-strong transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span>
                        <span className="text-xs text-muted-foreground mr-2">
                          [{BOARD_LABEL[post.board_type] ?? post.board_type}]
                        </span>
                        {post.title}
                      </span>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        ❤️ {post.like_count}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(post.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {activeTab === 'comments' && (
        <>
          {comments.length === 0 ? (
            <p className="text-gray-400 text-sm">아직 작성한 댓글이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id}>
                  <Link
                    href={boardLink(c.posts?.board_type ?? 'wish', c.post_id)}
                    className="block rounded-2xl border border-border bg-surface p-4 hover:border-border-strong transition-colors"
                  >
                    <p className="text-xs text-muted-foreground">{c.posts?.title ?? '삭제된 글'}</p>
                    <p className="text-sm mt-1">{c.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(c.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {activeTab === 'favorites' && (
        <>
          {favorites.length === 0 ? (
            <p className="text-gray-400 text-sm">아직 즐겨찾기한 메뉴가 없습니다.</p>
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
        </>
      )}
    </div>
  )
}