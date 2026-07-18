import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import LikeButton from './LikeButton'
import CommentSection from './CommentSection'

export default async function PostDetailPage({
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
      title,
      content,
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
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {post.is_anonymous ? '익명' : post.users?.nickname ?? '알 수 없음'}
        {' · '}
        {new Date(post.created_at).toLocaleDateString('ko-KR')}
      </p>
      <p className="whitespace-pre-wrap mb-6">{post.content}</p>

      <LikeButton postId={post.id} initialCount={post.like_count} />

      <hr className="my-6" />

      <CommentSection postId={post.id} />
    </div>
  )
}