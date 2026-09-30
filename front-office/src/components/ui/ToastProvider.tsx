import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { ToastContext } from '../../hooks/useToast'
import type { NotifyOptions, ToastTone } from '../../hooks/useToast'
import { cn } from '../../utils/cn'

interface Toast {
  id: number
  message: string
  detail?: string
  tone: ToastTone
}

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info }
const STYLES: Record<ToastTone, string> = {
  success: 'border-stable-border bg-stable-bg text-stable',
  error: 'border-critical-border bg-critical-bg text-critical',
  info: 'border-border bg-surface text-ink',
}

// Lightweight confirmation toasts for completed actions. Deliberately
// short-lived and quiet — a confirmation, not an animation showcase.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, { tone = 'success', detail }: NotifyOptions = {}) => {
      const id = ++idRef.current
      setToasts((current) => [...current, { id, message, detail, tone }])
      setTimeout(() => dismiss(id), 4000)
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone] ?? Info
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-2.5 rounded-lg border px-4 py-3 shadow-sm',
                'transition duration-150',
                STYLES[toast.tone] ?? STYLES.info,
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{toast.message}</p>
                {toast.detail ? <p className="mt-0.5 text-xs opacity-80">{toast.detail}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
