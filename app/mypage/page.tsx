'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { cleanMenuName } from '@/lib/menu'

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
  post_title: string | null
  post_board_type: string | null
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
        .from('posts_view')
        .select('id, title, board_type, like_count, created_at')
        .eq('is_owner', true)
        .order('created_at', { ascending: false })
      setPosts(myPosts ?? [])

      const { data: myComments } = await supabase
        .from('comments_view')
        .select('id, content, created_at, post_id, post_title, post_board_type')
        .eq('is_owner', true)
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
      {/* 프로필 */}
      <div className="flex items-center gap-3.5 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shrink-0">
          {nickname.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-lg font-bold">{nickname}</h1>
          <p className="text-[13px] text-muted-foreground">{dorm}</p>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 py-4 border-y border-border mb-5">
        <div>
          <p className="text-[22px] font-bold tabular-nums">{posts.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">작성한 글</p>
        </div>
        <div>
          <p className="text-[22px] font-bold tabular-nums">{totalLikes}</p>
          <p className="text-xs text-muted-foreground mt-0.5">좋아요 받은 수</p>
        </div>
        <div>
          <p className="text-[22px] font-bold tabular-nums">{reviewCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">후기 작성</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-border mb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm transition-colors ${
              activeTab === tab.key
                ? 'text-foreground font-bold border-b-2 border-foreground -mb-px'
                : 'text-muted-foreground hover:text-foreground'
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
            <p className="text-muted-foreground text-sm">아직 작성한 글이 없습니다.</p>
          ) : (
            <ul>
              {posts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={boardLink(post.board_type, post.id)}
                    className="block py-3.5 border-b border-border hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span>
                        <span className="text-xs font-bold text-muted-foreground mr-2">
                          [{BOARD_LABEL[post.board_type] ?? post.board_type}]
                        </span>
                        {post.title}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
                        <Heart className="w-3.5 h-3.5 fill-like text-like" />
                        {post.like_count}
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
            <p className="text-muted-foreground text-sm">아직 작성한 댓글이 없습니다.</p>
          ) : (
            <ul>
              {comments.map((c) => (
                <li key={c.id}>
                  <Link
                    href={boardLink(c.post_board_type ?? 'wish', c.post_id)}
                    className="block py-3.5 border-b border-border hover:bg-surface-hover transition-colors"
                  >
                    <p className="text-xs text-muted-foreground">{c.post_title ?? '삭제된 글'}</p>
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
            <p className="text-muted-foreground text-sm">아직 즐겨찾기한 메뉴가 없습니다.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {favorites.map((f) => (
                <li
                  key={f.id}
                  className="rounded-full px-3.5 py-1.5 text-sm bg-accent-soft text-foreground font-medium"
                >
                  {f.menu_items ? cleanMenuName(f.menu_items.name) : ''}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}