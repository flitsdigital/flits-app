import type { ElementType } from 'react'
import {
  Sparkles,
  Phone,
  CheckCircle2,
  FileText,
  Trophy,
  XCircle,
} from 'lucide-react'
import type { LeadStatus } from '../types'

export const LEAD_STATUS_CONFIG: Record<LeadStatus, {
  label: string
  color: string
  badge: string
  dot: string
  Icon: ElementType
  bg: string
  headerBg: string
  ring: string
  text: string
}> = {
  new: {
    label: 'Nieuw',
    color: 'bg-blue-500/10 border-blue-500/25',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    dot: 'bg-blue-400',
    Icon: Sparkles,
    bg: 'bg-blue-500/[0.06]',
    headerBg: 'bg-blue-500/10',
    ring: 'bg-blue-400',
    text: 'text-blue-400',
  },
  contacted: {
    label: 'Gecontacteerd',
    color: 'bg-purple-500/10 border-purple-500/25',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    dot: 'bg-purple-400',
    Icon: Phone,
    bg: 'bg-purple-500/[0.06]',
    headerBg: 'bg-purple-500/10',
    ring: 'bg-purple-400',
    text: 'text-purple-400',
  },
  qualified: {
    label: 'Gekwalificeerd',
    color: 'bg-orange-500/10 border-orange-500/25',
    badge: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    dot: 'bg-orange-400',
    Icon: CheckCircle2,
    bg: 'bg-orange-500/[0.06]',
    headerBg: 'bg-orange-500/10',
    ring: 'bg-orange-400',
    text: 'text-orange-400',
  },
  proposal: {
    label: 'Offerte verstuurd',
    color: 'bg-yellow-500/10 border-yellow-500/25',
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    dot: 'bg-yellow-400',
    Icon: FileText,
    bg: 'bg-yellow-500/[0.06]',
    headerBg: 'bg-yellow-500/10',
    ring: 'bg-yellow-400',
    text: 'text-yellow-400',
  },
  won: {
    label: 'Gewonnen',
    color: 'bg-green-500/10 border-green-500/25',
    badge: 'bg-green-500/15 text-green-400 border-green-500/25',
    dot: 'bg-green-400',
    Icon: Trophy,
    bg: 'bg-green-500/[0.05]',
    headerBg: 'bg-green-500/10',
    ring: 'bg-green-400',
    text: 'text-green-400',
  },
  lost: {
    label: 'Verloren',
    color: 'bg-zinc-500/10 border-zinc-500/25',
    badge: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
    dot: 'bg-zinc-400',
    Icon: XCircle,
    bg: 'bg-zinc-500/[0.05]',
    headerBg: 'bg-zinc-500/10',
    ring: 'bg-zinc-400',
    text: 'text-zinc-400',
  },
}

export const LEAD_PIPELINE: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
