import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default async function BoardPage() {
  const { data: posts, error } = await supabase
    .from('posts')
    .select(
      `
      id,
      title,
      is_anonymous,
      like_count,
      created_at,
      users ( nickname )
    `
    )
    .eq('board_type', 'wish')
    .order('created_at', { ascending: false })

  const { data: topPosts } = await supabase
    .from('posts')
    .select('id, title, like_count')
    .eq('board_type', 'wish')
    .gt('like_count', 0)
    .order('like_count', { ascending: false })
    .limit(5)

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
      <div className="flex justify-between items-center mb-7">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">희망메뉴 게시판</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">먹고 싶은 메뉴를 요청해보세요</p>
        </div>
        <Link
          href="/board/new"
          className="shrink-0 bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-hover transition-colors"
        >
          글쓰기
        </Link>
      </div>

      {topPosts && topPosts.length > 0 && (
        <div className="mb-8 rounded-2xl border border-accent-soft-border bg-accent-soft p-5">
          <h2 className="font-serif text-lg font-bold mb-3">실시간 TOP {topPosts.length}</h2>
          <ul className="space-y-2.5">
            {topPosts.map((post, idx) => (
              <li key={post.id}>
                <Link
                  href={`/board/${post.id}`}
                  className="flex items-center gap-3 group"
                >
                  <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-foreground group-hover:text-primary-hover transition-colors truncate">
                    {post.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    ❤️ {post.like_count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {posts?.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-8 text-center text-muted-foreground">
          아직 등록된 글이 없습니다.
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {posts?.map((post) => (
          <li key={post.id}>
            <Link
              href={`/board/${post.id}`}
              className="block rounded-2xl border border-border bg-surface p-4 transition-all hover:border-border-strong hover:shadow-[0_4px_16px_rgba(118,85,42,0.06)]"
            >
              <div className="flex justify-between items-start gap-3">
                <h2 className="font-semibold text-foreground">{post.title}</h2>
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