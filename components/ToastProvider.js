'use client'

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: { Icon: CheckCircle2, className: 'text-emerald-600' },
  error: { Icon: AlertCircle, className: 'text-red-600' },
  info: { Icon: Info, className: 'text-accent' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback(
    (message, type = 'info') => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev.slice(-3), { id, message, type }])
      setTimeout(() => remove(id), 4000)
    },
    [remove]
  )

  // Stable object so consumers can safely list `toast` in hook dependencies
  const toast = useMemo(
    () => ({
      success: (msg) => add(msg, 'success'),
      error: (msg) => add(msg, 'error'),
      info: (msg) => add(msg, 'info'),
    }),
    [add]
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 print:hidden">
        {toasts.map((t) => {
          const { Icon, className } = ICONS[t.type] || ICONS.info
          return (
            <div
              key={t.id}
              role="status"
              className="toast-in pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-lg shadow-ink/5"
            >
              <Icon className={`mt-px size-4 shrink-0 ${className}`} strokeWidth={2} />
              <p className="flex-1 text-[13px] leading-snug text-ink">{t.message}</p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label="Dismiss"
                className="text-ink-3 transition-colors hover:text-ink"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
