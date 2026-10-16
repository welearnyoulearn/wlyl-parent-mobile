// Ported from wlyl-parent-app/stores/session.ts; storage is AsyncStorage instead of localStorage.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, ApiError, type Child, type Me } from '@/lib/api'
import { clearBooks } from '@/lib/books'
import { unregisterPush } from '@/lib/push'
import { clearRequestCache, accountGeneration } from '@/lib/request-cache'

export type Student = Child & { class_id: number }

type SessionState = {
  me: Me | null
  children: Student[]          // class_id is 0 while school metadata loads
  student: Student | null      // the selected child
  year: string | null
  features: Set<string> | null // enabled parent-portal feature keys; null = unknown (show all)
  childId: number | null
  loading: boolean
  error: string | null
  classError: string | null
  unauthorized: boolean
  load: (force?: boolean) => Promise<void>
  selectChild: (child: Child) => void
  has: (feature: string) => boolean
  logout: () => Promise<void>
}

let pendingLoad: { generation: number; promise: Promise<void> } | null = null
let loadedGeneration = -1
let loadedAt = 0

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      me: null, children: [], student: null, year: null, features: null, childId: null, loading: true, error: null, classError: null, unauthorized: false,

      load(force = false) {
        const generation = accountGeneration()
        if (pendingLoad?.generation === generation) return pendingLoad.promise
        if (!force && loadedGeneration === generation && get().me && Date.now() - loadedAt < 15_000) return Promise.resolve()
        const promise = (async () => {
          const current = () => generation === accountGeneration()
          const read = <T,>(path: string) => api<T>(path)
          if (loadedGeneration !== generation) set({ me: null, children: [], student: null, year: null, features: null })
          set({ loading: !get().me, error: null, classError: null, unauthorized: false })
          try {
            const me = await read<Me>('/api/parent/auth/me')
            if (!current()) return
            // School metadata must not hold up the account or child-independent cards.
            const children = me.children.map(c => ({ ...c, class_id: 0 }))
            const student = children.find(c => c.id === get().childId) ?? children[0] ?? null
            set({ me, children, student, childId: student?.id ?? null, loading: false })
            const classes = read<{ id: number; grade: string; section: string }[]>(`/api/classes?school_id=${me.school_id}`)
              .then(classes => {
                if (!current()) return
                const children = me.children.map(c => ({ ...c, class_id: classes.find(k => k.grade === c.grade && k.section === c.section)?.id ?? 0 }))
                set({ children, student: children.find(c => c.id === get().childId) ?? children[0] ?? null })
                if (children.some(c => c.class_id === 0)) throw new Error('Your child’s class could not be found. Please contact your school.')
              }).catch(e => { if (current()) set({ classError: e instanceof Error ? e.message : 'Could not load your child’s class.' }) })
            const year = read<{ label: string }>(`/api/academic-year/current?school_id=${me.school_id}`)
              .then(value => { if (current()) set({ year: value.label }) })
            const features = read<{ enabled: string[] }>(`/api/school/enabled-features?school_id=${me.school_id}&portal=parent`)
              .then(value => { if (current()) set({ features: new Set(value.enabled) }) })
            // Keep load() awaitable by callers, while the signed-in shell can render immediately.
            await Promise.allSettled([classes, year, features])
            if (current() && !get().classError) { loadedGeneration = generation; loadedAt = Date.now() }
          } catch (e) {
            if (!current()) return
            if (e instanceof ApiError && e.status === 401) {
              clearRequestCache()
              set({ loading: false, me: null, children: [], student: null, year: null, features: null, unauthorized: true })
              return
            }
            if (current()) set({ error: e instanceof Error ? e.message : 'Could not load your account' })
          } finally {
            if (current()) set({ loading: false })
          }
        })()
        pendingLoad = { generation, promise }
        void promise.finally(() => { if (pendingLoad?.promise === promise) pendingLoad = null })
        return promise
      },

      selectChild(child) {
        const student = get().children.find(c => c.id === child.id) ?? null
        set({ student, childId: child.id })
      },

      has(feature) {
        const f = get().features
        return f === null || f.has(feature)
      },

      async logout() {
        clearRequestCache()
        set({ me: null, children: [], student: null, year: null, features: null, childId: null, loading: false, error: null, classError: null, unauthorized: true })
        await unregisterPush()
        try { clearBooks() } catch { /* a leftover book must never block sign-out */ }
        await api('/api/parent/auth/logout', { method: 'POST', body: '{}' }).catch(() => null)
        set({ me: null, children: [], student: null, childId: null, unauthorized: true })
      },
    }),
    // Only the selected child survives an app restart; everything else reloads from the API.
    { name: 'wlyl-parent', storage: createJSONStorage(() => AsyncStorage), partialize: s => ({ childId: s.childId }) },
  ),
)
