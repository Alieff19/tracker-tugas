'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Check, Columns3, Copy, Crown, Link2, ListChecks, User, Users } from 'lucide-react'
import { useGroup } from './GroupContext'
import { useToast } from './ToastProvider'
import { Badge, Button, cn, useCopy } from './ui'

export default function GroupHeader() {
  const { groupId, group, members, draftCount, isLeader } = useGroup()
  const pathname = usePathname()
  const toast = useToast()
  const { copied, copy } = useCopy()

  const base = `/grup/${groupId}`
  const tabs = [
    { href: base, label: 'Board', icon: Columns3, exact: true },
    ...(isLeader
      ? [{ href: `${base}/susun`, label: 'Plan tasks', icon: ListChecks, count: draftCount || null }]
      : []),
    { href: `${base}/kontribusi`, label: 'Contribution', icon: BarChart3 },
    { href: `${base}/anggota`, label: 'Members', icon: Users, count: members.length },
  ]

  const copyCode = async () => {
    if (await copy(group.kode_undangan, 'code')) toast.success('Invite code copied')
  }
  const copyLink = async () => {
    if (await copy(`${window.location.origin}/join/${groupId}`, 'link'))
      toast.success('Invite link copied')
  }

  return (
    <div className="group-banner border-b border-line print:hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 pb-5 pt-7 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <Badge tone={isLeader ? 'amber' : 'neutral'} icon={isLeader ? Crown : User}>
                {isLeader ? 'Leader' : 'Member'}
              </Badge>
              <span className="text-xs text-ink-3">{members.length} of 5 members</span>
            </div>
            <h1 className="truncate text-3xl font-medium tracking-[-0.05em] text-ink sm:text-4xl">{group.nama}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface pl-3 pr-1">
              <span className="text-xs text-ink-3">Invite code</span>
              <code className="font-mono text-[13px] font-semibold tracking-wider text-ink">
                {group.kode_undangan}
              </code>
              <button
                type="button"
                onClick={copyCode}
                aria-label="Copy invite code"
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-muted hover:text-ink"
              >
                {copied === 'code' ? (
                  <Check className="size-3.5 text-emerald-600" strokeWidth={2} />
                ) : (
                  <Copy className="size-3.5" strokeWidth={1.75} />
                )}
              </button>
            </div>
            <Button icon={copied === 'link' ? Check : Link2} onClick={copyLink}>
              Copy invite link
            </Button>
          </div>
        </div>

        <nav className="-mb-px flex gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.href : pathname.startsWith(t.href)
            const Icon = t.icon
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-[13px] font-medium transition-colors',
                  active
                    ? 'border-accent text-accent'
                    : 'border-transparent text-ink-3 hover:text-ink'
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {t.label}
                {t.count != null && (
                  <span
                    className={cn(
                      'min-w-5 rounded-full px-1.5 text-center text-[11px] font-medium tabular-nums leading-5',
                      active ? 'bg-accent text-surface' : 'bg-surface/70 text-ink-2'
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
