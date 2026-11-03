'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, BarChart3, Columns3, FileCheck2, Lock, ShieldCheck } from 'lucide-react'
import { Auth } from '@/lib/api'
import { Avatar, Logo, LogoMark, buttonClass } from '@/components/ui'
import { ScrollProgress, ScrollReveal, TiltSurface } from '@/components/motion'
import WorkflowDemo from '@/components/WorkflowDemo'

const FEATURES = [
  { icon: Lock, tone: 'forest', title: 'Single-owner task locking', description: 'When a member claims a task from To Do, it locks to their account immediately so two people never duplicate the same work.' },
  { icon: ShieldCheck, tone: 'cream', title: 'Leader review workflow', description: 'Finished tasks move to In Review first. The group leader either approves the work or sends it back with clear revision notes.' },
  { icon: BarChart3, tone: 'sage', title: 'Verifiable contribution report', description: 'Every approved task updates each member’s contribution share automatically. Export a clean PDF report for your lecturer in one click.' },
]
const WORKFLOW_STEPS = [
  { step: '01', title: 'Create a group & invite teammates', description: 'Start a group to become the Leader, then share your 6-character invite code with 1 to 4 teammates (2–5 members total).' },
  { step: '02', title: 'Draft & publish tasks', description: 'Prepare tasks privately as drafts with descriptions and due dates, then publish them to the live Kanban board.' },
  { step: '03', title: 'Claim, review & export proof', description: 'Members claim and submit tasks, the leader reviews and approves them, and GoTaks calculates everyone’s exact contribution.' },
]

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    Auth.userSaatIni().then(setUser).catch(() => setUser(null)).finally(() => setReady(true))
  }, [])
  const startHref = user ? '/dashboard' : '/login?mode=signup'
  return (
    <div className="hero-wash min-h-screen overflow-x-clip text-ink">
      <ScrollProgress />
      <header className="site-wrap site-nav">
        <Link href="/" aria-label="GoTaks home"><Logo /></Link>
        <nav className="site-nav-links" aria-label="Main navigation"><a href="#board">The board</a><a href="#features">Why GoTaks</a><a href="#workflow">How it works</a></nav>
        <div className="site-nav-actions">
          {ready && user ? <Link href="/dashboard" className={buttonClass('primary')}>Open dashboard <ArrowUpRight size={15} /></Link> : <><Link href="/login" className={buttonClass('ghost')}>Sign in</Link><Link href="/login?mode=signup" className={buttonClass('primary')}>Get started <ArrowUpRight size={14} /></Link></>}
        </div>
      </header>
      <main>
        <section className="site-wrap site-hero">
          <div className="hero-eyebrow hero-enter"><span className="live-dot" />Group task tracker & contribution ledger</div>
          <h1>
            <span className="hero-line"><span className="hero-enter" style={{ '--enter-delay':'80ms' }}>Fair group projects</span></span>
            <span className="hero-line"><span className="hero-enter hero-muted" style={{ '--enter-delay':'160ms' }}>with&nbsp;</span><span className="hero-enter hero-accent" style={{ '--enter-delay':'230ms' }}>measurable</span></span>
            <span className="hero-line"><span className="hero-enter" style={{ '--enter-delay':'300ms' }}>contribution.</span></span>
          </h1>
          <div className="hero-enter" style={{ '--enter-delay':'380ms' }}>
            <p className="hero-description">GoTaks pairs a real-time Kanban board with leader review and an automatic contribution report you can export as proof of work for your lecturer.</p>
            <div className="hero-actions"><Link href={startHref} className={buttonClass('primary','lg')}>{user ? 'Go to dashboard' : 'Start a group project'}<ArrowUpRight size={16} /></Link><a href="#board" className={buttonClass('secondary','lg')}>Explore the board <ArrowRight size={15} /></a></div>
          <div className="hero-note"><div className="hero-avatars"><Avatar name="Alex" size="sm" /><Avatar name="Nadya" size="sm" /><Avatar name="Sam" size="sm" /></div><span>Built for student coursework teams.</span><Link href="/login" className="underline underline-offset-2">Get started</Link></div>
          </div>
        </section>
        <section id="board" className="site-wrap" aria-label="Interactive GoTaks board preview">
          <ScrollReveal><WorkflowDemo /></ScrollReveal>
          <div className="product-tags"><span><Columns3 size={13} />Real-time Kanban</span><span><Lock size={13} />One task, one owner</span><span><ShieldCheck size={13} />Leader review</span><span><FileCheck2 size={13} />PDF contribution report</span></div>
        </section>
        <ScrollReveal className="site-wrap editorial-intro"><span className="section-kicker">( A better way to work together )</span><p>Group work, with everyone accounted for. <span>Plan the tasks, share the work, and let every contribution speak for itself.</span></p></ScrollReveal>
        <section id="features" className="site-wrap features-section">
          <ScrollReveal className="section-heading"><div><p className="section-kicker">( Why GoTaks )</p><h2>Built specifically for<br />student coursework teams.</h2></div><span className="section-index">01 — The essentials</span></ScrollReveal>
          <div className="feature-grid">{FEATURES.map((feature,index) => {
            const Icon = feature.icon
            return <ScrollReveal key={feature.title} delay={index*90}><TiltSurface><article className={`feature-panel ${feature.tone}`}><div className="feature-panel-top"><span>0{index+1}</span><span>GoTaks / together</span></div><div className="feature-symbol"><Icon size={25} strokeWidth={1.25} /></div><h3>{feature.title}</h3><p>{feature.description}</p></article></TiltSurface></ScrollReveal>
          })}</div>
        </section>
        <section id="workflow" className="workflow-section"><div className="site-wrap">
          <ScrollReveal className="section-heading"><div><p className="section-kicker">( How it works )</p><h2>From task breakdown<br />to graded report.</h2></div><span className="section-index">02 — Three simple steps</span></ScrollReveal>
          <div className="workflow-grid">{WORKFLOW_STEPS.map((step,index) => <ScrollReveal key={step.step} delay={index*100}><article className="workflow-item"><span className="workflow-number">{step.step}</span><h3>{step.title}</h3><p>{step.description}</p></article></ScrollReveal>)}</div>
        </div></section>
        <ScrollReveal className="site-wrap closing-section">
          <div><h2>A shared project.<br /><span>A contribution that counts.</span></h2><p>Start organizing coursework with your team. From the first draft to the final contribution report, it all comes together in GoTaks.</p><div className="closing-actions"><Link href={startHref} className="closing-button">{user ? 'Go to dashboard' : 'Start a group project'}<ArrowUpRight size={16} /></Link></div></div>
          <div className="animate-float"><LogoMark className="closing-mascot" /></div>
        </ScrollReveal>
      </main>
      <footer className="site-wrap site-footer"><div className="footer-top"><Link href="/" aria-label="GoTaks home"><Logo /></Link><p>GoTaks — Powered by Supabase PostgreSQL RLS & Next.js</p><a href="#" className="inline-flex items-center gap-2 text-xs text-ink-2">Back to top <ArrowUpRight size={14} /></a></div><div className="footer-wordmark" aria-hidden="true">GoTaks.</div></footer>
    </div>
  )
}

