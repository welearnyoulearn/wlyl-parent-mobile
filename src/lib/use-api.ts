import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

type Result<T> = { path: string; data: T | null; error: string | null }

// One fetch per screen: data, loading/refreshing flags, error text, and a
// refresh() for pull-to-refresh. Pass null to wait (e.g. until a child is picked).
// State only changes when a response arrives; a response for an old path (the
// parent switched child) is ignored, and a failed refresh keeps the last data.
export function useApi<T>(path: string | null) {
  const [result, setResult] = useState<Result<T> | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!path) return
    let live = true
    api<T>(path)
      .then(data => { if (live) setResult({ path, data, error: null }) })
      .catch((e: unknown) => {
        if (!live) return
        const error = e instanceof Error ? e.message : 'Something went wrong'
        setResult(prev => ({ path, data: prev?.path === path ? prev.data : null, error }))
      })
      .finally(() => { if (live) setRefreshing(false) })
    return () => { live = false }
  }, [path, tick])

  const current = result?.path === path ? result : null
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: path !== null && current === null,
    refreshing,
    refresh: () => { setRefreshing(true); setTick(t => t + 1) },
  }
}
