'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Crown, KeyRound, Link2, LogOut, User, UserPlus, Users } from 'lucide-react'
import { Grup } from '@/lib/api'
import { useGroup } from '@/components/GroupContext'
import { useToast } from '@/components/ToastProvider'
import { formatDate } from '@/components/status'
import { Avatar, Badge, Button, Card, CardHeader, Modal, cn, inputClass, useCopy } from '@/components/ui'
import { ScrollReveal } from '@/components/motion'

const MAX_MEMBERS = 5

export default function MembersPage() {
  const { groupId, group, members, user, isLeader } = useGroup()
  const router = useRouter()
  const toast = useToast()
  const { copied, copy } = useCopy()

  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/join/${groupId}` : `/join/${groupId}`
  const leaderBlocked = isLeader && members.length > 1

  const leave = async () => {
    setLeaving(true)
    try {
      await Grup.keluar(groupId)
      toast.info('You left the group')
      router.push('/dashboard')
    } catch (err) {
      toast.error(err.message)
      setLeaving(false)
      setLeaveOpen(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6">
      <ScrollReveal>
        <Card tone="blue">
          <CardHeader
            icon={UserPlus}
            title="Invite teammates"
            description="Share the link. Teammates sign in, then enter the invite code to join."
          />
          <div className="grid gap-4 p-5 sm:grid-cols-[220px_1fr]">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink">
                <KeyRound className="size-3.5 text-ink-3" strokeWidth={1.75} />
                Invite code
              </p>
              <div className="flex h-11 items-center justify-between rounded-lg border border-line bg-canvas pl-4 pr-1.5">
                <code className="font-mono text-lg font-semibold tracking-[0.25em] text-ink">{group.kode_undangan}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Copy invite code"
                  onClick={async () => (await copy(group.kode_undangan, 'code')) && toast.success('Invite code copied')}
                >
                  {copied === 'code' ? (
                    <Check className="size-4 text-emerald-600" strokeWidth={2} />
                  ) : (
                    <Copy className="size-4" strokeWidth={1.75} />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink">
                <Link2 className="size-3.5 text-ink-3" strokeWidth={1.75} />
                Invite link
              </p>
              <div className="flex gap-2">
                <input readOnly value={inviteLink} className={cn(inputClass, 'h-11 bg-canvas font-mono text-[13px] text-ink-2')} onFocus={(e) => e.target.select()} />
                <Button
                  size="lg"
                  icon={copied === 'link' ? Check : Copy}
                  onClick={async () => (await copy(inviteLink, 'link')) && toast.success('Invite link copied')}
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </ScrollReveal>

      <ScrollReveal delay={80}>
        <Card>
          <CardHeader
            icon={Users}
            title="Members"
            description={
              members.length < 2
                ? 'At least 2 members are needed before tasks can be published.'
                : members.length >= MAX_MEMBERS
                ? 'This group is full.'
                : `${MAX_MEMBERS - members.length} open ${MAX_MEMBERS - members.length === 1 ? 'seat' : 'seats'} remaining.`
            }
            action={
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: MAX_MEMBERS }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-1.5 w-4 rounded-full transition-all duration-300',
                        i < members.length ? 'bg-ink scale-105' : 'bg-line'
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs tabular-nums text-ink-3">
                  {members.length}/{MAX_MEMBERS}
                </span>
              </div>
            }
          />
          <ul className="divide-y divide-line">
            {members.map((m, idx) => {
              const p = m.profiles
              const leader = m.role === 'ketua'
              return (
                <li
                  key={p?.id}
                  style={{ '--delay': `${idx * 60}ms` }}
                  className="stagger-item flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={p?.nama || ''} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                        {p?.nama || 'Unknown'}
                        {p?.id === user.id && <Badge tone="accent">You</Badge>}
                      </p>
                      {m.joined_at && <p className="text-xs text-ink-3">Joined {formatDate(m.joined_at)}</p>}
                    </div>
                  </div>
                  <Badge tone={leader ? 'amber' : 'neutral'} icon={leader ? Crown : User}>
                    {leader ? 'Leader' : 'Member'}
                  </Badge>
                </li>
              )
            })}
          </ul>
        </Card>
      </ScrollReveal>

      <ScrollReveal delay={150}>
        <Card className="border-red-200/70">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Leave group</h2>
              <p className="mt-0.5 text-[13px] text-ink-2">
                {leaderBlocked
                  ? 'As the leader, you can leave only after all other members have left.'
                  : 'Your in-progress and in-review tasks will return to To Do. Approved work stays in the contribution report.'}
              </p>
            </div>
            <Button variant="danger" icon={LogOut} disabled={leaderBlocked} onClick={() => setLeaveOpen(true)}>
              Leave group
            </Button>
          </div>
        </Card>
      </ScrollReveal>

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        icon={LogOut}
        tone="red"
        title={`Leave ${group.nama}?`}
        description="Your in-progress and in-review tasks will return to To Do. Your approved work remains credited in the contribution report."
        footer={
          <>
            <Button variant="secondary" onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button variant="dangerSolid" loading={leaving} onClick={leave}>
              Leave group
            </Button>
          </>
        }
      />
    </div>
  )
}
