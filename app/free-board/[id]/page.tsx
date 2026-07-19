import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import LikeButton from '../../components/LikeButton'
import CommentSection from '../../components/CommentSection'
import DeletePostButton from '../../components/DeletePostButton'

const CATEGORY_LABEL: Record<string, string> = {
  restaurant: '식당',
  life: '생활',
  delivery: '택배',
  question: '질문',
}

export default async function FreePostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: post, error } = await supabase
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
    .eq('id', id)
    .single()
  if (error || !post) {
    notFound()
  }
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <span className="inline-block text-xs font-medium text-primary-hover mb-2">
        [{CATEGORY_LABEL[post.category ?? ''] ?? '기타'}]
      </span>
      <h1 className="font-serif text-2xl font-bold tracking-tight mb-2">{post.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {post.is_anonymous ? '익명' : post.users?.nickname ?? '알 수 없음'}
        <span className="mx-1.5 text-border-strong">·</span>
        {new Date(post.created_at).toLocaleDateString('ko-KR')}
      </p>
      <p className="whitespace-pre-wrap leading-relaxed text-foreground/90 mb-7">
        {post.content}
      </p>
      <div className="flex items-center gap-4">
        <LikeButton postId={post.id} initialCount={post.like_count} authorId={post.user_id} />
        <DeletePostButton postId={post.id} authorId={post.user_id} boardType="free" />
      </div>
      <hr className="my-8 border-border" />
      <CommentSection postId={post.id} />
    </div>
  )
}