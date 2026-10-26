import Link from 'next/link'
import { ChevronRight, Heart } from 'lucide-react'
import { formatRelativeTime } from '@/lib/date'
import type { TopPost } from '@/app/page'

export default function TopWishPost({ post }: { post: TopPost }) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] font-bold text-muted-foreground">희망메뉴 인기</h3>
        <Link href="/board" className="inline-flex items-center text-[13px] font-semibold">
          전체보기
          <ChevronRight size={14} />
        </Link>
      </div>
      <Link href={`/board/${post.id}`} className="flex gap-4 py-3 border-y border-border">
        <span className="text-[28px] font-extrabold leading-none tabular-nums">1</span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold">{post.title}</p>
          <p className="mt-1 text-[13px] text-muted-foreground line-clamp-2">{post.content}</p>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-faint">
              {post.is_anonymous ? '익명' : post.author_nickname ?? '알 수 없음'} · {formatRelativeTime(post.created_at)}
            </span>
            <span className="inline-flex items-center gap-1 font-bold tabular-nums">
              <Heart size={14} className="fill-like text-like" />
              {post.like_count}
            </span>
          </div>
        </div>
      </Link>
    </section>
  )
}
