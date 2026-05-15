// In-memory map of documentId → AbortController for active processing jobs.
// Single-process only — sufficient for this architecture (no message queue).
const active = new Map<string, AbortController>()

export function register(documentId: string): AbortController {
  const ctrl = new AbortController()
  active.set(documentId, ctrl)
  return ctrl
}

export function cancel(documentId: string): boolean {
  const ctrl = active.get(documentId)
  if (!ctrl) return false
  ctrl.abort()
  active.delete(documentId)
  return true
}

export function unregister(documentId: string): void {
  active.delete(documentId)
}
