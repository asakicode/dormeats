'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Heart, MessagesSquare } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import { supabase } from '@/lib/supabase'
import { CATEGORY_LABEL, getCategoryLabel, type Category } from '@/lib/categories'
import { formatRelativeTime } from '@/lib/date'

type Post = {
  id: string
  title: string
  category: string | null
  is_anonymous: boolean
  like_count: number
  created_at: string
  author_nickname: string | null
}

export default function FreeBoardPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-6 py-16 text-muted-foreground">불러오는 중...</div>
      }
    >
      <FreeBoardPageInner />
    </Suspense>
  )
}

function FreeBoardPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const category = searchParams.get('category') ?? ''

  const [posts, setPosts] = useState<Post[]>([])
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

      let query = supabase
        .from('posts_view')
        .select(
          `
          id,
          title,
          category,
          is_anonymous,
          like_count,
          created_at,
          author_nickname
        `
        )
        .eq('board_type', 'free')
        .order('created_at', { ascending: false })

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      setPosts((data as unknown as Post[]) ?? [])
      setLoading(false)
    }

    load()
  }, [category, router])

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
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-3xl font-bold tracking-tight">자유게시판</h1>
        <Link
          href="/free-board/new"
          className="shrink-0 bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-hover transition-colors"
        >
          글쓰기
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-7 text-sm">
        <Link
          href="/free-board"
          className={`px-3.5 py-1.5 rounded-full font-medium transition-colors ${
            !category
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent-soft text-muted-foreground hover:text-foreground'
          }`}
        >
          전체
        </Link>
        {(Object.keys(CATEGORY_LABEL) as Category[]).map((key) => {
          const isActive = category === key
          return (
            <Link
              key={key}
              href={`/free-board?category=${key}`}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent-soft text-muted-foreground hover:text-foreground'
              }`}
            >
              {CATEGORY_LABEL[key]}
            </Link>
          )
        })}
      </div>

      {posts.length === 0 && (
        <EmptyState
          icon={MessagesSquare}
          title="아직 글이 없어요"
          description="첫 글을 남겨 보세요"
          action={{ href: '/free-board/new', label: '글쓰기' }}
        />
      )}

      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/free-board/${post.id}`} className="block py-3.5 border-b border-border">
              <span className="text-xs font-bold text-muted-foreground">{getCategoryLabel(post.category)}</span>
              <div className="mt-0.5 flex justify-between items-start gap-3">
                <span className="text-[15px] font-medium text-foreground">{post.title}</span>
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