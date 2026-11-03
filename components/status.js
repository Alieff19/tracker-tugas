import { AlertTriangle, CheckCircle2, Clock, Minus, CircleCheck } from 'lucide-react'

export const COLUMNS = [
  { key: 'todo', label: 'To Do', dot: 'bg-[#6D9D9E]', bar: 'bg-[#8BBEBF]', panel: 'border-[#CDDDDA] bg-accent-soft/60' },
  { key: 'doing', label: 'In Progress', dot: 'bg-[#AA9560]', bar: 'bg-[#BEAC7C]', panel: 'border-[#DBD8BD] bg-peach/65' },
  { key: 'under_review', label: 'In Review', dot: 'bg-[#8A957C]', bar: 'bg-[#A5AF98]', panel: 'border-[#D6DCCB] bg-lavender/70' },
  { key: 'done', label: 'Done', dot: 'bg-[#668D75]', bar: 'bg-[#668D75]', panel: 'border-[#CBD9C9] bg-mint/75' },
]

export const DEADLINE = {
  selesai: { label: 'Completed', tone: 'green', icon: CheckCircle2 },
  tanpa_deadline: { label: 'No due date', tone: 'neutral', icon: Minus },
  terlambat: { label: 'Overdue', tone: 'red', icon: AlertTriangle },
  mepet: { label: 'Due soon', tone: 'amber', icon: Clock },
  aman: { label: 'On track', tone: 'green', icon: CircleCheck },
}

export const ROLE = {
  former: { label: 'Former member', tone: 'neutral' },
  ketua: { label: 'Leader', tone: 'amber' },
  member: { label: 'Member', tone: 'neutral' },
}

/** Formats 'YYYY-MM-DD' or an ISO timestamp as e.g. "Nov 5, 2026". */
export function formatDate(value) {
  if (!value) return ''
  let date
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    date = new Date(y, m - 1, d)
  } else {
    date = new Date(value)
  }
  return date.toLocaleDateString('en-US', {
    ...(/^\d{4}-\d{2}-\d{2}$/.test(value) ? {} : { timeZone: 'Asia/Jakarta' }),
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
