// Ported from wlyl-parent-app/stores/session.ts; storage is AsyncStorage instead of localStorage.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, ApiError, type Child, type Me } from '@/lib/api'
import { clearBooks } from '@/lib/books'
import { unregisterPush } from '@/lib/push'

export type Student = Child & { class_id: number }

type SessionState = {
  me: Me | null
  children: Student[]          // every linked child with class_id resolved
  student: Student | null      // the selected child
  year: string | null
  features: Set<string> | null // enabled parent-portal feature keys; null = unknown (show all)
  childId: number | null
  loading: boolean
  error: string | null
  unauthorized: boolean
  load: () => Promise<void>
  selectChild: (child: Child) => void
  has: (feature: string) => boolean
  logout: () => Promise<void>
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      me: null, children: [], student: null, year: null, features: null, childId: null, loading: true, error: null, unauthorized: false,

      async load() {
        set({ loading: true, error: null, unauthorized: false })
        try {
          const me = await api<Me>('/api/parent/auth/me')
          // /me has no class_id; resolve it from the class list like the web portal does.
          const [classes, current, feats] = await Promise.all([
            api<{ id: number; grade: string; section: string }[]>(`/api/classes?school_id=${me.school_id}`).catch(() => []),
            api<{ label: string }>(`/api/academic-year/current?school_id=${me.school_id}`).catch(() => null),
            api<{ enabled: string[] }>(`/api/school/enabled-features?school_id=${me.school_id}&portal=parent`).catch(() => null),
          ])
          const children = me.children.map(c => ({
            ...c, class_id: classes.find(k => k.grade === c.grade && k.section === c.section)?.id ?? 0,
          }))
          const student = children.find(c => c.id === get().childId) ?? children[0] ?? null
          set({ me, children, student, childId: student?.id ?? null, year: current?.label ?? null, features: feats ? new Set(feats.enabled) : null })
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) { set({ unauthorized: true }); return }
          set({ error: e instanceof Error ? e.message : 'Could not load your account' })
        } finally {
          set({ loading: false })
        }
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
