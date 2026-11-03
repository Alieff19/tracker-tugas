'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { Loader2, X } from 'lucide-react'

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/* ─── Button ─────────────────────────────────────────────────────────────── */

const BUTTON_BASE =
  'group/btn inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap transition-all duration-200 cursor-pointer select-none hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20'

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-surface border border-accent hover:bg-accent-hover hover:border-accent-hover shadow-[0_5px_12px_-6px_rgba(52,76,76,0.45)]',
  accent: 'bg-accent text-canvas border border-accent hover:bg-accent-hover',
  secondary:
    'bg-surface text-ink border border-line hover:bg-muted hover:border-line-strong',
  ghost: 'text-ink-2 border border-transparent hover:text-ink hover:bg-muted',
  danger:
    'bg-surface text-red-700 border border-line hover:bg-red-50 hover:border-red-200',
  dangerSolid: 'bg-red-600 text-canvas border border-red-600 hover:bg-red-700',
  success:
    'bg-[#4C7151] text-surface border border-[#4C7151] hover:bg-[#3D5E42]',
}

const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-[13px] gap-2',
  lg: 'h-12 px-6 text-[13px] gap-3',
  icon: 'size-8 p-0 text-sm',
}

export function buttonClass(variant = 'primary', size = 'md', className) {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : Icon ? (
        <Icon
          className="size-4 shrink-0 transition-transform duration-200 group-hover/btn:scale-110"
          strokeWidth={1.75}
        />
      ) : null}
      {children}
      {IconRight && !loading && (
        <IconRight
          className="size-4 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5"
          strokeWidth={1.75}
        />
      )}
    </button>
  )
}

/* ─── Form controls ──────────────────────────────────────────────────────── */

export const inputClass =
  'w-full h-11 rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-3 outline-none transition-all duration-200 focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:opacity-60'

export function Input({ className, icon: Icon, ...props }) {
  if (Icon) {
    return (
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
          strokeWidth={1.75}
        />
        <input className={cn(inputClass, 'pl-9', className)} {...props} />
      </div>
    )
  }
  return <input className={cn(inputClass, className)} {...props} />
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(inputClass, 'h-auto resize-none py-2 leading-relaxed', className)}
      {...props}
    />
  )
}

export function Field({ label, hint, optional, children, className }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="flex items-center justify-between text-[13px] font-medium text-ink">
        {label}
        {optional && (
          <span className="text-xs font-normal text-ink-3">Optional</span>
        )}
      </span>
      {children}
      {hint && <span className="block text-xs text-ink-3">{hint}</span>}
    </label>
  )
}

/* ─── Surfaces ───────────────────────────────────────────────────────────── */

const CARD_TONES = {
  default: 'border-line bg-surface',
  blue: 'border-accent/15 bg-accent-soft/65',
  mint: 'border-[#CBD9C9] bg-mint/80',
  peach: 'border-[#DADAC2] bg-peach/80',
}

export function Card({ className, tone = 'default', interactive = false, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border shadow-[0_2px_12px_rgba(52,76,76,0.025)]',
        CARD_TONES[tone] || CARD_TONES.default,
        interactive && 'card-interactive',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, description, action, icon: Icon }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-t-2xl border-b border-line bg-accent-soft/20 px-5 py-5">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <Icon className="mt-0.5 size-[18px] shrink-0 text-accent" strokeWidth={1.75} />
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[13px] text-ink-2">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}

/* ─── Badge ──────────────────────────────────────────────────────────────── */

const BADGE_TONES = {
  neutral: 'bg-muted text-ink-2 ring-line',
  blue: 'bg-[#E0EEEB] text-[#3F6966] ring-[#BED7D0]',
  amber: 'bg-[#F0EDD8] text-[#746333] ring-[#DBD6B5]',
  violet: 'bg-[#E7EBDD] text-[#586A47] ring-[#CBD4BE]',
  green: 'bg-[#E0EBDF] text-[#436749] ring-[#C2D6BF]',
  red: 'bg-red-50 text-red-700 ring-red-200/80',
  accent: 'bg-accent-soft text-accent ring-accent/20',
}

export function Badge({ tone = 'neutral', icon: Icon, children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 ring-1 ring-inset',
        BADGE_TONES[tone],
        className
      )}
    >
      {Icon && <Icon className="size-3" strokeWidth={2} />}
      {children}
    </span>
  )
}

/* ─── Avatar ─────────────────────────────────────────────────────────────── */

const AVATAR_TONES = [
  'bg-[#D5E7E0] text-[#344C4C]',
  'bg-[#E6E3C7] text-[#655E37]',
  'bg-[#D9E5CF] text-[#415B3E]',
  'bg-[#D5E2DF] text-[#3F5C58]',
  'bg-[#E8DCD2] text-[#745D4C]',
  'bg-[#DDE0D3] text-[#58624B]',
]

const AVATAR_SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
}

export function Avatar({ name = '', size = 'md', className }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || 'U'
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        AVATAR_TONES[hash % AVATAR_TONES.length],
        AVATAR_SIZES[size],
        className
      )}
    >
      {initials}
    </span>
  )
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */

const ICON_TONES = {
  neutral: 'bg-muted text-ink-2',
  accent: 'bg-accent-soft text-accent',
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  tone = 'neutral',
  children,
  footer,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div role="dialog" aria-modal="true" aria-label={title} className="modal-pop relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface shadow-2xl shadow-ink/10">
        <div className="flex items-start gap-3 px-5 pt-5">
          {Icon && (
            <div
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                ICON_TONES[tone]
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.75} />
            </div>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
            {description && (
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex size-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-muted hover:text-ink"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>
        {children ? <div className="px-5 py-4">{children}</div> : <div className="h-5" />}
        {footer && (
          <div className="flex justify-end gap-2 rounded-b-2xl border-t border-line bg-muted/50 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Feedback ───────────────────────────────────────────────────────────── */

export function PageLoader({ label = 'Loading', fullscreen = false }) {
  return (
    <div
      className={cn(
        'fade-in flex items-center justify-center gap-2.5 text-[13px] text-ink-3',
        fullscreen ? 'min-h-screen' : 'min-h-[50vh]'
      )}
    >
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'fade-in flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong px-6 py-14 text-center',
        className
      )}
    >
      {Icon && (
        <div className="animate-float mb-4 flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-ink-2">
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-2">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

const NOTICE_TONES = {
  neutral: 'bg-surface border-line',
  accent: 'bg-accent-soft/50 border-accent/20',
  amber: 'bg-amber-50/60 border-amber-200/80',
}

export function Notice({ icon: Icon, title, description, action, tone = 'neutral' }) {
  return (
    <div
      className={cn(
        'stagger-item flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center',
        NOTICE_TONES[tone]
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            ICON_TONES[tone]
          )}
        >
          <Icon className="size-[18px]" strokeWidth={1.75} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && (
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* ─── Segmented control ─────────────────────────────────────────────────── */

export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium transition-all duration-200',
            value === o.value
              ? 'bg-accent-soft text-accent shadow-xs ring-1 ring-accent/15'
              : 'text-ink-2 hover:text-ink'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ─── Clipboard ──────────────────────────────────────────────────────────── */

export function useCopy() {
  const [copied, setCopied] = useState(null)
  const copy = useCallback(async (text, key = 'default') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 1600)
      return true
    } catch {
      return false
    }
  }, [])
  return { copied, copy }
}

/* ─── Brand ──────────────────────────────────────────────────────────────── */

export function LogoMark({ className = 'size-9' }) {
  return (
    <Image src="/logo.svg" alt="" width={203} height={203} loading="eager" className={cn('shrink-0 object-contain', className)} />
  )
}

export function Logo({ className }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-xl font-semibold tracking-[-0.06em] text-ink">GoTaks<span className="text-accent/50">.</span></span>
    </span>
  )
}

export function GoogleIcon({ className = 'size-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
      />
    </svg>
  )
}
