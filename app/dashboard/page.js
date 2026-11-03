'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  Check,
  Copy,
  Crown,
  FolderKanban,
  KeyRound,
  Link2,
  Plus,
  User,
  UserPlus,
} from 'lucide-react'
import { Auth, Grup } from '@/lib/api'
import TopBar from '@/components/TopBar'
import { useToast } from '@/components/ToastProvider'
import { formatDate } from '@/components/status'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageLoader,
  useCopy,
} from '@/components/ui'
import { ScrollReveal } from '@/components/motion'

export default function DashboardPage() {
  const router = useRouter()
  const toast = useToast()
  const { copied, copy } = useCopy()

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [groups, setGroups] = useState(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creating, setCreating] = useState(false)

  const [joinOpen, setJoinOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)

  const load = useCallback(async () => {
    try {
      const u = await Auth.userSaatIni()
      if (!u) {
        router.replace('/login')
        return
      }
      setUser(u)
      const [p, g] = await Promise.all([Auth.profilSaatIni(), Grup.daftarSaya()])
      setProfile(p)
      setGroups(g || [])
    } catch (err) {
      toast.error(err.message || 'Could not load dashboard')
    }
  }, [router, toast])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setCreating(true)
    try {
      const created = await Grup.buat(newGroupName.trim())
      toast.success(`Group "${created.nama}" created`)
      setNewGroupName('')
      setCreateOpen(false)
      router.push(`/grup/${created.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setJoining(true)
    try {
      const joined = await Grup.gabung(inviteCode.trim())
      toast.success(`Joined "${joined.nama}"`)
      setInviteCode('')
      setJoinOpen(false)
      router.push(`/grup/${joined.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setJoining(false)
    }
  }

  const copyCode = async (e, code, id) => {
    e.stopPropagation()
    if (await copy(code, `code-${id}`)) toast.success('Invite code copied')
  }

  const copyLink = async (e, id) => {
    e.stopPropagation()
    const url = `${window.location.origin}/join/${id}`
    if (await copy(url, `link-${id}`)) toast.success('Invite link copied')
  }

  if (!groups) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <PageLoader label="Loading your groups" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        profile={profile}
        email={user?.email}
        onProfileChange={setProfile}
        crumbs={[{ label: 'Groups' }]}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <ScrollReveal className="group-banner flex flex-col gap-5 rounded-3xl border border-accent/10 p-7 sm:flex-row sm:items-end sm:justify-between sm:p-9">
          <div>
            <h1 className="text-4xl font-medium tracking-[-0.055em] text-ink">
              Your groups
            </h1>
            <p className="mt-1 text-[13px] text-ink-2">
              Create a new group as Leader or join an existing team with a 6-character invite code.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={UserPlus}
              onClick={() => setJoinOpen(true)}
            >
              Join with code
            </Button>
            <Button icon={Plus} onClick={() => setCreateOpen(true)}>
              New group
            </Button>
          </div>
        </ScrollReveal>

        <div className="mt-6">
          {groups.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No groups yet"
              description="Create a group to start planning tasks as the leader, or enter a 6-character code from your team leader."
              action={
                <>
                  <Button
                    variant="secondary"
                    icon={UserPlus}
                    onClick={() => setJoinOpen(true)}
                  >
                    Enter invite code
                  </Button>
                  <Button icon={Plus} onClick={() => setCreateOpen(true)}>
                    Create group
                  </Button>
                </>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((item, idx) => {
                const g = item.groups
                if (!g) return null
                const isLeader = item.role === 'ketua'

                return (
                  <ScrollReveal key={g.id} delay={idx * 70} variant="up">
                    <Card
                      interactive
                      onClick={() => router.push(`/grup/${g.id}`)}
                      className={`group flex h-full cursor-pointer flex-col justify-between p-6 ${isLeader ? 'bg-linear-to-br from-surface to-accent-soft/60' : 'bg-linear-to-br from-surface to-peach/70'}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            tone={isLeader ? 'amber' : 'neutral'}
                            icon={isLeader ? Crown : User}
                          >
                            {isLeader ? 'Leader' : 'Member'}
                          </Badge>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => copyCode(e, g.kode_undangan, g.id)}
                              title="Copy invite code"
                              className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-canvas px-2 font-mono text-xs font-medium text-ink-2 transition-all hover:scale-105 hover:border-line-strong hover:text-ink active:scale-95"
                            >
                              <span>{g.kode_undangan}</span>
                              {copied === `code-${g.id}` ? (
                                <Check className="size-3 text-emerald-600" strokeWidth={2} />
                              ) : (
                                <Copy className="size-3 text-ink-3" strokeWidth={1.75} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => copyLink(e, g.id)}
                              title="Copy invite link"
                              className="flex size-7 cursor-pointer items-center justify-center rounded-md border border-line bg-canvas text-ink-2 transition-all hover:scale-105 hover:border-line-strong hover:text-ink active:scale-95"
                            >
                              {copied === `link-${g.id}` ? (
                                <Check className="size-3.5 text-emerald-600" strokeWidth={2} />
                              ) : (
                                <Link2 className="size-3.5 text-ink-3" strokeWidth={1.75} />
                              )}
                            </button>
                          </div>
                        </div>

                        <h2 className="mt-4 line-clamp-2 text-base font-semibold text-ink transition-colors group-hover:text-accent">
                          {g.nama}
                        </h2>
                        <p className="mt-1 text-xs text-ink-3">
                          Created {formatDate(g.created_at)}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-line pt-3 text-xs font-medium text-ink-2 group-hover:text-ink">
                        <span>Open board</span>
                        <ArrowUpRight className="size-4 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" />
                      </div>
                    </Card>
                  </ScrollReveal>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create group modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        icon={Plus}
        title="Create a new group"
        description="You will automatically be assigned as the Leader of this group."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-group-form" loading={creating}>
              Create group
            </Button>
          </>
        }
      >
        <form id="create-group-form" onSubmit={handleCreate}>
          <Field
            label="Group or course name"
            hint="At least 3 characters."
          >
            <Input
              required
              minLength={3}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Web Engineering — Group 4"
              autoFocus
            />
          </Field>
        </form>
      </Modal>

      {/* Join group modal */}
      <Modal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        icon={KeyRound}
        title="Join a group"
        description="Enter the 6-character invite code shared by your group leader."
        footer={
          <>
            <Button variant="secondary" onClick={() => setJoinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="join-group-form" loading={joining}>
              Join group
            </Button>
          </>
        }
      >
        <form id="join-group-form" onSubmit={handleJoin}>
          <Field label="Invite code">
            <Input
              required
              maxLength={10}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toLowerCase())}
              placeholder="92d9c1"
              className="font-mono tracking-widest lowercase"
              autoFocus
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
