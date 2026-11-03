'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CalendarDays, FileText, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { Tugas, TugasKetua } from '@/lib/api'
import { useGroup } from '@/components/GroupContext'
import { useToast } from '@/components/ToastProvider'
import { formatDate } from '@/components/status'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  Notice,
  PageLoader,
  Textarea,
} from '@/components/ui'
import { ScrollReveal } from '@/components/motion'

function TaskForm({ id, values, onChange, onSubmit }) {
  const set = (key) => (e) => onChange({ ...values, [key]: e.target.value })
  return (
    <form id={id} onSubmit={onSubmit} className="space-y-4">
      <Field label="Title">
        <Input
          required
          value={values.title}
          onChange={set('title')}
          placeholder="e.g. Draft the database schema"
        />
      </Field>
      <Field label="Description" optional>
        <Textarea
          rows={3}
          value={values.description}
          onChange={set('description')}
          placeholder="Acceptance criteria, links, or notes"
        />
      </Field>
      <Field label="Due date" optional>
        <Input type="date" value={values.due} onChange={set('due')} />
      </Field>
    </form>
  )
}

const EMPTY = { title: '', description: '', due: '' }

const toPayload = (v) => ({
  judul: v.title.trim(),
  deskripsi: v.description.trim() || null,
  deadline: v.due || null,
})

export default function PlanPage() {
  const { groupId, isLeader, members, group, setDraftCount } = useGroup()
  const router = useRouter()
  const toast = useToast()

  const [drafts, setDrafts] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [adding, setAdding] = useState(false)

  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const load = useCallback(async () => {
    try {
      setDrafts((await Tugas.daftarDraft(groupId)) || [])
    } catch (err) {
      toast.error(err.message)
    }
  }, [groupId, toast])

  useEffect(() => {
    if (!isLeader) {
      router.replace(`/grup/${groupId}`)
      return
    }
    load()
  }, [isLeader, groupId, router, load])

  useEffect(() => {
    if (drafts) setDraftCount(drafts.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts])

  const addDraft = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setAdding(true)
    try {
      const created = await TugasKetua.tambah(groupId, toPayload(form))
      setDrafts((prev) => [...prev, created])
      setForm(EMPTY)
      toast.success('Draft added')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAdding(false)
    }
  }

  const openEdit = (task) => {
    setEditing(task)
    setEditForm({
      title: task.judul || '',
      description: task.deskripsi || '',
      due: task.deadline || '',
    })
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!editForm.title.trim()) return
    setSaving(true)
    try {
      const updated = await TugasKetua.edit(editing.id, toPayload(editForm))
      setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      setEditing(null)
      toast.success('Draft updated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const removeDraft = async (task) => {
    try {
      await TugasKetua.hapus(task.id)
      setDrafts((prev) => prev.filter((d) => d.id !== task.id))
      toast.info('Draft deleted')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const publish = async () => {
    setPublishing(true)
    try {
      const count = await TugasKetua.kirim(groupId)
      toast.success(`${count} ${count === 1 ? 'task' : 'tasks'} published to the board`)
      setDraftCount(0)
      setConfirmOpen(false)
      router.push(`/grup/${groupId}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPublishing(false)
    }
  }

  if (!isLeader || !drafts) return <PageLoader label="Loading drafts" />

  const canPublish = members.length >= 2 && drafts.length > 0

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      {members.length < 2 && (
        <Notice
          tone="amber"
          icon={AlertTriangle}
          title="Invite at least one more member to publish"
          description={`You can keep drafting now. Share the invite code ${group.kode_undangan} so a teammate can join.`}
        />
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[360px_1fr]">
        <ScrollReveal variant="left">
          <Card>
            <CardHeader
              icon={Plus}
              title="New task"
              description="Drafts stay private until you publish them."
            />
            <div className="p-5">
              <TaskForm id="new-task-form" values={form} onChange={setForm} onSubmit={addDraft} />
              <Button type="submit" form="new-task-form" icon={Plus} loading={adding} className="mt-5 w-full">
                Add draft
              </Button>
            </div>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={80} variant="up">
          <Card>
            <CardHeader
              icon={FileText}
              title={`Drafts (${drafts.length})`}
              description="Review before publishing. Published tasks appear in To Do for everyone."
              action={
                <Button icon={Send} disabled={!canPublish} onClick={() => setConfirmOpen(true)}>
                  Publish {drafts.length > 0 ? drafts.length : ''}
                </Button>
              }
            />
            <div className="p-3">
              {drafts.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No drafts yet"
                  description="Add tasks using the form. You can edit or delete them until they are published."
                  className="m-2"
                />
              ) : (
                <ul className="divide-y divide-line">
                  {drafts.map((task, i) => (
                    <li
                      key={task.id}
                      style={{ '--delay': `${i * 50}ms` }}
                      className="stagger-item group flex items-start gap-4 rounded-lg px-3 py-3.5 transition-all duration-200 hover:translate-x-1 hover:bg-muted/50"
                    >
                      <span className="mt-0.5 w-6 shrink-0 text-xs font-medium tabular-nums text-ink-3">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{task.judul}</p>
                        {task.deskripsi && (
                          <p className="mt-1 line-clamp-2 whitespace-pre-line text-[13px] text-ink-2">
                            {task.deskripsi}
                          </p>
                        )}
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-3">
                          <CalendarDays className="size-3.5" strokeWidth={1.75} />
                          {task.deadline ? `Due ${formatDate(task.deadline)}` : 'No due date'}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(task)} aria-label="Edit draft">
                          <Pencil className="size-4" strokeWidth={1.75} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDraft(task)}
                          aria-label="Delete draft"
                          className="hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="size-4" strokeWidth={1.75} />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </ScrollReveal>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        icon={Pencil}
        title="Edit draft"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-task-form" loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        <TaskForm id="edit-task-form" values={editForm} onChange={setEditForm} onSubmit={saveEdit} />
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        icon={Send}
        tone="accent"
        title={`Publish ${drafts.length} ${drafts.length === 1 ? 'task' : 'tasks'}?`}
        description="Published tasks move to To Do and can be claimed by any member right away. You can still add more tasks later."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Keep editing
            </Button>
            <Button icon={Send} loading={publishing} onClick={publish}>
              Publish now
            </Button>
          </>
        }
      />
    </div>
  )
}
