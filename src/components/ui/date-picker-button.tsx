import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import { cn } from '@/lib/utils'

interface DatePickerButtonProps {
  value?: string // 'yyyy-MM-dd'
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  min?: string
  max?: string
  disabled?: boolean
}

export function DatePickerButton({
  value,
  onChange,
  placeholder = 'Datum',
  className,
  min,
  max,
  disabled,
}: DatePickerButtonProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  function openPicker() {
    const el = inputRef.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      el.click()
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className={cn(
          'h-7 inline-flex items-center gap-1.5 text-xs px-2.5 rounded-full border border-border bg-muted/40 text-muted-foreground hover:bg-muted/60 cursor-pointer transition-colors select-none disabled:opacity-50 disabled:pointer-events-none',
          className
        )}
      >
        <CalendarIcon className="size-3 shrink-0" />
        {value
          ? format(new Date(value + 'T00:00:00'), 'd MMM yyyy', { locale: nl })
          : placeholder}
      </button>
      {/* Positioned over the button so the browser anchors the picker here */}
      <input
        ref={inputRef}
        type="date"
        value={value ?? ''}
        min={min}
        max={max}
        disabled={disabled}
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value)
        }}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
      />
    </div>
  )
}
