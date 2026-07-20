'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Star } from 'lucide-react'

type Review = {
  id: string
  rating: number
  content: string | null
  created_at: string
  users: { nickname: string } | null
}

export default function ReviewSection({ mealId }: { mealId: string }) {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const loadReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, content, created_at, users ( nickname )')
      .eq('meal_id', mealId)
      .order('created_at', { ascending: false })

    setReviews((data as unknown as Review[]) ?? [])
  }

  useEffect(() => {
    loadReviews()
  }, [mealId])

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      alert('별점을 선택해주세요.')
      return
    }

    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert('로그인이 필요합니다.')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('reviews').insert({
      meal_id: mealId,
      user_id: user.id,
      rating,
      content: content.trim() || null,
    })

    if (error) {
      alert('후기 작성에 실패했습니다: ' + error.message)
      setLoading(false)
      return
    }

    setRating(0)
    setContent('')
    setOpen(false)
    await loadReviews()
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {avgRating ? (
            <>
              <Star size={14} className="inline fill-star text-star -mt-0.5" />
              <span className="font-semibold text-foreground ml-1">{avgRating}</span>
              <span className="ml-1">({reviews.length}개 후기)</span>
            </>
          ) : (
            '아직 후기 없음'
          )}
        </p>
        <button
          onClick={() => setOpen(!open)}
          className="text-sm font-medium text-primary-hover hover:underline"
        >
          {open ? '닫기' : '후기 작성'}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 rounded-xl border border-border bg-surface p-3.5">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setRating(n)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={22}
                  className={n <= rating ? 'fill-star text-star' : 'text-border-strong'}
                />
              </button>
            ))}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="후기를 남겨보세요 (선택)"
            className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-background h-16 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? '등록 중...' : '등록'}
          </button>
        </form>
      )}

      {reviews.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {reviews.map((r) => (
            <li key={r.id} className="text-sm rounded-xl border border-border bg-surface p-3">
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} size={12} className="fill-star text-star" />
                ))}
              </span>
              <span className="text-muted-foreground ml-2">
                {r.users?.nickname ?? '알 수 없음'}
              </span>
              {r.content && <p className="text-foreground/90 mt-0.5">{r.content}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}