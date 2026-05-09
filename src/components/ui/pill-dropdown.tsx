import * as React from 'react'
import {
  Select, SelectContent, SelectGroup,
  SelectItem, SelectTrigger,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface PillDropdownProps<T extends string> {
  options: T[]
  value: T
  onChange: (v: T) => void
  renderLabel: (v: T) => React.ReactNode
  renderOption: (v: T) => React.ReactNode
  className?: string
  disabled?: boolean
}

export function PillDropdown<T extends string>({
  options,
  value,
  onChange,
  renderLabel,
  renderOption,
  className,
  disabled,
}: PillDropdownProps<T>) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
      <SelectTrigger
        className={cn(
          'h-7 w-auto text-xs px-2.5 rounded-full border-border bg-muted/40 text-muted-foreground hover:bg-muted/60 gap-1.5 focus:ring-0 focus:ring-offset-0 [&>svg]:size-3 [&>svg]:opacity-50',
          className
        )}
      >
        <div className="flex items-center gap-1.5">{renderLabel(value)}</div>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map(opt => (
            <SelectItem key={opt} value={opt}>
              <span className="flex items-center gap-2">{renderOption(opt)}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
