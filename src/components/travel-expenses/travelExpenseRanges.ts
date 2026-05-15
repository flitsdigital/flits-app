import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  subQuarters,
  subWeeks,
  format,
} from 'date-fns'
import { nl } from 'date-fns/locale'

export interface DateRange {
  start: Date
  end: Date
  label: string
}

export type TravelExpenseViewMode = 'week' | 'month'

export function travelExpenseRangePresets(now: Date): { label: string; range: DateRange }[] {
  return [
    { label: 'Deze week', range: { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }), label: 'Deze week' } },
    { label: 'Vorige week', range: { start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), end: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), label: 'Vorige week' } },
    { label: 'Deze maand', range: { start: startOfMonth(now), end: endOfMonth(now), label: format(now, 'MMMM yyyy', { locale: nl }) } },
    { label: 'Vorige maand', range: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)), label: format(subMonths(now, 1), 'MMMM yyyy', { locale: nl }) } },
    { label: '2 maanden geleden', range: { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(subMonths(now, 2)), label: format(subMonths(now, 2), 'MMMM yyyy', { locale: nl }) } },
    { label: 'Dit kwartaal', range: { start: startOfQuarter(now), end: endOfQuarter(now), label: 'Dit kwartaal' } },
    { label: 'Vorig kwartaal', range: { start: startOfQuarter(subQuarters(now, 1)), end: endOfQuarter(subQuarters(now, 1)), label: 'Vorig kwartaal' } },
    { label: 'Dit jaar', range: { start: startOfYear(now), end: endOfYear(now), label: String(now.getFullYear()) } },
  ]
}
