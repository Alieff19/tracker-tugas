'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDashed,
  Clock,
  FileText,
  Filter,
  Inbox,
  LayoutGrid,
  ListChecks,
  Lock,
  MessageSquareWarning,
  Play,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Trophy,
  Undo2,
  Unlock,
  UserCheck,
  UserMinus,
  X,
} from 'lucide-react'
import { Grup, Tugas, TugasAnggota, TugasKetua } from '@/lib/api'
import { useGroup } from '@/components/GroupContext'
import { useToast } from '@/components/ToastProvider'
import { COLUMNS, DEADLINE, formatDate } from '@/components/status'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  Notice,
  PageLoader,
  Textarea,
  buttonClass,
  cn,
} from '@/components/ui'
import { AnimatedNumber, ScrollReveal } from '@/components/motion'

const COLUMN_META = {
  todo: {
    emptyTitle: 'No open tasks',
    emptyHint: 'All published tasks have been claimed.',
  },
  doing: {
    emptyTitle: 'Nothing in progress',
    emptyHint: 'Claim a task from To Do to start working.',
  },
  under_review: {
    emptyTitle: 'Review queue is clear',
    emptyHint: 'Submitted tasks will appear here for leader approval.',
  },
  done: {
    emptyTitle: 'No completed tasks yet',
    emptyHint: 'Approved tasks are locked and recorded here.',
  },
}

const STATUS_BADGE = {
  todo: { label: 'To Do', tone: 'blue' },
  doing: { label: 'In Progress', tone: 'amber' },
  under_review: { label: 'In Review', tone: 'violet' },
  done: { label: 'Done', tone: 'green' },
}

function SummaryHeader({
  summary,
  tasks,
  userId,
  view,
  onViewChange,
}) {
  const total = summary?.total || 0
  const pct = summary?.progress_persen || 0
  const share = (n) => (total ? `${((n || 0) / total) * 100}%` : '0%')
  const taskWeight = total > 0 ? Number((100 / total).toFixed(1)) : 0

  const myTasks = useMemo(
    () => tasks.filter((t) => t.dikerjakan_oleh === userId),
    [tasks, userId]
  )
  const myActiveCount = myTasks.filter((t) => t.status === 'doing').length
  const myRevisionCount = myTasks.filter(
    (t) => t.status === 'doing' && t.catatan_revisi
  ).length

  const stats = [
    {
      key: 'total',
      label: 'Published',
      value: total,
      sub: taskWeight ? `${taskWeight}% weight each` : 'No tasks yet',
      tone: 'bg-surface/80 border-line',
    },
    {
      key: 'todo',
      label: 'To Do',
      value: summary?.todo || 0,
      dot: 'bg-[#6D9D9E]',
      sub: 'Open to claim',
      tone: 'bg-surface/80 border-line',
    },
    {
      key: 'doing',
      label: 'In Progress',
      value: summary?.doing || 0,
      dot: 'bg-[#AA9560]',
      sub: 'Active work',
      tone: 'bg-surface/80 border-line',
    },
    {
      key: 'under_review',
      label: 'In Review',
      value: summary?.under_review || 0,
      dot: 'bg-[#8A957C]',
      sub: 'Awaiting approval',
      tone: 'bg-surface/80 border-line',
    },
    {
      key: 'done',
      label: 'Completed',
      value: summary?.done || 0,
      dot: 'bg-[#668D75]',
      sub: 'Approved & locked',
      tone: 'bg-surface/80 border-line',
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: summary?.terlambat || 0,
      dot: 'bg-red-500',
      sub: summary?.terlambat > 0 ? 'Needs attention' : 'All on schedule',
      alert: summary?.terlambat > 0,
      tone:
        summary?.terlambat > 0
          ? 'bg-red-50/80 border-red-200/80'
          : 'bg-surface/80 border-line',
    },
  ]

  return (
    <Card tone="blue" className="overflow-hidden border-accent/15 p-0">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-surface/80 px-2.5 py-1 text-xs font-medium text-ink-2">
                <span className="relative flex size-2">
                  <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-500" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                Live group board
              </span>
              {taskWeight > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface/70 px-2.5 py-1 text-xs text-ink-3">
                  <Sparkles className="size-3 text-accent" strokeWidth={2} />
                  1 task = {taskWeight}% contribution
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
              <span className="text-4xl font-semibold tracking-[-0.055em] tabular-nums text-accent sm:text-5xl">
                <AnimatedNumber value={pct} suffix="%" />
              </span>
              <span className="text-sm font-medium text-ink-2">
                {summary?.done || 0} of {total} tasks approved
              </span>
            </div>
          </div>

          {/* Enhanced View Switcher */}
          <div className="inline-flex self-start rounded-2xl border border-line-strong/70 bg-surface/90 p-1.5 shadow-xs lg:self-center">
            <button
              type="button"
              onClick={() => onViewChange('all')}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium transition-all duration-200',
                view === 'all'
                  ? 'bg-accent text-surface shadow-sm'
                  : 'text-ink-2 hover:bg-muted/70 hover:text-ink'
              )}
            >
              <LayoutGrid className="size-4" strokeWidth={1.75} />
              <span>All tasks</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none',
                  view === 'all'
                    ? 'bg-surface/20 text-surface'
                    : 'bg-muted text-ink-2'
                )}
              >
                {tasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('mine')}
              className={cn(
                'relative flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium transition-all duration-200',
                view === 'mine'
                  ? 'bg-accent text-surface shadow-sm'
                  : 'text-ink-2 hover:bg-muted/70 hover:text-ink'
              )}
            >
              <UserCheck className="size-4" strokeWidth={1.75} />
              <span>My tasks</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none',
                  view === 'mine'
                    ? 'bg-surface/20 text-surface'
                    : myActiveCount > 0
                    ? 'bg-accent-soft text-accent'
                    : 'bg-muted text-ink-2'
                )}
              >
                {myTasks.length}
              </span>
              {myRevisionCount > 0 && (
                <span
                  className="size-2 rounded-full bg-amber-500 ring-2 ring-surface"
                  title="Changes requested on your task"
                />
              )}
            </button>
          </div>
        </div>

        {/* Multi-stage progress bar */}
        <div className="mt-5">
          <div className="progress-shimmer relative flex h-2.5 overflow-hidden rounded-full bg-surface/90 ring-1 ring-inset ring-line">
            <div
              className="h-full bg-[#668D75] transition-all duration-700 ease-out"
              style={{ width: share(summary?.done) }}
              title={`Done: ${summary?.done || 0}`}
            />
            <div
              className="h-full bg-[#8A957C] transition-all duration-700 ease-out"
              style={{ width: share(summary?.under_review) }}
              title={`In Review: ${summary?.under_review || 0}`}
            />
            <div
              className="h-full bg-[#BEAC7C] transition-all duration-700 ease-out"
              style={{ width: share(summary?.doing) }}
              title={`In Progress: ${summary?.doing || 0}`}
            />
          </div>
        </div>

        {/* Stat tiles */}
        <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div
              key={s.key}
              className={cn(
                'rounded-xl border px-3.5 py-2.5 transition-colors',
                s.tone
              )}
            >
              <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                {s.dot && <span className={cn('size-2 rounded-full', s.dot)} />}
                {s.label}
              </dt>
              <dd
                className={cn(
                  'mt-1 text-xl font-semibold tracking-tight tabular-nums',
                  s.alert ? 'text-red-600' : 'text-ink'
                )}
              >
                <AnimatedNumber value={s.value || 0} />
              </dd>
              <p
                className={cn(
                  'mt-0.5 truncate text-[11px]',
                  s.alert ? 'font-medium text-red-600/90' : 'text-ink-3'
                )}
              >
                {s.sub}
              </p>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  )
}

function TaskCard({
  task,
  index = 0,
  userId,
  isLeader,
  busy,
  actions,
  weight = 0,
  showStatusBadge = false,
}) {
  const isMine = task.dikerjakan_oleh === userId
  const deadline = DEADLINE[task.status_deadline] || DEADLINE.tanpa_deadline
  const showRevision = task.catatan_revisi && task.status !== 'done'
  const statusInfo = STATUS_BADGE[task.status] || STATUS_BADGE.todo
  const StatusIcon = { todo: CircleDashed, doing: Play, under_review: Clock, done: CheckCircle2 }[task.status] || CircleDashed

  let primaryAction = null
  let secondaryAction = null
  let statusBanner = null

  if (task.status === 'todo') {
    primaryAction = (
      <Button
        variant="primary"
        size="sm"
        icon={Play}
        loading={busy}
        onClick={() => actions.claim(task)}
        className="task-row-action"
      >
        Claim task
      </Button>
    )
  } else if (task.status === 'doing' && isMine) {
    primaryAction = (
      <Button
        size="sm"
        icon={Send}
        loading={busy}
        onClick={() => actions.submit(task)}
        className="task-row-action"
      >
        Submit for review
      </Button>
    )
    secondaryAction = (
      <Button
        variant="ghost"
        size="sm"
        icon={Undo2}
        disabled={busy}
        onClick={() => actions.release(task)}
        title="Release back to To Do"
        className="shrink-0 text-ink-3 hover:text-red-700"
      >
        Release
      </Button>
    )
  } else if (task.status === 'doing' && isLeader) {
    secondaryAction = (
      <Button
        variant="danger"
        size="sm"
        icon={UserMinus}
        loading={busy}
        onClick={() => actions.unassign(task)}
        className="task-row-action"
      >
        Unassign
      </Button>
    )
  } else if (task.status === 'under_review' && isLeader) {
    primaryAction = (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="success"
          size="sm"
          icon={Check}
          loading={busy}
          onClick={() => actions.approve(task)}
          className="task-row-action"
        >
          Approve
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={RotateCcw}
          disabled={busy}
          onClick={() => actions.requestChanges(task)}
          className="task-row-action"
        >
          Changes
        </Button>
      </div>
    )
  } else if (task.status === 'under_review' && isMine) {
    statusBanner = (
      <div className="flex items-center gap-1.5 text-xs text-ink-3">
        <Clock className="size-3.5 shrink-0" strokeWidth={2} />
        Waiting for leader review
      </div>
    )
  } else if (task.status === 'done' && isLeader) {
    secondaryAction = (
      <Button
        variant="ghost"
        size="sm"
        icon={Unlock}
        loading={busy}
        onClick={() => actions.reopen(task)}
        className="task-row-action text-ink-3 hover:bg-muted hover:text-ink"
      >
        Reopen
      </Button>
    )
  }

  return (
    <article
      style={{ '--delay': `${Math.min(index, 6) * 35}ms` }}
      className={cn('task-row stagger-item', showRevision && 'task-row-revision')}
      aria-label={task.judul}
    >
      <span className="task-row-symbol" data-status={task.status} title={statusInfo.label}>
        <StatusIcon className="size-[19px]" strokeWidth={1.6} aria-hidden="true" />
      </span>

      <div className="task-row-content">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h4 className="task-row-title">{task.judul}</h4>
          {showStatusBadge && <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>}
          {task.dikunci && (
            <span className="text-ink-3" title="Approved & locked">
              <Lock className="size-3.5" aria-label="Approved and locked" />
            </span>
          )}
        </div>
        {task.deskripsi && (
          <p className="task-row-description">{task.deskripsi}</p>
        )}

        <div className="task-row-meta">
          {task.dikerjakan_oleh ? (
            <span className="task-row-assignee">
              <Avatar name={task.nama_pengerjakan || ''} size="xs" />
              <span className="truncate">{task.nama_pengerjakan}</span>
              {isMine && <span className="task-row-you">You</span>}
            </span>
          ) : (
            <span className="task-row-assignee">
              <CircleDashed className="size-3.5" strokeWidth={1.75} />
              Unassigned
            </span>
          )}
          {task.deadline && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" strokeWidth={1.75} />
              Due {formatDate(task.deadline)}
            </span>
          )}
          <span className="task-row-deadline" data-tone={deadline.tone}>
            <deadline.icon className="size-3.5" strokeWidth={1.75} />
            {deadline.label}
          </span>
          {task.status === 'done' && task.selesai_at && (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" strokeWidth={1.75} />
              Approved {formatDate(task.selesai_at)}
            </span>
          )}
        </div>

        {showRevision && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
              <MessageSquareWarning className="size-3.5 shrink-0" />
              Revision note
            </p>
            <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-amber-950">
              {task.catatan_revisi}
            </p>
          </div>
        )}
      </div>

      <div className="task-row-side">
        {weight > 0 && (
          <span className="task-row-weight" title="Contribution weight">
            <span>+{weight}%</span> contribution
          </span>
        )}
        {(primaryAction || secondaryAction) && (
          <div className="task-row-actions">
            {primaryAction}
            {secondaryAction}
          </div>
        )}
        {statusBanner}
      </div>
    </article>
  )
}

function AllTasksView({
  tasks,
  userId,
  isLeader,
  busyId,
  actions,
  weight,
  groupId,
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [memberFilter, setMemberFilter] = useState('all')

  const assignees = useMemo(() => {
    const map = new Map()
    for (const t of tasks) {
      if (t.dikerjakan_oleh && t.nama_pengerjakan) {
        map.set(t.dikerjakan_oleh, t.nama_pengerjakan)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [tasks])

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (memberFilter === 'unassigned' && t.dikerjakan_oleh) return false
      if (
        memberFilter !== 'all' &&
        memberFilter !== 'unassigned' &&
        t.dikerjakan_oleh !== memberFilter
      ) {
        return false
      }
      if (q) {
        const hay = `${t.judul || ''} ${t.deskripsi || ''} ${
          t.nama_pengerjakan || ''
        }`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [tasks, search, statusFilter, memberFilter])

  const reviewCount = useMemo(
    () => tasks.filter((t) => t.status === 'under_review').length,
    [tasks]
  )

  const hasActiveFilters =
    search.trim() !== '' || statusFilter !== 'all' || memberFilter !== 'all'

  return (
    <div className="space-y-4">
      {/* Leader quick review banner when tasks are waiting in review */}
      {isLeader && reviewCount > 0 && statusFilter !== 'under_review' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C5D1B8] bg-[#E7EBDD]/80 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-surface">
              <CheckCircle2 className="size-4" strokeWidth={2} />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink">
                {reviewCount} {reviewCount === 1 ? 'task is' : 'tasks are'} waiting
                for your review
              </p>
              <p className="text-xs text-ink-2">
                Approve completed work to lock tasks and record member contribution.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setStatusFilter('under_review')}
          >
            Focus In Review ({reviewCount})
          </Button>
        </div>
      )}

      <div className="task-workspace">
        <div className="task-toolbar">
          <div className="task-toolbar-heading">
            <h2>Tasks <span>{tasks.length}</span></h2>
            <p>Small steps. Shared progress.</p>
          </div>
          <div className="task-toolbar-controls">
            <div className="task-search">
              <Search className="size-4" strokeWidth={1.75} aria-hidden="true" />
              <input
                type="search"
                aria-label="Search tasks"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="task-member-filter">
              <Filter className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
              <select
                aria-label="Filter by assignee"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
              >
                <option value="all">All members</option>
                <option value="unassigned">Unassigned only</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.id === userId ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="task-filter-bar">
          <div className="task-status-filters" role="group" aria-label="Filter tasks by status">
            {[{ key: 'all', label: 'All tasks' }, ...COLUMNS].map((col) => {
              const active = statusFilter === col.key
              const count = col.key === 'all' ? tasks.length : tasks.filter((t) => t.status === col.key).length
              return (
                <button
                  key={col.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(col.key)}
                  className="task-status-filter"
                >
                  {col.dot && <span className={cn('size-1.5 shrink-0 rounded-full', col.dot)} />}
                  {col.label}
                  <span className="task-filter-count">{count}</span>
                </button>
              )
            })}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="task-filter-reset"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
                setMemberFilter('all')
              }}
            >
              <RotateCcw className="size-3" />
              Reset
            </button>
          )}
        </div>

        <div aria-live="polite" className="sr-only">
          {filteredTasks.length} matching tasks
        </div>
        {filteredTasks.length === 0 && hasActiveFilters ? (
          <div className="p-5">
            <EmptyState
              icon={Search}
              title="No matching tasks"
              description="Try a different search or clear your filters."
              action={
                <Button variant="secondary" size="sm" onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                  setMemberFilter('all')
                }}>
                  Clear filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="task-sections">
            {COLUMNS.filter((col) => statusFilter === 'all' || statusFilter === col.key).map((col) => {
              const items = filteredTasks.filter((t) => t.status === col.key)
              const meta = COLUMN_META[col.key]
              if (items.length === 0 && hasActiveFilters) return null
              return (
                <section key={col.key} aria-label={col.label} className="task-section">
                  <header className="task-section-heading">
                    <div className="flex items-center gap-2">
                      <span className={cn('size-1.5 rounded-full', col.dot)} />
                      <h3>{col.label}</h3>
                      <span className="task-section-count">{items.length}</span>
                    </div>
                    <span className="task-section-hint">
                      {{ todo: 'Ready to pick up', doing: 'Work in motion', under_review: 'Awaiting approval', done: 'Approved & completed' }[col.key]}
                    </span>
                  </header>
                  {items.length === 0 ? (
                    <div className="task-section-empty">
                      <span>{meta.emptyTitle}</span>
                      <span className="text-ink-3">{meta.emptyHint}</span>
                      {col.key === 'todo' && isLeader && tasks.length === 0 && (
                        <Link href={`/grup/${groupId}/susun`} className={buttonClass('secondary', 'sm')}>
                          Plan tasks
                        </Link>
                      )}
                    </div>
                  ) : items.map((task, idx) => (
                    <TaskCard
                      key={task.id}
                      index={idx}
                      task={task}
                      userId={userId}
                      isLeader={isLeader}
                      busy={busyId === task.id}
                      actions={actions}
                      weight={weight}
                    />
                  ))}
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function MyTasksView({
  tasks,
  userId,
  isLeader,
  busyId,
  actions,
  weight,
  onSwitchToAll,
}) {
  const [filter, setFilter] = useState('all')

  const myTasks = useMemo(
    () => tasks.filter((t) => t.dikerjakan_oleh === userId),
    [tasks, userId]
  )
  const openTasks = useMemo(
    () => tasks.filter((t) => t.status === 'todo'),
    [tasks]
  )

  const doingTasks = useMemo(
    () =>
      [...myTasks.filter((t) => t.status === 'doing')].sort((a, b) =>
        Boolean(b.catatan_revisi) - Boolean(a.catatan_revisi)
      ),
    [myTasks]
  )
  const reviewTasks = useMemo(
    () => myTasks.filter((t) => t.status === 'under_review'),
    [myTasks]
  )
  const doneTasks = useMemo(
    () => myTasks.filter((t) => t.status === 'done'),
    [myTasks]
  )
  const revisionCount = useMemo(
    () => doingTasks.filter((t) => t.catatan_revisi).length,
    [doingTasks]
  )

  const totalTasks = tasks.length
  const earnedContribution = totalTasks
    ? Number(((doneTasks.length / totalTasks) * 100).toFixed(1))
    : 0
  const potentialContribution = totalTasks
    ? Number(((myTasks.length / totalTasks) * 100).toFixed(1))
    : 0

  const tabs = [
    { key: 'all', label: 'All my tasks', count: myTasks.length },
    { key: 'doing', label: 'In Progress', count: doingTasks.length },
    { key: 'under_review', label: 'In Review', count: reviewTasks.length },
    { key: 'done', label: 'Completed', count: doneTasks.length },
    { key: 'open', label: 'Available to claim', count: openTasks.length },
  ]

  const displayedMine = useMemo(() => {
    if (filter === 'doing') return doingTasks
    if (filter === 'under_review') return reviewTasks
    if (filter === 'done') return doneTasks
    return [...doingTasks, ...reviewTasks, ...doneTasks]
  }, [filter, doingTasks, reviewTasks, doneTasks])

  return (
    <div className="space-y-5">
      {/* Personal Workspace Summary Strip */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-medium text-ink-3">Active work</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
              <AnimatedNumber value={doingTasks.length} />
            </p>
            <p className="mt-0.5 text-[11px] text-ink-3">
              {revisionCount > 0
                ? `${revisionCount} with revision note`
                : doingTasks.length > 0
                ? 'Ready to submit when done'
                : 'No tasks in progress'}
            </p>
          </div>
          <span
            className={cn(
              'flex size-10 items-center justify-center rounded-xl',
              revisionCount > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-peach text-[#6D5B2B]'
            )}
          >
            {revisionCount > 0 ? (
              <AlertCircle className="size-5" strokeWidth={1.75} />
            ) : (
              <Play className="size-5" strokeWidth={1.75} />
            )}
          </span>
        </Card>

        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-medium text-ink-3">Awaiting review</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
              <AnimatedNumber value={reviewTasks.length} />
            </p>
            <p className="mt-0.5 text-[11px] text-ink-3">
              {reviewTasks.length > 0
                ? 'Submitted to group leader'
                : 'Nothing pending review'}
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-lavender text-[#526044]">
            <Clock className="size-5" strokeWidth={1.75} />
          </span>
        </Card>

        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-medium text-ink-3">Approved tasks</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
              <AnimatedNumber value={doneTasks.length} />
            </p>
            <p className="mt-0.5 text-[11px] text-ink-3">
              Locked & counted in report
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-mint text-[#3B6241]">
            <CheckCircle2 className="size-5" strokeWidth={1.75} />
          </span>
        </Card>

        <Card
          tone="mint"
          className="flex items-center justify-between border-[#B9CFB7] p-4"
        >
          <div>
            <p className="text-xs font-medium text-[#35563A]">
              Your contribution
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums text-[#243E28]">
                <AnimatedNumber value={earnedContribution} suffix="%" />
              </span>
              {potentialContribution > earnedContribution && (
                <span className="text-xs text-[#436749]">
                  (up to {potentialContribution}%)
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-[#436749]">
              {doneTasks.length} of {totalTasks} group tasks approved
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#CFE2CE] text-[#2B4B30]">
            <Trophy className="size-5" strokeWidth={1.75} />
          </span>
        </Card>
      </div>

      {/* Revision Alert Banner if user has rejected tasks */}
      {revisionCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/90 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-900">
              <MessageSquareWarning className="size-4" strokeWidth={2} />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-amber-950">
                Changes requested on {revisionCount}{' '}
                {revisionCount === 1 ? 'task' : 'tasks'}
              </p>
              <p className="text-xs text-amber-900/80">
                Review the leader&apos;s feedback on your card below and resubmit
                when ready.
              </p>
            </div>
          </div>
          {filter !== 'doing' && filter !== 'all' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setFilter('doing')}
            >
              View task
            </Button>
          )}
        </div>
      )}

      {/* Personal Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface/80 p-2.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const active = filter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors',
                  active
                    ? 'bg-accent text-surface'
                    : 'text-ink-2 hover:bg-muted hover:text-ink'
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px] tabular-nums',
                    active ? 'bg-surface/20 text-surface' : 'bg-muted text-ink-3'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onSwitchToAll}
          className="inline-flex h-8 cursor-pointer items-center gap-1 px-2.5 text-xs font-medium text-accent hover:underline"
        >
          Browse full board
          <ArrowUpRight className="size-3.5" />
        </button>
      </div>

      {/* Main Content Area for My Tasks */}
      {filter === 'open' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-semibold text-ink">
                Open tasks you can claim ({openTasks.length})
              </h3>
              <p className="text-xs text-ink-3">
                Claiming a task assigns it to you and moves it to In Progress.
              </p>
            </div>
          </div>

          {openTasks.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All tasks are claimed"
              description="There are no unassigned tasks in To Do right now."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  Back to my tasks
                </Button>
              }
            />
          ) : (
            <div className="task-standalone-list">
              {openTasks.map((task, idx) => (
                <TaskCard
                  key={task.id}
                  index={idx}
                  task={task}
                  userId={userId}
                  isLeader={isLeader}
                  busy={busyId === task.id}
                  actions={actions}
                  weight={weight}
                  showStatusBadge
                />
              ))}
            </div>
          )}
        </div>
      ) : myTasks.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={UserCheck}
            title="You haven't claimed any tasks yet"
            description={
              openTasks.length > 0
                ? `There ${
                    openTasks.length === 1
                      ? 'is 1 open task'
                      : `are ${openTasks.length} open tasks`
                  } ready to claim below, or browse the full group board.`
                : 'All published tasks are currently assigned. Check the full board to see group progress.'
            }
            action={
              <Button variant="secondary" size="sm" onClick={onSwitchToAll}>
                View full group board
              </Button>
            }
          />

          {openTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#6D9D9E]" />
                  <h3 className="text-sm font-semibold text-ink">
                    Available to claim ({openTasks.length})
                  </h3>
                </div>
                <span className="text-xs text-ink-3">
                  Pick a task to start contributing
                </span>
              </div>
              <div className="task-standalone-list">
                {openTasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    index={idx}
                    task={task}
                    userId={userId}
                    isLeader={isLeader}
                    busy={busyId === task.id}
                    actions={actions}
                    weight={weight}
                    showStatusBadge
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : filter !== 'all' ? (
        displayedMine.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No tasks in this stage"
            description="Switch to 'All my tasks' to see everything assigned to you."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFilter('all')}
              >
                Show all my tasks
              </Button>
            }
          />
        ) : (
          <div className="task-standalone-list">
            {displayedMine.map((task, idx) => (
              <TaskCard
                key={task.id}
                index={idx}
                task={task}
                userId={userId}
                isLeader={isLeader}
                busy={busyId === task.id}
                actions={actions}
                weight={weight}
                showStatusBadge
              />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-6">
          {/* Active In Progress Section */}
          {doingTasks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#AA9560]" />
                  <h3 className="text-sm font-semibold text-ink">
                    In Progress
                  </h3>
                  <span className="rounded-full bg-peach px-2 py-0.5 text-xs font-semibold tabular-nums text-[#5E5027]">
                    {doingTasks.length}
                  </span>
                </div>
                <span className="text-xs text-ink-3">
                  Submit for review when finished
                </span>
              </div>
              <div className="task-standalone-list">
                {doingTasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    index={idx}
                    task={task}
                    userId={userId}
                    isLeader={isLeader}
                    busy={busyId === task.id}
                    actions={actions}
                    weight={weight}
                    showStatusBadge
                  />
                ))}
              </div>
            </section>
          )}

          {/* Waiting for Review Section */}
          {reviewTasks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#8A957C]" />
                  <h3 className="text-sm font-semibold text-ink">In Review</h3>
                  <span className="rounded-full bg-lavender px-2 py-0.5 text-xs font-semibold tabular-nums text-[#49543D]">
                    {reviewTasks.length}
                  </span>
                </div>
                <span className="text-xs text-ink-3">
                  Waiting for leader approval
                </span>
              </div>
              <div className="task-standalone-list">
                {reviewTasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    index={idx}
                    task={task}
                    userId={userId}
                    isLeader={isLeader}
                    busy={busyId === task.id}
                    actions={actions}
                    weight={weight}
                    showStatusBadge
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Section */}
          {doneTasks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#668D75]" />
                  <h3 className="text-sm font-semibold text-ink">Completed</h3>
                  <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-semibold tabular-nums text-[#35593E]">
                    {doneTasks.length}
                  </span>
                </div>
                <span className="text-xs text-ink-3">
                  Approved & recorded toward your contribution
                </span>
              </div>
              <div className="task-standalone-list">
                {doneTasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    index={idx}
                    task={task}
                    userId={userId}
                    isLeader={isLeader}
                    busy={busyId === task.id}
                    actions={actions}
                    weight={weight}
                    showStatusBadge
                  />
                ))}
              </div>
            </section>
          )}

          {/* Quick Claim Section if there are still open tasks in To Do */}
          {openTasks.length > 0 && (
            <section className="rounded-2xl border border-dashed border-line-strong bg-surface/50 p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#6D9D9E]" />
                  <h3 className="text-sm font-semibold text-ink">
                    More tasks available to claim ({openTasks.length})
                  </h3>
                </div>
                <span className="text-xs text-ink-3">
                  Unassigned tasks in To Do
                </span>
              </div>
              <div className="task-standalone-list">
                {openTasks.map((task, idx) => (
                  <TaskCard
                    key={task.id}
                    index={idx}
                    task={task}
                    userId={userId}
                    isLeader={isLeader}
                    busy={busyId === task.id}
                    actions={actions}
                    weight={weight}
                    showStatusBadge
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

export default function BoardPage() {
  const { groupId, user, isLeader, members, draftCount } = useGroup()
  const toast = useToast()

  const [tasks, setTasks] = useState(null)
  const [summary, setSummary] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [view, setView] = useState('all')

  const [reviewTask, setReviewTask] = useState(null)
  const [note, setNote] = useState('')
  const [sendingNote, setSendingNote] = useState(false)

  const load = useCallback(async () => {
    try {
      const [list, stats] = await Promise.all([
        Tugas.daftar(groupId),
        Grup.ringkasan(groupId),
      ])
      setTasks(list || [])
      setSummary(stats)
    } catch (err) {
      toast.error(err.message)
    }
  }, [groupId, toast])

  useEffect(() => {
    return Tugas.pantau(groupId, load)
  }, [groupId, load])

  const run = async (task, fn, message) => {
    setBusyId(task.id)
    try {
      await fn(task.id)
      toast.success(message)
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const actions = {
    claim: (t) =>
      run(t, TugasAnggota.ambil, 'Task claimed. It is now assigned to you.'),
    submit: (t) => run(t, TugasAnggota.selesaikan, 'Submitted for review'),
    release: (t) => run(t, TugasAnggota.lepas, 'Task released back to To Do'),
    unassign: (t) => run(t, TugasKetua.lepasPaksa, 'Task unassigned'),
    approve: (t) =>
      run(t, TugasKetua.setujui, 'Task approved and contribution recorded'),
    reopen: (t) => run(t, TugasKetua.bukaKembali, 'Task reopened'),
    requestChanges: (t) => {
      setReviewTask(t)
      setNote('')
    },
  }

  const submitChanges = async (e) => {
    e.preventDefault()
    if (!note.trim()) return toast.error('Please add a note for the assignee')
    setSendingNote(true)
    try {
      await TugasKetua.tolak(reviewTask.id, note.trim())
      toast.info('Sent back to the assignee with your note')
      setReviewTask(null)
      await load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSendingNote(false)
    }
  }

  if (!tasks) return <PageLoader label="Loading board" />

  const needsMembers = members.length < 2
  const total = summary?.total || tasks.length || 0
  const weight = total > 0 ? Number((100 / total).toFixed(1)) : 0

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      {isLeader && draftCount > 0 && (
        <Notice
          tone="accent"
          icon={FileText}
          title={`You have ${draftCount} unpublished ${
            draftCount === 1 ? 'draft' : 'drafts'
          }`}
          description={
            needsMembers
              ? 'Members cannot see drafts yet. Invite at least one more member before publishing.'
              : 'Members cannot see drafts until you publish them.'
          }
          action={
            <Link
              href={`/grup/${groupId}/susun`}
              className={buttonClass('primary', 'sm')}
            >
              Review drafts
            </Link>
          }
        />
      )}

      {isLeader && draftCount === 0 && tasks.length === 0 && (
        <Notice
          icon={ListChecks}
          title="No tasks published yet"
          description="Break the project into tasks, then publish them to this board so members can claim them."
          action={
            <Link
              href={`/grup/${groupId}/susun`}
              className={buttonClass('primary', 'sm')}
            >
              Plan tasks
            </Link>
          }
        />
      )}

      {!isLeader && tasks.length === 0 && (
        <Notice
          icon={Inbox}
          title="Nothing here yet"
          description="Your leader has not published any tasks. This board updates automatically when they do."
        />
      )}

      <ScrollReveal>
        <SummaryHeader
          summary={summary}
          tasks={tasks}
          userId={user.id}
          view={view}
          onViewChange={setView}
        />
      </ScrollReveal>

      {view === 'all' ? (
        <AllTasksView
          tasks={tasks}
          userId={user.id}
          isLeader={isLeader}
          busyId={busyId}
          actions={actions}
          weight={weight}
          groupId={groupId}
        />
      ) : (
        <MyTasksView
          tasks={tasks}
          userId={user.id}
          isLeader={isLeader}
          busyId={busyId}
          actions={actions}
          weight={weight}
          onSwitchToAll={() => setView('all')}
        />
      )}

      <Modal
        open={!!reviewTask}
        onClose={() => setReviewTask(null)}
        icon={RotateCcw}
        tone="amber"
        title="Request changes"
        description={
          reviewTask
            ? `"${reviewTask.judul}" will move back to In Progress for ${
                reviewTask.nama_pengerjakan || 'the assignee'
              }.`
            : ''
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewTask(null)}>
              Cancel
            </Button>
            <Button type="submit" form="changes-form" loading={sendingNote}>
              Send back
            </Button>
          </>
        }
      >
        <form id="changes-form" onSubmit={submitChanges}>
          <Field label="What needs to change?">
            <Textarea
              rows={4}
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Be specific so the assignee knows exactly what to fix."
              autoFocus
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}

