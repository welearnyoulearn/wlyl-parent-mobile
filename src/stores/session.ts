// Ported from wlyl-parent-app/stores/session.ts; storage is AsyncStorage instead of localStorage.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api, ApiError, onApiError, type Child, type Me } from '@/lib/api'
import { clearBooks } from '@/lib/books'
import { unregisterPush } from '@/lib/push'
import { clearRequestCache, accountGeneration } from '@/lib/request-cache'

export type Student = Child & { class_id: number }
export type Lang = 'en' | 'te'
// 'system' follows the phone's light/dark setting.
export type ThemePref = 'system' | 'light' | 'dark'

type SessionState = {
  me: Me | null
  children: Student[]          // class_id is 0 while school metadata loads
  student: Student | null      // the selected child
  year: string | null
  features: Set<string> | null // enabled parent-portal feature keys; null = unknown (show all)
  childId: number | null
  lang: Lang
  theme: ThemePref
  lastLogin: LastLogin | null   // the last account signed in on this phone, to prefill sign-in
  loading: boolean
  error: string | null
  classError: string | null
  unauthorized: boolean
  notice: string | null        // why the parent was signed out (access revoked), shown on login
  locked: boolean              // the school's plan has ended; the whole app shows the paused screen
  usageSessionId: number | null
  load: (force?: boolean) => Promise<void>
  selectChild: (child: Child) => void
  has: (feature: string) => boolean
  setLang: (lang: Lang) => void
  setTheme: (theme: ThemePref) => void
  setLastLogin: (last: LastLogin | null) => void
  logout: () => Promise<void>
  setUsageSessionId: (id: number | null) => void
  keepAlive: () => Promise<void>
  checkPlan: () => Promise<void>
  refreshFeatures: () => Promise<void>
  heartbeat: () => void
  track: (navKey: string | null) => void
}

export type LastLogin = { identifier: string; name: string | null }

// Usage nav keys the platform's analytics know, by app route.
const NAV_KEYS: [RegExp, string][] = [
  [/^\/$/, 'overview'], [/^\/attendance$/, 'attendance'], [/^\/calendar$/, 'calendar'], [/^\/fees$/, 'fees'],
  [/^\/exams$/, 'exams'], [/^\/exam\//, 'results'], [/^\/syllabus$/, 'syllabus'], [/^\/(library$|book\/)/, 'library'], [/^\/profile$/, 'profile'],
]
export const navKeyFor = (pathname: string) => NAV_KEYS.find(([re]) => re.test(pathname))?.[1] ?? null

const SIGNED_OUT = { loading: false, me: null, children: [], student: null, year: null, features: null, locked: false, unauthorized: true }

let pendingLoad: { generation: number; promise: Promise<void> } | null = null
let loadedGeneration = -1
let loadedAt = 0
let lastNavKey: string | null = null
let featuresPending = false
// Fire-and-forget: usage analytics must never affect the parent.
const ping = (path: string, body: object) => { void api(path, { method: 'POST', body: JSON.stringify(body) }).catch(() => null) }

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      me: null, children: [], student: null, year: null, features: null, childId: null, lang: 'en', theme: 'system', lastLogin: null, loading: true, error: null, classError: null, unauthorized: false, notice: null, locked: false, usageSessionId: null,

      load(force = false) {
        const generation = accountGeneration()
        if (pendingLoad?.generation === generation) return pendingLoad.promise
        if (!force && loadedGeneration === generation && get().me && Date.now() - loadedAt < 15_000) return Promise.resolve()
        const promise = (async () => {
          const current = () => generation === accountGeneration()
          const read = <T,>(path: string) => api<T>(path)
          if (loadedGeneration !== generation) set({ me: null, children: [], student: null, year: null, features: null })
          set({ loading: !get().me, error: null, classError: null, unauthorized: false, notice: null })
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
            const features = get().refreshFeatures()
            void get().checkPlan()
            // Keep load() awaitable by callers, while the signed-in shell can render immediately.
            await Promise.allSettled([classes, year, features])
            if (current() && !get().classError) { loadedGeneration = generation; loadedAt = Date.now() }
          } catch (e) {
            if (!current()) return
            if (e instanceof ApiError && e.status === 401) {
              clearRequestCache()
              set(SIGNED_OUT)
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

      setLang(lang) {
        set({ lang })
      },

      setTheme(theme) {
        set({ theme })
      },

      setLastLogin(lastLogin) {
        set({ lastLogin })
      },

      async logout() {
        const usageSessionId = get().usageSessionId
        clearRequestCache()
        lastNavKey = null
        set({ ...SIGNED_OUT, childId: null, error: null, classError: null, usageSessionId: null })
        await unregisterPush()
        try { clearBooks() } catch { /* a leftover book must never block sign-out */ }
        await api('/api/parent/auth/logout', { method: 'POST', body: JSON.stringify({ usageSessionId }) }).catch(() => null)
        set({ me: null, children: [], student: null, childId: null, unauthorized: true })
      },

      setUsageSessionId(usageSessionId) {
        lastNavKey = null
        set({ usageSessionId })
      },

      // Polled while the app is open: keeps the 20-minute idle session alive and
      // notices an expired or revoked session (access_revoked is handled by onApiError).
      async keepAlive() {
        if (!get().me) return
        const generation = accountGeneration()
        try { await api<Me>('/api/parent/auth/me') } catch (e) {
          if (e instanceof ApiError && e.status === 401 && generation === accountGeneration() && !get().unauthorized) {
            clearRequestCache()
            set(SIGNED_OUT)
          }
        }
      },

      async checkPlan() {
        if (!get().me) return
        const generation = accountGeneration()
        const plan = await api<{ locked: boolean }>('/api/plan/status').catch(() => null)
        if (plan && generation === accountGeneration()) set({ locked: plan.locked === true })
      },

      async refreshFeatures() {
        const me = get().me
        if (!me) return
        const generation = accountGeneration()
        const value = await api<{ enabled: string[] }>(`/api/school/enabled-features?school_id=${me.school_id}&portal=parent`)
        if (generation === accountGeneration()) set({ features: new Set(value.enabled) })
      },

      heartbeat() {
        const usageSessionId = get().usageSessionId
        if (get().me && usageSessionId !== null) ping('/api/usage/heartbeat', { usageSessionId })
      },

      // Consecutive repeats of the same section are not counted again.
      track(navKey) {
        if (!navKey || navKey === lastNavKey || !get().me) return
        lastNavKey = navKey
        ping('/api/usage/track', { portal: 'parent', navKey })
      },
    }),
    // Only the selected child and language survive an app restart; everything else reloads from the API.
    { name: 'wlyl-parent', storage: createJSONStorage(() => AsyncStorage), partialize: s => ({ childId: s.childId, lang: s.lang, theme: s.theme, lastLogin: s.lastLogin }) },
  ),
)

onApiError(error => {
  const s = useSession.getState()
  if (error.code === 'access_revoked') {
    clearRequestCache()
    useSession.setState({ ...SIGNED_OUT, notice: error.message })
    return
  }
  // A refused sign-in (no account loaded yet) is shown by the login screen itself.
  if (!s.me) return
  if (error.code === 'PLAN_EXPIRED') {
    useSession.setState({ locked: true })
  } else if (error.code === 'FEATURE_DISABLED' && !featuresPending) {
    featuresPending = true
    void s.refreshFeatures().catch(() => null).finally(() => { featuresPending = false })
  }
})
