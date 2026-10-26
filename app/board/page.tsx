'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, MessageCircleHeart } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import { supabase } from '@/lib/supabase'
import { formatRelativeTime } from '@/lib/date'

type Post = {
  id: string
  title: string
  is_anonymous: boolean
  like_count: number
  created_at: string
  author_nickname: string | null
}

export default function BoardPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [topPosts, setTopPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: postsData, error: postsError } = await supabase
        .from('posts_view')
        .select(
          `
          id,
          title,
          is_anonymous,
          like_count,
          created_at,
          author_nickname
        `
        )
        .eq('board_type', 'wish')
        .order('created_at', { ascending: false })

      if (postsError) {
        setError(postsError.message)
        setLoading(false)
        return
      }

      const { data: topData } = await supabase
        .from('posts_view')
        .select('id, title, like_count, is_anonymous, created_at, author_nickname')
        .eq('board_type', 'wish')
        .gt('like_count', 0)
        .order('like_count', { ascending: false })
        .limit(5)

      setPosts((postsData as unknown as Post[]) ?? [])
      setTopPosts((topData as unknown as Post[]) ?? [])
      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return <div className="max-w-2xl mx-auto px-6 py-16 text-muted-foreground">불러오는 중...</div>
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <h1 className="text-xl font-bold text-danger">오류가 발생했어요</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-7">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">희망메뉴 게시판</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">먹고 싶은 메뉴를 요청해보세요</p>
        </div>
        <Link
          href="/board/new"
          className="shrink-0 bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-hover transition-colors"
        >
          글쓰기
        </Link>
      </div>

      {topPosts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-faint mb-1">실시간 TOP {topPosts.length}</h2>
          <ul>
            {topPosts.map((post, idx) => (
              <li key={post.id}>
                <Link href={`/board/${post.id}`} className="flex items-center gap-3 py-3 border-b border-border">
                  <span className="w-5 shrink-0 text-base font-extrabold tabular-nums">{idx + 1}</span>
                  <span className="flex-1 text-[15px] font-medium text-foreground truncate">{post.title}</span>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold tabular-nums">
                    <Heart size={13} className="fill-like text-like" />
                    {post.like_count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {posts.length === 0 && (
        <EmptyState
          icon={MessageCircleHeart}
          title="아직 희망메뉴가 없어요"
          description="먹고 싶은 메뉴를 처음으로 올려 보세요"
          action={{ href: '/board/new', label: '글쓰기' }}
        />
      )}

      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/board/${post.id}`} className="block py-3.5 border-b border-border">
              <div className="flex justify-between items-start gap-3">
                <h2 className="text-[15px] font-medium text-foreground">{post.title}</h2>
                <span className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                  <Heart size={13} className={post.like_count > 0 ? 'fill-like text-like' : 'text-faint'} />
                  {post.like_count}
                </span>
              </div>
              <p className="mt-1 text-xs text-faint">
                {post.is_anonymous ? '익명' : post.author_nickname ?? '알 수 없음'}
                <span className="mx-1.5">·</span>
                {formatRelativeTime(post.created_at)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}