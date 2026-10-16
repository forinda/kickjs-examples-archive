import { useSyncExternalStore } from 'react'

/**
 * Flash messages as toasts. The store lives outside React, so a toast survives
 * the page change it arrived with, and main.tsx feeds it from Inertia's `flash`
 * event — fired once per response that carries flash data. Inertia keeps flash
 * out of browser history, and the session drops it after one response, so a
 * dismissed toast doesn't come back on back/forward or reload.
 */
export interface Toast {
  id: number
  kind: 'success' | 'error'
  message: string
}

const DISMISS_AFTER_MS = 4000
const NONE: Toast[] = []
let toasts: Toast[] = NONE
let nextId = 1
const listeners = new Set<() => void>()

function emit(next: Toast[]) {
  toasts = next
  for (const listener of listeners) listener()
}

export function dismissToast(id: number) {
  emit(toasts.filter((t) => t.id !== id))
}

export function pushFlash(flash: Record<string, unknown>) {
  for (const kind of ['success', 'error'] as const) {
    const message = flash[kind]
    if (typeof message !== 'string') continue
    const id = nextId++
    emit([...toasts, { id, kind, message }])
    setTimeout(() => dismissToast(id), DISMISS_AFTER_MS)
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function Toasts() {
  // The server snapshot is empty: toasts only exist in the browser.
  const list = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => NONE,
  )
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}`}>
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
