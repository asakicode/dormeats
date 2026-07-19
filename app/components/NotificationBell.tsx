'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Notification = {
  id: string
  type: string
  post_id: string
  is_read: boolean
  created_at: string
  actor: { nickname: string } | null
  posts: { title: string; board_type: string } | null
}

const boardLink = (boardType: string, id: string) =>
  boardType === 'wish' ? `/board/${id}` : `/free-board/${id}`

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const load = async (uid: string) => {
    const { data } = await supabase
      .from('notifications')
      .select(
        'id, type, post_id, is_read, created_at, actor:actor_id ( nickname ), posts ( title, board_type )'
      )
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)

    setNotifications((data as unknown as Notification[]) ?? [])
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      load(user.id)
    })
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!userId) return null

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleOpen = async () => {
    setOpen(!open)
    if (!open && unreadCount > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative text-lg leading-none p-2 rounded-full text-foreground/70 hover:text-foreground hover:bg-surface-hover transition-colors"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-danger text-primary-foreground text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-surface">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-surface shadow-[0_4px_16px_rgba(36,26,16,0.06)] z-50 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">알림이 없습니다.</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={boardLink(n.posts?.board_type ?? 'wish', n.post_id)}
                    onClick={() => setOpen(false)}
                    className="block p-3 text-sm hover:bg-surface-hover transition-colors"
                  >
                    <span className="font-medium text-foreground">{n.actor?.nickname ?? '누군가'}</span>
                    <span className="text-foreground/80">
                      {n.type === 'comment' ? '님이 댓글을 남겼습니다: ' : '님이 좋아요를 눌렀습니다: '}
                    </span>
                    <span className="text-muted-foreground">{n.posts?.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}