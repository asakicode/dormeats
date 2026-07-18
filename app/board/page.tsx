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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🙋 희망메뉴 게시판</h1>
        <Link
          href="/board/new"
          className="bg-black text-white px-4 py-2 rounded-lg text-sm"
        >
          글쓰기
        </Link>
      </div>

      {posts?.length === 0 && (
        <p className="text-gray-400">아직 등록된 글이 없습니다.</p>
      )}

      <ul className="space-y-3">
        {posts?.map((post) => (
          <li key={post.id}>
            <Link
              href={`/board/${post.id}`}
              className="block border rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <h2 className="font-semibold">{post.title}</h2>
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