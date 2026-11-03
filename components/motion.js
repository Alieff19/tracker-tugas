'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from './ui'

// Content remains visible before hydration, without JS, and when printing.
export function ScrollReveal({ children, delay = 0, variant = 'up', className, once = true, threshold = 0.1 }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let observer
    const setup = () => {
      observer?.disconnect()
      el.removeAttribute('data-reveal-state')
      if (preference.matches) return
      const rect = el.getBoundingClientRect()
      // Keep above-the-fold content immediately available.
      if (rect.top < window.innerHeight && rect.bottom > 0) return
      el.dataset.revealState = 'pending'
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.revealState = 'visible'
          if (once) observer.unobserve(el)
        } else if (!once) {
          el.dataset.revealState = 'pending'
        }
      }, { threshold, rootMargin: '0px 0px -24px 0px' })
      observer.observe(el)
    }
    setup()
    preference.addEventListener('change', setup)
    return () => {
      observer?.disconnect()
      preference.removeEventListener('change', setup)
      el.removeAttribute('data-reveal-state')
    }
  }, [once, threshold])
  return <div ref={ref} data-variant={variant} style={{ '--reveal-delay': `${Math.min(delay, 350)}ms` }} className={cn('reveal-block', className)}>{children}</div>
}

export function AnimatedNumber({ value = 0, suffix = '', duration = 650 }) {
  const target = Number(value) || 0
  const [display, setDisplay] = useState(target)
  const current = useRef(0)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame
    const finish = () => { cancelAnimationFrame(frame); current.current = target; setDisplay(target) }
    if (preference.matches || duration <= 0) { finish(); return }
    const from = current.current
    let start
    const step = (time) => {
      if (start === undefined) start = time
      const progress = Math.min((time - start) / duration, 1)
      const next = from + (target - from) * (1 - (1 - progress) ** 3)
      current.current = next
      setDisplay(Number.isInteger(target) ? Math.round(next) : Number(next.toFixed(1)))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    preference.addEventListener('change', finish)
    return () => { cancelAnimationFrame(frame); preference.removeEventListener('change', finish) }
  }, [target, duration])
  return <span className="tabular-nums"><span aria-hidden="true" className="number-live">{display}{suffix}</span><span className="number-value">{target}{suffix}</span></span>
}

export function TiltSurface({ children, className }) {
  const ref = useRef(null)
  const frame = useRef()
  const bounds = useRef(null)
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  const reset = () => {
    cancelAnimationFrame(frame.current)
    bounds.current = null
    ref.current?.style.setProperty('--tilt-x', '0deg')
    ref.current?.style.setProperty('--tilt-y', '0deg')
  }
  const move = (event) => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return
    const rect = bounds.current || el.getBoundingClientRect()
    bounds.current = rect
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--tilt-x', `${(0.5 - y) * 4}deg`)
      el.style.setProperty('--tilt-y', `${(x - 0.5) * 4}deg`)
      el.style.setProperty('--pointer-x', `${x * 100}%`)
      el.style.setProperty('--pointer-y', `${y * 100}%`)
    })
  }
  return <div ref={ref} className={cn('tilt-surface', className)} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}>{children}</div>
}

export function ScrollProgress() {
  const ref = useRef(null)
  useEffect(() => {
    let frame
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const range = document.documentElement.scrollHeight - window.innerHeight
        const progress = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0
        if (ref.current) ref.current.style.transform = `scaleX(${progress})`
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [])
  return <div ref={ref} className="scroll-progress" aria-hidden="true" />
}

export function RouteTransition({ children }) {
  const pathname = usePathname()
  return <div key={pathname} className="workspace-page">{children}</div>
}

