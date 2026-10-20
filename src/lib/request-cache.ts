// Short-lived, memory-only screen data. Never persisted across accounts or app restarts.
const FRESH_MS = 30_000
const values = new Map<string, { data: unknown; savedAt: number }>()
const pending = new Map<string, Promise<unknown>>()
let generation = 0
let account = 0

export class CacheResetError extends Error {}

export function accountGeneration(): number { return account }

export function clearRequestCache(accountChanged = true): void {
  generation++
  if (accountChanged) account++
  values.clear()
  pending.clear()
}

export function cachedResult<T>(path: string): { data: T } | null {
  const entry = values.get(path)
  if (!entry || Date.now() - entry.savedAt >= FRESH_MS) return null
  return { data: entry.data as T }
}

export function loadCached<T>(path: string, load: () => Promise<T>, force = false): Promise<T> {
  const cached = !force && cachedResult<T>(path)
  if (cached) return Promise.resolve(cached.data)
  const existing = pending.get(path)
  if (existing) return existing as Promise<T>
  const startedIn = generation
  const promise = Promise.resolve().then(load).then(data => {
    if (startedIn !== generation) throw new CacheResetError('Session data changed')
    values.set(path, { data, savedAt: Date.now() })
    return data
  }).finally(() => {
    if (pending.get(path) === promise) pending.delete(path)
  })
  pending.set(path, promise)
  return promise
}
