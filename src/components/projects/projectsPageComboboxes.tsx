import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DatePickerButton } from '@/components/ui/date-picker-button'
import { Command, CommandEmpty, CommandGroup, CommandInput as CommandSearchInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'

export function ProjectClientCombobox({
  value,
  onChange,
  clients,
}: {
  value: string
  onChange: (v: string) => void
  clients: { id: string; companyName: string }[]
}) {
  const [open, setOpen] = useState(false)
  const selected = clients.find((c) => c.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-sm">
          {selected ? selected.companyName : <span className="text-muted-foreground">Geen klant (intern)</span>}
          <ChevronsUpDown size={14} className="text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandSearchInput placeholder="Zoek klant..." />
          <CommandList>
            <CommandEmpty>Geen klant gevonden.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                <Check size={14} className={cn('mr-2', !value ? 'opacity-100' : 'opacity-0')} />
                <span className="text-text-muted">Geen klant (intern)</span>
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
                  <Check size={14} className={cn('mr-2', value === c.id ? 'opacity-100' : 'opacity-0')} />
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

export function TaskDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isOverdue = value && new Date(value + 'T00:00:00') < new Date()
  return (
    <DatePickerButton
      value={value || undefined}
      onChange={onChange}
      placeholder="Deadline"
      className={clsx(
        'rounded-md border-border-subtle bg-white/[0.04] hover:bg-white/[0.08]',
        isOverdue ? 'text-red-400 [&_svg]:text-red-400' : ''
      )}
    />
  )
}
