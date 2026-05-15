import React, { useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { fetchProfilesBasicCached } from '../lib/appCaches'

interface Profile {
  id: string
  email: string
  name?: string | null
}

interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  onMentionsDetected?: (emails: string[]) => void
  onBlur?: () => void
  placeholder?: string
  rows?: number
  className?: string
  disabled?: boolean
  autoFocus?: boolean
}

// Parse @mentions from text, return matched profile emails.
// Sorts by name length descending so "Jordi Test" is matched before "Jordi".
export function parseMentions(text: string, profiles: Profile[]): string[] {
  const found: string[] = []
  // Longest name first to prevent short names from consuming part of a longer mention
  const sorted = [...profiles].sort((a, b) => {
    const aLen = (a.name ?? a.email.split('@')[0]).length
    const bLen = (b.name ?? b.email.split('@')[0]).length
    return bLen - aLen
  })
  let remaining = text
  for (const p of sorted) {
    const name = p.name ?? p.email.split('@')[0]
    const escapeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const escapeEmail = p.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match @Name or @email followed by whitespace or end-of-string
    const pattern = new RegExp(`@(?:${escapeName}|${escapeEmail})(?=\\s|$)`, 'gi')
    if (pattern.test(remaining) && !found.includes(p.email)) {
      found.push(p.email)
      // Remove matched mention so shorter names don't re-match the same token
      remaining = remaining.replace(pattern, '')
    }
  }
  return found
}

export function MentionTextarea({
  value,
  onChange,
  onMentionsDetected,
  onBlur: onBlurProp,
  placeholder,
  rows = 3,
  className,
  disabled,
  autoFocus,
}: MentionTextareaProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionStartRef = useRef<number>(-1)
  const [dropdownRect, setDropdownRect] = useState({ top: 0, left: 0, width: 220 })

  const filtered = useMemo(
    () =>
      query
        ? profiles.filter((p) => {
            const name = (p.name ?? p.email.split('@')[0]).toLowerCase()
            return name.includes(query.toLowerCase()) || p.email.toLowerCase().includes(query.toLowerCase())
          })
        : profiles,
    [profiles, query],
  )

  const updateDropdownPosition = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setDropdownRect({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 200),
    })
  }, [])

  useLayoutEffect(() => {
    if (!dropdownOpen || filtered.length === 0) return
    updateDropdownPosition()
    const onReposition = () => updateDropdownPosition()
    window.addEventListener('resize', onReposition)
    // capture: ook scroll in geneste containers (modal body)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [dropdownOpen, filtered.length, updateDropdownPosition, query, value])

  useEffect(() => {
    fetchProfilesBasicCached().then(setProfiles).catch(() => {})
  }, [])

  function insertMention(profile: Profile) {
    if (!textareaRef.current) return
    const name = profile.name ?? profile.email.split('@')[0]
    const start = mentionStartRef.current
    if (start === -1) return
    const cursor = textareaRef.current.selectionStart ?? (start + query.length + 1)
    const before = value.slice(0, start)
    const after = value.slice(cursor)
    const newVal = before + '@' + name + ' ' + after
    onChange(newVal)
    setDropdownOpen(false)
    setQuery('')
    mentionStartRef.current = -1
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = (before + '@' + name + ' ').length
        textareaRef.current.selectionStart = pos
        textareaRef.current.selectionEnd = pos
        textareaRef.current.focus()
      }
    }, 0)
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    onChange(val)

    const cursor = e.target.selectionStart ?? 0
    const textBefore = val.slice(0, cursor)
    const atIdx = textBefore.lastIndexOf('@')

    if (atIdx !== -1) {
      const textAfterAt = textBefore.slice(atIdx + 1)
      // Only trigger if no whitespace after the @
      if (!/\s/.test(textAfterAt)) {
        mentionStartRef.current = atIdx
        setQuery(textAfterAt)
        setActiveIdx(0)
        setDropdownOpen(true)
        return
      }
    }

    setDropdownOpen(false)
    mentionStartRef.current = -1
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!dropdownOpen || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      if (filtered[activeIdx]) insertMention(filtered[activeIdx])
    } else if (e.key === 'Escape') {
      setDropdownOpen(false)
    }
  }

  const handleBlur = useCallback(() => {
    // Delay so mousedown on dropdown fires first
    setTimeout(() => {
      setDropdownOpen(false)
      onBlurProp?.()
    }, 200)
  }, [onBlurProp])

  // Notify parent of mentions when value changes
  useEffect(() => {
    if (onMentionsDetected && profiles.length > 0) {
      const emails = parseMentions(value, profiles)
      onMentionsDetected(emails)
    }
  }, [value, profiles]) // eslint-disable-line react-hooks/exhaustive-deps

  const mentionList =
    dropdownOpen && filtered.length > 0 ? (
      <div
        role="listbox"
        className="fixed z-[200] bg-surface-3 border border-border-default rounded-lg shadow-xl py-1 max-h-48 overflow-y-auto"
        style={{
          top: dropdownRect.top,
          left: dropdownRect.left,
          minWidth: dropdownRect.width,
          maxWidth: 'min(90vw, 320px)',
        }}
      >
        {filtered.map((p, i) => {
          const name = p.name ?? p.email.split('@')[0]
          const initials = name.charAt(0).toUpperCase()
          return (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(p)
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                i === activeIdx
                  ? 'bg-white/[0.08] text-text-primary'
                  : 'text-text-secondary hover:bg-white/[0.05]',
              )}
            >
              <div className="w-6 h-6 rounded-full bg-accent-blue/25 flex items-center justify-center text-[10px] font-bold text-accent-blue shrink-0">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="leading-tight truncate font-medium">{name}</span>
                {p.name && (
                  <span className="text-[10px] text-text-muted truncate">{p.email}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    ) : null

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          'w-full bg-transparent text-sm text-text-secondary placeholder-zinc-700 focus:outline-none resize-none leading-relaxed',
          className,
        )}
      />
      {typeof document !== 'undefined' && mentionList
        ? createPortal(mentionList, document.body)
        : null}
    </div>
  )
}
