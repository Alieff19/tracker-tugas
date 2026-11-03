'use client'

import { useState } from 'react'
import { BarChart3, Check, CheckCircle2, Columns3, FileText, Lock, Play, RotateCcw, Send, ShieldCheck, Users } from 'lucide-react'
import { AnimatedNumber } from './motion'
import { Avatar, Button, Logo } from './ui'
import { COLUMNS } from './status'

const FIXED_TASKS = [
  { stage: 1, title: 'Implement RLS policies', person: 'Nadya', label: 'One owner', icon: Lock },
  { stage: 2, title: 'Kanban realtime sync', person: 'Alex', label: 'Awaiting leader review', icon: ShieldCheck },
  { stage: 3, title: 'Database schema & RPC', person: 'Sam', label: 'Approved · +20% share', icon: CheckCircle2 },
]
const STAGES = [
  { title: 'One task. Ready for you.', text: 'Claim a task to make it yours. Every task has one owner.', action: 'Claim task', icon: Play },
  { title: 'Assigned to you.', text: 'Your work stays in progress until you submit it for review.', action: 'Submit for review', icon: Send },
  { title: 'The leader takes a look.', text: 'A submitted task counts toward contribution after approval.', action: 'Approve as leader', icon: Check },
  { title: 'Approved. Your work counts.', text: 'One approved task out of five adds 20% to your contribution.', action: 'Try again', icon: RotateCcw },
]

export default function WorkflowDemo() {
  const [stage, setStage] = useState(0)
  const current = STAGES[stage]
  const progress = stage === 3 ? 60 : 40
  return (
    <div className="product-stage">
      <div className="stage-caption"><span><span className="live-dot" /> Your group. On the same page.</span><span>Interactive preview · Try the workflow</span></div>
      <div className="product-window">
        <aside className="preview-sidebar" aria-hidden="true">
          <Logo />
          <div className="preview-nav">
            <span><Columns3 size={14} /> Board</span>
            <span><FileText size={14} /> Plan tasks</span>
            <span><BarChart3 size={14} /> Contribution</span>
            <span><Users size={14} /> Members</span>
          </div>
          <div className="preview-sidebar-foot"><Avatar name="Alex" size="sm" /><span>Group workspace</span></div>
        </aside>
        <div className="preview-content">
          <div className="preview-title">
            <div><p className="mb-2 uppercase tracking-widest">Software Engineering</p><h3>Group 3 — Project board</h3><p>4/5 members <span className="mx-1">·</span> Code: 92d9c1</p></div>
            <span className="rounded-full bg-accent-soft px-2.5 py-1.5 text-[9px] text-accent">Interactive demo</span>
          </div>
          <div className="preview-progress">
            <span>Group progress</span>
            <div className="preview-progress-track"><span style={{ width: `${progress}%` }} /></div>
            <strong className="font-semibold text-accent"><AnimatedNumber value={progress} suffix="%" /></strong>
          </div>
          <div className="preview-board">
            {COLUMNS.map((column, index) => (
              <section className="preview-column" key={column.key} data-active={stage === index} aria-label={`${column.label} demo column`}>
                <div className="preview-column-header"><span className="inline-flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${column.dot}`} />{column.label}</span><span>{(index === 0 ? 0 : index === 3 ? 2 : 1) + (stage === index ? 1 : 0)}</span></div>
                {stage === index && (
                  <article key={stage} className="preview-task is-demo">
                    <span className="demo-task-tag">Try this task</span>
                    <h4>Write API documentation</h4>
                    <span className="preview-task-label">{stage === 0 ? 'Ready to claim' : stage === 1 ? 'Assigned to you' : stage === 2 ? 'In review' : 'Approved · +20% share'}</span>
                    <div className="preview-task-foot">{stage > 0 ? <><Avatar name="You" size="xs" />You</> : <><span className="size-4 rounded-full border border-dashed border-line-strong" />Unassigned</>}</div>
                  </article>
                )}
                {FIXED_TASKS.filter(task => task.stage === index).map(task => {
                  const Icon = task.icon
                  return <article className="preview-task" key={task.title}><h4>{task.title}</h4><span className="preview-task-label"><Icon size={9} />{task.label}</span><div className="preview-task-foot"><Avatar name={task.person} size="xs" />{task.person}</div></article>
                })}
                {index === 3 && <p className="demo-more">+ 1 more approved task</p>}
                {index === 0 && stage > 0 && <p className="px-1 py-4 text-[10px] leading-relaxed text-ink-3">Your task has moved to {COLUMNS[stage].label}.</p>}
              </section>
            ))}
          </div>
          <div className="demo-controls">
            <div className="demo-status" role="status" aria-live="polite" aria-atomic="true"><strong>{current.title}</strong>{current.text}</div>
            <div className="flex items-center gap-2">
              {stage > 0 && stage < 3 && <Button variant="ghost" size="sm" onClick={() => setStage(0)} icon={RotateCcw}>Reset</Button>}
              <Button size="sm" icon={current.icon} onClick={() => setStage(stage === 3 ? 0 : stage + 1)}>{current.action}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

