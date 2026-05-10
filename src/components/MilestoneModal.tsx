import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStore } from '@/store/useStore'
import type { ClientInvoice, ClientInvoiceStatus } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  clientId: string
  initial?: ClientInvoice
  /** Voor project: totaalbudget (percentage → bedrag) */
  budget?: number
  onSaved: () => void
}

export function MilestoneModal({
  open,
  onClose,
  clientId,
  initial,
  budget,
  onSaved,
}: Props) {
  const addClientInvoice = useStore((s) => s.addClientInvoice)
  const updateClientInvoice = useStore((s) => s.updateClientInvoice)

  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState(0)
  const [percentage, setPercentage] = useState<number | ''>('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<ClientInvoiceStatus>('planned')

  useEffect(() => {
    if (open) {
      if (initial) {
        setLabel(initial.label)
        setAmount(initial.amount)
        setPercentage(initial.percentage ?? '')
        setDueDate(initial.dueDate)
        setStatus(initial.status)
      } else {
        setLabel('')
        setAmount(0)
        setPercentage('')
        setDueDate(new Date().toISOString().slice(0, 10))
        setStatus('planned')
      }
    }
  }, [open, initial])

  function applyPercentage() {
    if (typeof percentage === 'number' && budget && budget > 0) {
      setAmount(Math.round((budget * percentage) / 100))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !dueDate) return
    if (initial) {
      await updateClientInvoice(initial.id, {
        label: label.trim(),
        amount,
        percentage: typeof percentage === 'number' ? percentage : undefined,
        dueDate,
        status,
      })
    } else {
      await addClientInvoice({
        clientId,
        label: label.trim(),
        amount,
        percentage: typeof percentage === 'number' ? percentage : undefined,
        dueDate,
        status,
      })
    }
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Termijn bewerken' : 'Termijn / factuur'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="ms-label">Label</Label>
            <Input id="ms-label" value={label} onChange={(e) => setLabel(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ms-pct">% van budget (optioneel)</Label>
              <Input
                id="ms-pct"
                type="number"
                min={0}
                max={100}
                value={percentage === '' ? '' : percentage}
                onChange={(e) => {
                  const v = e.target.value
                  setPercentage(v === '' ? '' : parseFloat(v) || 0)
                }}
                onBlur={applyPercentage}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-amt">Bedrag (€)</Label>
              <Input
                id="ms-amt"
                type="number"
                min={0}
                step={0.01}
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ms-due">Vervaldatum</Label>
            <Input id="ms-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ClientInvoiceStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Gepland</SelectItem>
                <SelectItem value="sent">Verzonden</SelectItem>
                <SelectItem value="paid">Betaald</SelectItem>
                <SelectItem value="overdue">Achterstallig</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit">Opslaan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
