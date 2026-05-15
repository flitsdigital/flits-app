import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  format,
  isToday,
  parseISO,
} from 'date-fns'
import { nl } from 'date-fns/locale'
import clsx from 'clsx'
import { Plus, Check, ArrowRight, RotateCcw } from 'lucide-react'
import type { TravelExpense, UserProfile } from '../../types'
import type { DateRange } from './travelExpenseRanges'
import { amount, fmt, totalKm } from './travelExpenseMoney'

export function TravelWeekView({ expenses, range, clients, users, isAdmin, onEdit, onDayClick, selectMode, selectedDates, onDateToggle }: {
  expenses: TravelExpense[]
  range: DateRange
  clients: { id: string; companyName: string }[]
  users: UserProfile[]
  isAdmin: boolean
  onEdit: (e: TravelExpense) => void
  onDayClick: (date: string) => void
  selectMode: boolean
  selectedDates: Set<string>
  onDateToggle: (date: string) => void
}) {
  const days = eachDayOfInterval({ start: range.start, end: range.end })

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border-subtle">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayExpenses = expenses.filter((e) => isSameDay(parseISO(e.date), day))
          const dayKm = dayExpenses.reduce((s, e) => s + totalKm(e), 0)
          const selected = selectedDates.has(dateStr)
          return (
            <div key={day.toISOString()} className={clsx('px-3 py-3 border-r border-border-subtle last:border-r-0 relative', isToday(day) && 'bg-accent-blue/5', selected && 'bg-accent-blue/10')}>
              <p className={clsx('text-xs font-medium mb-0.5', isToday(day) || selected ? 'text-accent-blue' : 'text-text-muted')}>
                {format(day, 'EEE', { locale: nl })}
              </p>
              <p className={clsx('text-lg font-semibold leading-none', isToday(day) || selected ? 'text-accent-blue' : 'text-text-primary')}>
                {format(day, 'd')}
              </p>
              {dayKm > 0 && <p className="text-xs text-text-muted mt-1">{dayKm} km</p>}
              {selected && <div className="absolute top-2 right-2 w-4 h-4 bg-accent-blue rounded-full flex items-center justify-center"><Check size={10} className="text-white" /></div>}
            </div>
          )
        })}
      </div>

      {/* Day content */}
      <div className="grid grid-cols-7 min-h-32">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayExpenses = expenses.filter((e) => isSameDay(parseISO(e.date), day))
          const selected = selectedDates.has(dateStr)
          return (
            <div
              key={day.toISOString()}
              onClick={() => selectMode ? onDateToggle(dateStr) : onDayClick(dateStr)}
              className={clsx(
                'border-r border-border-subtle last:border-r-0 p-2 space-y-1.5 cursor-pointer group/day transition-colors',
                isToday(day) && 'bg-accent-blue/[0.03]',
                selected && 'bg-accent-blue/[0.06] border-accent-blue/30',
              )}
            >
              {dayExpenses.map((e) => {
                const user = isAdmin ? users.find((u) => u.id === e.userId) : null
                return (
                  <div key={e.id} className="bg-blue-500/10 border border-blue-500/20 rounded-md px-2 py-1.5 cursor-pointer hover:bg-blue-500/20 transition-colors" onClick={(ev) => { ev.stopPropagation(); onEdit(e) }}>
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium text-blue-300 truncate flex-1">{e.from} → {e.to}</p>
                      {e.returnTrip && <RotateCcw size={10} className="text-blue-400 flex-shrink-0" />}
                    </div>
                    {user && <p className="text-xs text-blue-400/70 truncate">{user.name ?? user.email}</p>}
                    <p className="text-xs text-blue-300 font-medium mt-0.5">{totalKm(e)} km · {fmt(amount(e))}</p>
                  </div>
                )
              })}
              {!selectMode && (
                <div className="opacity-0 group-hover/day:opacity-100 transition-opacity flex items-center justify-center py-1">
                  <span className="text-xs text-text-muted flex items-center gap-1"><Plus size={10} /> Rit</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Agenda view (mobile) ─────────────────────────────────────────────────────

export function TravelAgendaView({ expenses, range, clients, users, isAdmin, onEdit, onDayClick, selectMode, selectedDates, onDateToggle }: {
  expenses: TravelExpense[]
  range: DateRange
  clients: { id: string; companyName: string }[]
  users: UserProfile[]
  isAdmin: boolean
  onEdit: (e: TravelExpense) => void
  onDayClick: (date: string) => void
  selectMode: boolean
  selectedDates: Set<string>
  onDateToggle: (date: string) => void
}) {
  const days = eachDayOfInterval({ start: range.start, end: range.end })
  const daysWithData = days.filter((d) => {
    if (selectMode) return true
    return expenses.some((e) => isSameDay(parseISO(e.date), d))
  })
  const visibleDays = daysWithData.length > 0 ? daysWithData : days

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden divide-y divide-border-subtle">
      {visibleDays.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayExpenses = expenses.filter((e) => isSameDay(parseISO(e.date), day))
        const dayKm = dayExpenses.reduce((s, e) => s + totalKm(e), 0)
        const dayAmount = dayExpenses.reduce((s, e) => s + amount(e), 0)
        const selected = selectedDates.has(dateStr)
        const today = isToday(day)
        return (
          <div key={day.toISOString()} className={clsx('px-4 py-3', selected && 'bg-accent-blue/[0.06]')}>
            <button
              type="button"
              onClick={() => selectMode ? onDateToggle(dateStr) : onDayClick(dateStr)}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                {selectMode && (
                  <div className={clsx(
                    'w-5 h-5 rounded border flex items-center justify-center shrink-0',
                    selected ? 'bg-accent-blue border-accent-blue' : 'border-border-default'
                  )}>
                    {selected && <Check size={12} className="text-white" />}
                  </div>
                )}
                <div className={clsx('flex flex-col items-center justify-center w-10 h-10 rounded-md shrink-0', today ? 'bg-accent-blue text-white' : 'bg-surface-2 text-text-primary')}>
                  <span className="text-[10px] uppercase font-medium leading-none opacity-80">{format(day, 'EEE', { locale: nl })}</span>
                  <span className="text-sm font-semibold leading-none mt-0.5">{format(day, 'd')}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{format(day, 'EEEE d MMMM', { locale: nl })}</p>
                  {dayExpenses.length > 0 ? (
                    <p className="text-xs text-text-muted">{dayKm} km · {fmt(dayAmount)}</p>
                  ) : (
                    <p className="text-xs text-text-muted">{selectMode ? 'Tik om te selecteren' : 'Geen ritten'}</p>
                  )}
                </div>
              </div>
              {!selectMode && dayExpenses.length === 0 && (
                <Plus size={16} className="text-text-muted shrink-0" />
              )}
            </button>

            {dayExpenses.length > 0 && !selectMode && (
              <div className="mt-2 space-y-1.5 pl-[52px]">
                {dayExpenses.map((e) => {
                  const client = clients.find((c) => c.id === e.clientId)
                  const user = isAdmin ? users.find((u) => u.id === e.userId) : null
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onEdit(e)}
                      className="w-full text-left bg-surface-2 hover:bg-white/[0.04] border border-border-subtle rounded-md px-3 py-2 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 text-sm text-text-primary">
                        <span className="truncate">{e.from}</span>
                        <ArrowRight size={11} className="text-text-muted shrink-0" />
                        <span className="truncate">{e.to}</span>
                        {e.returnTrip && <RotateCcw size={10} className="text-text-muted shrink-0 ml-auto" />}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1 text-xs text-text-muted">
                        <span className="truncate">
                          {totalKm(e)} km{e.returnTrip ? ` (${e.kilometers}×2)` : ''}
                          {client && ` · ${client.companyName}`}
                          {user && ` · ${user.name ?? user.email}`}
                        </span>
                        <span className="text-text-primary font-medium shrink-0">{fmt(amount(e))}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      {visibleDays.length === 0 && (
        <div className="px-4 py-8 text-center text-xs text-text-muted">Geen ritten in deze periode</div>
      )}
    </div>
  )
}

// ─── Month view ───────────────────────────────────────────────────────────────

export function TravelMonthView({ expenses, range, clients, users, isAdmin, onEdit, onDayClick, selectMode, selectedDates, onDateToggle }: {
  expenses: TravelExpense[]
  range: DateRange
  clients: { id: string; companyName: string }[]
  users: UserProfile[]
  isAdmin: boolean
  onEdit: (e: TravelExpense) => void
  onDayClick: (date: string) => void
  selectMode: boolean
  selectedDates: Set<string>
  onDateToggle: (date: string) => void
}) {
  const monthStart = startOfMonth(range.start)
  const monthEnd = endOfMonth(range.start)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  const DAY_LABELS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b border-border-subtle">
        {DAY_LABELS.map((d) => (
          <div key={d} className="px-3 py-2 text-center text-xs font-medium text-text-muted border-r border-border-subtle last:border-r-0">{d}</div>
        ))}
      </div>
      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-border-subtle last:border-b-0">
          {week.map((day) => {
            const inMonth = day >= monthStart && day <= monthEnd
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayExpenses = expenses.filter((e) => isSameDay(parseISO(e.date), day))
            const dayKm = dayExpenses.reduce((s, e) => s + totalKm(e), 0)
            const selected = selectedDates.has(dateStr)
            return (
              <div
                key={day.toISOString()}
                onClick={() => {
                  if (!inMonth) return
                  selectMode ? onDateToggle(dateStr) : onDayClick(dateStr)
                }}
                className={clsx(
                  'min-h-20 p-2 border-r border-border-subtle last:border-r-0 group/day transition-colors',
                  inMonth ? 'cursor-pointer' : 'opacity-30',
                  isToday(day) && 'bg-accent-blue/[0.04]',
                  selected && 'bg-accent-blue/[0.08] border-accent-blue/30',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className={clsx('text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                    selected ? 'bg-accent-blue text-white' : isToday(day) ? 'bg-accent-blue text-white' : 'text-text-muted'
                  )}>
                    {format(day, 'd')}
                  </p>
                  {selected && !isToday(day) && <Check size={11} className="text-accent-blue flex-shrink-0" />}
                </div>
                {dayExpenses.map((e) => {
                  const user = isAdmin ? users.find((u) => u.id === e.userId) : null
                  return (
                    <div key={e.id} onClick={(ev) => { ev.stopPropagation(); onEdit(e) }} className="bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-1 mb-1 cursor-pointer hover:bg-blue-500/20 transition-colors">
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-blue-300 truncate font-medium flex-1">{e.from} → {e.to}</p>
                        {e.returnTrip && <RotateCcw size={9} className="text-blue-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-blue-400/70 truncate">{totalKm(e)} km{user ? ` · ${user.name ?? user.email}` : ''}</p>
                    </div>
                  )
                })}
                {dayKm > 0 && dayExpenses.length > 1 && (
                  <p className="text-xs text-text-muted mt-0.5">{fmt(dayExpenses.reduce((s, e) => s + amount(e), 0))}</p>
                )}
                {inMonth && !selectMode && (
                  <div className="opacity-0 group-hover/day:opacity-100 transition-opacity flex items-center justify-center py-0.5 mt-0.5">
                    <span className="text-xs text-text-muted flex items-center gap-1"><Plus size={10} /> Rit</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
