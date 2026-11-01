import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { cachedResult, CacheResetError, loadCached } from '@/lib/request-cache'

type Result<T> = { path: string; data: T | null; error: string | null; status: number | null }

// One fetch per screen: data, loading/refreshing flags, error text, and a
// refresh() for pull-to-refresh. Pass null to wait (e.g. until a child is picked).
// State only changes when a response arrives; a response for an old path (the
// parent switched child) is ignored, and a failed refresh keeps the last data.
export function useApi<T>(path: string | null) {
  const [result, setResult] = useState<Result<T> | null>(() => {
    const cached = path && cachedResult<T>(path)
    return cached ? { path: path!, data: cached.data, error: null, status: null } : null
  })
  const [refreshing, setRefreshing] = useState(false)
  const forceRefresh = useRef(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!path) return
    let live = true
    const force = forceRefresh.current
    forceRefresh.current = false
    loadCached(path, () => api<T>(path), force)
      .then(data => { if (live) setResult({ path, data, error: null, status: null }) })
      .catch((e: unknown) => {
        if (!live) return
        if (e instanceof CacheResetError) { setTick(t => t + 1); return }
        const error = e instanceof Error ? e.message : 'Something went wrong'
        const status = e instanceof ApiError ? e.status : null
        setResult(prev => ({ path, data: prev?.path === path ? prev.data : null, error, status }))
      })
      .finally(() => { if (live) setRefreshing(false) })
    return () => { live = false }
  }, [path, tick])

  // Stable per path, so callers can put it in effect/focus dependencies.
  const refresh = useCallback(() => { if (!path) return; forceRefresh.current = true; setRefreshing(true); setTick(t => t + 1) }, [path])

  const current = result?.path === path ? result : null
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    // HTTP status of the failure; 404 means the server doesn't have this feature yet.
    status: current?.status ?? null,
    loading: path !== null && current === null,
    refreshing,
    refresh,
  }
}
