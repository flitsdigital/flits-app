import { AlertTriangle, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  title?: string
  description?: string
  /** Naam van het item dat verwijderd wordt — wordt vet getoond in de omschrijving */
  itemName?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title = 'Weet je het zeker?',
  description,
  itemName,
  confirmLabel = 'Bevestigen',
  cancelLabel = 'Annuleren',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {destructive && (
              <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 size={15} className="text-red-400" />
              </div>
            )}
            {!destructive && (
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle size={15} className="text-orange-400" />
              </div>
            )}
            <div>
              <DialogTitle className="leading-snug">{title}</DialogTitle>
              {(description || itemName) && (
                <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                  {description}
                  {itemName && (
                    <> <strong className="text-text-secondary font-medium">{itemName}</strong> wordt permanent verwijderd.</>
                  )}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex justify-end gap-2 pt-1 border-t border-border-subtle mt-1">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            variant={destructive ? 'destructive' : 'default'}
            disabled={loading}
            onClick={() => { onConfirm() }}
            className={cn(destructive && 'gap-1.5')}
          >
            {destructive && <Trash2 size={12} />}
            {loading ? 'Bezig…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
