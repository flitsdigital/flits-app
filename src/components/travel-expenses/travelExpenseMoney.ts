import type { TravelExpense } from '../../types'

export const RATE = 0.23

export function totalKm(e: TravelExpense) {
  return e.returnTrip ? e.kilometers * 2 : e.kilometers
}

export function amount(e: TravelExpense) {
  return totalKm(e) * RATE
}

export function fmt(n: number) {
  return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })
}
