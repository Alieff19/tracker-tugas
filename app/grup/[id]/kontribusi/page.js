'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, CheckCircle2, ClipboardList, Printer, Scale, Sigma } from 'lucide-react'
import { Grup, Tugas } from '@/lib/api'
import { useGroup } from '@/components/GroupContext'
import { useToast } from '@/components/ToastProvider'
import { ROLE, formatDate } from '@/components/status'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, PageLoader } from '@/components/ui'
import { AnimatedNumber, ScrollReveal } from '@/components/motion'

function Metric({ icon: Icon, label, value, hint, delay = 0, tone = 'blue' }) {
  return (
    <ScrollReveal delay={delay} variant="up">
      <Card interactive tone={tone} className="h-full p-6 print:break-inside-avoid">
        <p className="hover-wiggle flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
          <Icon className="size-4 text-accent" strokeWidth={1.75} />
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-ink">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
      </Card>
    </ScrollReveal>
  )
}

export default function ContributionPage() {
  const { groupId, group } = useGroup()
  const toast = useToast()

  const [rows, setRows] = useState(null)
  const [summary, setSummary] = useState(null)
  const [tasks, setTasks] = useState([])

  const load = useCallback(async () => {
    try {
      const [contribution, stats, list] = await Promise.all([
        Grup.kontribusi(groupId),
        Grup.ringkasan(groupId),
        Tugas.daftar(groupId),
      ])
      setRows(contribution || [])
      setSummary(stats)
      setTasks(list || [])
    } catch (err) {
      toast.error(err.message)
    }
  }, [groupId, toast])

  useEffect(() => {
    return Tugas.pantau(groupId, load)
  }, [groupId, load])

  if (!rows) return <PageLoader label="Calculating contribution" />

  const total = summary?.total || 0
  const weight = total ? Number((100 / total).toFixed(1)) : 0
  const completed = tasks.filter((t) => t.status === 'done')
  const leader = rows.find((r) => r.role === 'ketua')
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 print:max-w-none print:p-0">
      {/* Print-only header */}
      <div className="hidden border-b border-ink pb-4 print:block">
        <p className="text-xs uppercase tracking-widest text-ink-3">GoTaks contribution report</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{group.nama}</h1>
        <p className="mt-1 text-xs text-ink-2">
          Invite code {group.kode_undangan} · Generated {today}
        </p>
      </div>

      <ScrollReveal className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <h2 className="text-3xl font-medium tracking-[-0.05em] text-ink">Contribution report</h2>
          <p className="mt-0.5 text-[13px] text-ink-2">
            Calculated from approved tasks, including former members. On-time credit uses the submission date in Jakarta time.
          </p>
        </div>
        <Button icon={Printer} onClick={() => window.print()}>
          Export PDF
        </Button>
      </ScrollReveal>

      <div className="grid gap-4 sm:grid-cols-3 print:grid-cols-3">
        <Metric
          delay={0}
          icon={ClipboardList}
          label="Published tasks"
          value={<AnimatedNumber value={total} />}
          hint={`${summary?.done || 0} approved · ${summary?.progress_persen || 0}% complete`}
        />
        <Metric
          delay={70}
          tone="mint"
          icon={Scale}
          label="Weight per task"
          value={<AnimatedNumber value={weight} suffix="%" />}
          hint={`100% divided by ${total || 0} tasks`}
        />
        <Metric
          delay={140}
          tone="peach"
          icon={Sigma}
          label="Formula"
          value="done ÷ total × 100"
          hint="Per member, approved tasks only"
        />
      </div>

      <ScrollReveal delay={160}>
        <Card className="overflow-hidden print:break-inside-avoid">
          <CardHeader icon={BarChart3} title="By member" description={`${rows.length} ${rows.length === 1 ? 'member' : 'members'}`} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-muted/50 text-xs font-medium text-ink-3">
                  <th className="px-5 py-2.5 font-medium">Member</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 text-right font-medium">Claimed</th>
                  <th className="px-4 py-2.5 text-right font-medium">Approved</th>
                  <th className="px-4 py-2.5 text-right font-medium">On time</th>
                  <th className="w-64 px-5 py-2.5 font-medium">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r, idx) => {
                  const pct = Number(r.persen_kontribusi || 0)
                  const role = ROLE[r.role] || ROLE.member
                  return (
                    <tr
                      key={r.anggota_id}
                      style={{ '--delay': `${idx * 65}ms` }}
                      className="stagger-item transition-colors hover:bg-muted/40"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.nama_anggota || ''} size="sm" />
                          <span className="font-medium text-ink">{r.nama_anggota}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={role.tone}>{role.label}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-ink-2">
                        <AnimatedNumber value={r.tugas_diambil} />
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium tabular-nums text-ink">
                        <AnimatedNumber value={r.tugas_selesai} />
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-ink-2">
                        <AnimatedNumber value={r.tepat_waktu} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="progress-shimmer relative h-2 flex-1 overflow-hidden rounded-full bg-muted print:border print:border-line">
                            <div
                              className="h-full rounded-full bg-ink transition-all duration-700 ease-out"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className="w-12 text-right font-semibold tabular-nums text-ink">
                            <AnimatedNumber value={pct} suffix="%" />
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </ScrollReveal>

      <ScrollReveal delay={220}>
        <Card className="overflow-hidden">
          <CardHeader
            icon={CheckCircle2}
            title="Approved tasks"
            description="Every task below was submitted by a member and approved by the leader."
          />
          {completed.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No approved tasks yet" description="Approved tasks will be listed here." className="m-5" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-muted/50 text-xs text-ink-3">
                    <th className="w-12 px-5 py-2.5 font-medium">#</th>
                    <th className="px-4 py-2.5 font-medium">Task</th>
                    <th className="px-4 py-2.5 font-medium">Completed by</th>
                    <th className="px-4 py-2.5 font-medium">Due</th>
                    <th className="px-4 py-2.5 font-medium">Submitted</th>
                    <th className="px-5 py-2.5 font-medium">Approved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {completed.map((t, i) => (
                    <tr
                      key={t.id}
                      style={{ '--delay': `${i * 50}ms` }}
                      className="stagger-item align-top transition-colors hover:bg-muted/40 print:break-inside-avoid"
                    >
                      <td className="px-5 py-3 tabular-nums text-ink-3">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{t.judul}</p>
                        {t.deskripsi && <p className="mt-0.5 line-clamp-2 text-xs text-ink-3">{t.deskripsi}</p>}
                      </td>
                      <td className="px-4 py-3 text-ink-2">{t.nama_pengerjakan || '-'}</td>
                      <td className="px-4 py-3 text-ink-2">{t.deadline ? formatDate(t.deadline) : 'None'}</td>
                      <td className="px-4 py-3 text-ink-2">{t.submitted_at ? formatDate(t.submitted_at) : '-'}</td>
                      <td className="px-5 py-3 text-ink-2">{t.selesai_at ? formatDate(t.selesai_at) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </ScrollReveal>

      {/* Print-only signatures */}
      <div className="hidden grid-cols-2 gap-16 pt-12 text-center text-sm print:grid">
        <div>
          <p className="text-ink-2">Acknowledged by, Lecturer</p>
          <div className="mx-auto mt-20 w-56 border-t border-ink pt-1.5 text-ink-3">Name and signature</div>
        </div>
        <div>
          <p className="text-ink-2">Group leader</p>
          <div className="mx-auto mt-20 w-56 border-t border-ink pt-1.5 font-medium text-ink">
            {leader?.nama_anggota || 'Group leader'}
          </div>
        </div>
      </div>
    </div>
  )
}
