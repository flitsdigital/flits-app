import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { TravelExpense, UserProfile } from '../../types'
import { amount, fmt, totalKm } from './travelExpenseMoney'

export function exportTravelExpensesCSV(
  expenses: TravelExpense[],
  clients: { id: string; companyName: string }[],
  users: UserProfile[],
  rangeLabel: string,
) {
  const headers = ['Datum', 'Van', 'Naar', 'Retour', 'Km (enkel)', 'Totaal km', 'Bedrag (€)', 'Klant', 'Gebruiker']
  const rows = expenses.map((e) => {
    const client = clients.find((c) => c.id === e.clientId)?.companyName ?? ''
    const user = users.find((u) => u.id === e.userId)
    const userName = user ? (user.name ?? user.email) : ''
    return [
      format(parseISO(e.date), 'd-M-yyyy'),
      e.from,
      e.to,
      e.returnTrip ? 'Ja' : 'Nee',
      e.kilometers.toString().replace('.', ','),
      totalKm(e).toString().replace('.', ','),
      amount(e).toFixed(2).replace('.', ','),
      client,
      userName,
    ]
  })

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n')

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reiskosten-${rangeLabel.replace(/\s/g, '-').toLowerCase()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportTravelExpensesPDF(
  expenses: TravelExpense[],
  clients: { id: string; companyName: string }[],
  users: UserProfile[],
  rangeLabel: string,
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Reiskosten overzicht', 14, 18)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text(`Periode: ${rangeLabel}`, 14, 26)
  doc.text(`Gegenereerd op: ${format(new Date(), 'd MMMM yyyy', { locale: nl })}`, 14, 32)

  const totalKmAll = expenses.reduce((s, e) => s + totalKm(e), 0)
  const totalAmountAll = expenses.reduce((s, e) => s + amount(e), 0)
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.text(`Totaal: ${totalKmAll} km  |  ${fmt(totalAmountAll)}`, 14, 42)

  const showUser = users.length > 0
  const head = [['Datum', 'Van', 'Naar', 'Retour', 'Km (enkel)', 'Totaal km', 'Bedrag', 'Klant', ...(showUser ? ['Gebruiker'] : [])]]
  const body = expenses.map((e) => {
    const client = clients.find((c) => c.id === e.clientId)?.companyName ?? '—'
    const user = users.find((u) => u.id === e.userId)
    return [
      format(parseISO(e.date), 'd MMM yyyy', { locale: nl }),
      e.from,
      e.to,
      e.returnTrip ? 'Ja' : 'Nee',
      `${e.kilometers} km`,
      `${totalKm(e)} km`,
      fmt(amount(e)),
      client,
      ...(showUser ? [user ? (user.name ?? user.email) : '—'] : []),
    ]
  })

  autoTable(doc, {
    head,
    body,
    startY: 48,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 6: { halign: 'right' } },
  })

  doc.save(`reiskosten-${rangeLabel.replace(/\s/g, '-').toLowerCase()}.pdf`)
}
