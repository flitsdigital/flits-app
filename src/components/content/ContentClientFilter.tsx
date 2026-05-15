import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
export function ClientFilterCombobox({ value, onChange, clients }: { value: string; onChange: (v: string) => void; clients: { id: string; companyName: string }[] }) {
  const [open, setOpen] = useState(false)
  const selected = clients.find(c => c.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="h-7 text-xs justify-between font-normal min-w-[140px]">
          {selected ? selected.companyName : 'Alle klanten'}
          <ChevronsUpDown size={12} className="text-muted-foreground shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Zoek klant..." className="h-8" />
          <CommandList>
            <CommandEmpty>Niet gevonden.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="all" onSelect={() => { onChange('all'); setOpen(false) }}>
                <Check size={12} className={cn('mr-2', value === 'all' ? 'opacity-100' : 'opacity-0')} />
                Alle klanten
              </CommandItem>
              {clients.map(c => (
                <CommandItem key={c.id} value={c.companyName} onSelect={() => { onChange(c.id); setOpen(false) }}>
                  <Check size={12} className={cn('mr-2', value === c.id ? 'opacity-100' : 'opacity-0')} />
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
