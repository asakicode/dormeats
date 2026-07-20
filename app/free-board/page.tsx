import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const CATEGORY_LABEL: Record<string, string> = {
  restaurant: '식당',
  life: '생활',
  delivery: '택배',
  question: '질문',
}

export default async function FreeBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams

  let query = supabase
    .from('posts')
    .select(
      `
      id,
      title,
      category,
      is_anonymous,
      like_count,
      created_at,
      users ( nickname )
    `
    )
    .eq('board_type', 'free')
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data: posts, error } = await query

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <h1 className="font-serif text-xl font-bold text-danger">오류 발생 😢</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-serif text-3xl font-bold tracking-tight">자유게시판</h1>
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
          className={`px-3.5 py-1.5 rounded-full border font-medium transition-colors ${
            !category
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
          }`}
        >
          전체
        </Link>
        {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
          <Link
            key={key}
            href={`/free-board?category=${key}`}
            className={`px-3.5 py-1.5 rounded-full border font-medium transition-colors ${
              category === key
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {posts?.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-8 text-center text-muted-foreground">
          아직 등록된 글이 없습니다.
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {posts?.map((post) => (
          <li key={post.id}>
            <Link
              href={`/free-board/${post.id}`}
              className="block rounded-2xl border border-border bg-surface p-4 transition-all hover:border-border-strong hover:shadow-[0_4px_16px_rgba(118,85,42,0.06)]"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <span className="text-xs font-medium text-primary-hover mr-2">
                    [{CATEGORY_LABEL[post.category ?? ''] ?? '기타'}]
                  </span>
                  <span className="font-semibold text-foreground">{post.title}</span>
                </div>
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                  ❤️ {post.like_count}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                {post.is_anonymous ? '익명' : post.users?.nickname ?? '알 수 없음'}
                <span className="mx-1.5 text-border-strong">·</span>
                {new Date(post.created_at).toLocaleDateString('ko-KR')}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}