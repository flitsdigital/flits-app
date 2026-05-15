import { useState, useRef } from 'react'
import { Tag, X, Check, ChevronsUpDown, Palette, Pencil, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { timeTrackingDb } from '../../lib/timeTrackingDb'
import type { TimeTag } from '../../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { TAG_COLORS } from './timeTrackingConstants'

export function TagPill({ tag, onRemove }: { tag: TimeTag; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
      style={{ backgroundColor: tag.color + '25', color: tag.color, border: `1px solid ${tag.color}40` }}
    >
      {tag.name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="opacity-60 hover:opacity-100">
          <X size={8} />
        </button>
      )}
    </span>
  )
}

export function TagSelector({
  tags,
  selectedIds,
  onChange,
  onManage,
}: {
  tags: TimeTag[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onManage: () => void
}) {
  const [open, setOpen] = useState(false)
  const selectedTags = tags.filter((t) => selectedIds.includes(t.id))

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors shrink-0"
        >
          <Tag size={13} />
          {selectedTags.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap">
              {selectedTags.map((t) => (
                <TagPill key={t.id} tag={t} />
              ))}
            </div>
          ) : (
            <span>Tags</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2 bg-surface-2 border-border-subtle" align="start">
        {tags.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-2">Nog geen tags</p>
        ) : (
          <div className="space-y-0.5 mb-2">
            {tags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.06] transition-colors text-left"
              >
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-xs text-text-primary flex-1 truncate">{t.name}</span>
                {selectedIds.includes(t.id) && <Check size={11} className="text-accent-blue shrink-0" />}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onManage()
          }}
          className="w-full text-xs text-text-muted hover:text-text-primary text-center py-1 border-t border-border-subtle pt-2 mt-1 transition-colors"
        >
          Beheer tags
        </button>
      </PopoverContent>
    </Popover>
  )
}

export function ClientCombobox({
  value,
  onChange,
  clients,
}: {
  value: string | null
  onChange: (v: string | null) => void
  clients: { id: string; companyName: string }[]
}) {
  const [open, setOpen] = useState(false)
  const selected = clients.find((c) => c.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-sm h-9">
          {selected ? selected.companyName : <span className="text-muted-foreground">Geen klant</span>}
          <ChevronsUpDown size={14} className="text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Zoek klant..." />
          <CommandList>
            <CommandEmpty>Geen klanten gevonden.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <span className="text-text-muted">— Geen klant —</span>
              </CommandItem>
              {clients.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.companyName}
                  onSelect={() => {
                    onChange(c.id)
                    setOpen(false)
                  }}
                >
                  {c.companyName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isPreset = TAG_COLORS.includes(value)
  return (
    <div className="flex gap-2 flex-wrap items-center">
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-md transition-transform hover:scale-110 shrink-0"
          style={{
            backgroundColor: c,
            outline: value === c ? `2px solid ${c}` : undefined,
            outlineOffset: '2px',
          }}
        />
      ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-6 h-6 rounded-md border-2 border-dashed border-border-default hover:border-text-muted transition-colors flex items-center justify-center shrink-0 relative overflow-hidden"
        title="Aangepaste kleur"
        style={{ backgroundColor: isPreset ? 'transparent' : value }}
      >
        {isPreset && <Palette size={10} className="text-text-muted" />}
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </button>
    </div>
  )
}

export function TagManagerDialog({
  tags,
  open,
  onClose,
  onReload,
}: {
  tags: TimeTag[]
  open: boolean
  onClose: () => void
  onReload: () => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(TAG_COLORS[0]!)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0]!)
  const [saving, setSaving] = useState(false)

  function startEdit(tag: TimeTag) {
    setEditingId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId || !editName.trim()) return
    setSaving(true)
    try {
      await timeTrackingDb.updateTag(editingId, editName.trim(), editColor)
      setEditingId(null)
      await onReload()
    } catch {
      toast.error('Bijwerken mislukt')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    try {
      await timeTrackingDb.createTag(newName.trim(), newColor)
      setNewName('')
      await onReload()
    } catch {
      toast.error('Aanmaken mislukt')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await timeTrackingDb.deleteTag(id)
      if (editingId === id) setEditingId(null)
      await onReload()
    } catch {
      toast.error('Verwijderen mislukt')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Tags beheren</DialogTitle>
        </DialogHeader>

        {tags.length > 0 && (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {tags.map((tag) =>
              editingId === tag.id ? (
                <form key={tag.id} onSubmit={handleUpdate} className="space-y-2 p-2.5 bg-surface-3 rounded-lg border border-border-subtle">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm" autoFocus />
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)} className="flex-1 h-7 text-xs">
                      Annuleren
                    </Button>
                    <Button type="submit" size="sm" disabled={!editName.trim() || saving} className="flex-1 h-7 text-xs">
                      Opslaan
                    </Button>
                  </div>
                </form>
              ) : (
                <div key={tag.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] group">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm text-text-primary flex-1 truncate">{tag.name}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(tag)}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] text-text-muted hover:text-text-primary transition-all"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(tag.id)}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ),
            )}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-3 border-t border-border-subtle pt-3">
          <p className="text-xs font-medium text-text-muted">Nieuwe tag</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Naam</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="bijv. Design"
              className="h-9 text-sm"
              autoFocus={tags.length === 0}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Kleur</Label>
            <ColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <Button type="submit" size="sm" disabled={!newName.trim() || saving} className="w-full">
            <Plus size={13} /> Tag aanmaken
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
