'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LikeButton from '../../components/LikeButton'
import CommentSection from '../../components/CommentSection'
import DeletePostButton from '../../components/DeletePostButton'
import { getCategoryLabel } from '@/lib/categories'
import { formatRelativeTime } from '@/lib/date'

type Post = {
  id: string
  user_id: string
  title: string
  content: string
  category: string | null
  is_anonymous: boolean
  like_count: number
  created_at: string
  users: { nickname: string } | null
}

export default function FreePostDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFoundFlag, setNotFoundFlag] = useState(false)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('posts')
        .select(
          `
          id,
          user_id,
          title,
          content,
          category,
          is_anonymous,
          like_count,
          created_at,
          users ( nickname )
        `
        )
        .eq('id', params.id)
        .single()

      if (error || !data) {
        setNotFoundFlag(true)
        setLoading(false)
        return
      }

      setPost(data as unknown as Post)
      setLoading(false)
    }

    load()
  }, [params.id, router])

  if (loading) {
    return <div className="max-w-2xl mx-auto px-6 py-16 text-muted-foreground">불러오는 중...</div>
  }

  if (notFoundFlag || !post) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center text-muted-foreground">
        게시글을 찾을 수 없습니다.
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <span className="inline-block text-xs font-medium text-primary-hover mb-2">
        [{getCategoryLabel(post.category)}]
      </span>
      <h1 className="font-serif text-2xl font-bold tracking-tight mb-2">{post.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {post.is_anonymous ? '익명' : post.users?.nickname ?? '알 수 없음'}
        <span className="mx-1.5 text-border-strong">·</span>
        {formatRelativeTime(post.created_at)}
      </p>
      <p className="whitespace-pre-wrap leading-relaxed text-foreground/90 mb-7">
        {post.content}
      </p>
      <div className="flex items-center gap-4">
        <LikeButton postId={post.id} initialCount={post.like_count} authorId={post.user_id} />
        <DeletePostButton postId={post.id} authorId={post.user_id} boardType="free" />
      </div>
      <hr className="my-8 border-border" />
      <CommentSection postId={post.id} authorId={post.user_id} />
    </div>
  )
}