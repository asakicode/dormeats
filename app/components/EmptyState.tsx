import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
        <Icon size={22} className="text-faint" />
      </div>
      <p className="mt-3 text-[15px] font-bold text-foreground">{title}</p>
      {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-4 rounded-full border border-border-strong px-4 py-2 text-sm font-semibold text-foreground"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
