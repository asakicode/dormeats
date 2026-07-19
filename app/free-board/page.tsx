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
      <div className="p-10">
        <h1 className="text-xl font-bold text-red-600">오류 발생 😢</h1>
        <p className="mt-2 text-sm text-gray-600">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">💬 자유게시판</h1>
        <Link
          href="/free-board/new"
          className="bg-black text-white px-4 py-2 rounded-lg text-sm"
        >
          글쓰기
        </Link>
      </div>

      <div className="flex gap-2 mb-6 text-sm">
        <Link
          href="/free-board"
          className={`px-3 py-1 rounded-full border ${
            !category ? 'bg-black text-white' : 'text-gray-600'
          }`}
        >
          전체
        </Link>
        {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
          <Link
            key={key}
            href={`/free-board?category=${key}`}
            className={`px-3 py-1 rounded-full border ${
              category === key ? 'bg-black text-white' : 'text-gray-600'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {posts?.length === 0 && (
        <p className="text-gray-400">아직 등록된 글이 없습니다.</p>
      )}

      <ul className="space-y-3">
        {posts?.map((post) => (
          <li key={post.id}>
            <Link
              href={`/free-board/${post.id}`}
              className="block border rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-gray-400 mr-2">
                    [{CATEGORY_LABEL[post.category ?? ''] ?? '기타'}]
                  </span>
                  <span className="font-semibold">{post.title}</span>
                </div>
                <span className="text-sm text-gray-400">
                  ❤️ {post.like_count}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {post.is_anonymous ? '익명' : post.users?.nickname ?? '알 수 없음'}
                {' · '}
                {new Date(post.created_at).toLocaleDateString('ko-KR')}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}