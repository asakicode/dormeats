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
      <button onClick={handleOpen} className="relative text-lg">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">알림이 없습니다.</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id} className="border-b last:border-b-0">
                  <Link
                    href={boardLink(n.posts?.board_type ?? 'wish', n.post_id)}
                    onClick={() => setOpen(false)}
                    className="block p-3 text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium">{n.actor?.nickname ?? '누군가'}</span>
                    {n.type === 'comment' ? '님이 댓글을 남겼습니다: ' : '님이 좋아요를 눌렀습니다: '}
                    <span className="text-gray-500">{n.posts?.title}</span>
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