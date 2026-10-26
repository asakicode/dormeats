import { getRelativeDayLabel, formatKoreanDate } from '@/lib/date'

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export default function DateStrip({
  weekDates,
  selectedDate,
  todayStr,
  effectiveDate,
  onSelect,
}: {
  weekDates: string[]
  selectedDate: string
  todayStr: string
  effectiveDate: string
  onSelect: (d: string) => void
}) {
  const label = getRelativeDayLabel(selectedDate, todayStr)
  return (
    <div className="mb-2">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          {label && <p className="text-[13px] font-bold text-muted-foreground mb-0.5">{label}</p>}
          <h1 className="text-[26px] font-bold tracking-[-0.03em] leading-tight">{formatKoreanDate(selectedDate)}</h1>
        </div>
        {selectedDate !== effectiveDate && (
          <button
            onClick={() => onSelect(effectiveDate)}
            className="shrink-0 rounded-full border border-border-strong px-3 py-1.5 text-xs font-semibold"
          >
            오늘로
          </button>
        )}
      </div>
      <div className="grid grid-cols-7 pb-3 border-b border-border">
        {weekDates.map((dateStr, i) => {
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === todayStr
          return (
            <button key={dateStr} onClick={() => onSelect(dateStr)} className="flex flex-col items-center gap-1">
              <span className="text-[11px] text-faint">{DAY_LABELS[i]}</span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground'
                }`}
              >
                {Number(dateStr.slice(8))}
              </span>
              <span className={`h-1 w-1 rounded-full ${isToday ? 'bg-foreground' : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
