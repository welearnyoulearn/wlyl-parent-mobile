import { useCallback, useEffect } from 'react'
import { AppState, View } from 'react-native'
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router'
import { CalendarCheck, GraduationCap, Home, IndianRupee, Menu } from 'lucide-react-native'
import { navKeyFor, useSession } from '@/stores/session'
import { Alert, Button, Loading, useChildColor } from '@/components/ui'
import { ChildHeader } from '@/components/child-header'
import { registerForPush, useNotificationTap } from '@/lib/push'
import { useT } from '@/lib/i18n'

// Runs `fn` every `ms` and on each return to the app, only while the app is in the foreground.
function useForegroundPoll(fn: () => void, ms: number) {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => { timer ??= setInterval(fn, ms) }
    const stop = () => { if (timer) clearInterval(timer); timer = null }
    if (AppState.currentState === 'active') start()
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') { if (!timer) fn(); start() } else stop()
    })
    return () => { stop(); sub.remove() }
  }, [fn, ms])
}

// Signed-in shell: loads the parent's account, gates on login and first-login
// password change, and hides tabs for features the school has switched off.
// While open it keeps the session alive, watches the school's plan and reports
// usage (heartbeat + sections opened).
export default function TabsLayout() {
  const { me, loading, error, unauthorized, notice, locked, load, has, keepAlive, checkPlan, heartbeat, track } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const t = useT()
  const color = useChildColor()

  useEffect(() => { void load() }, [load])

  useForegroundPoll(useCallback(() => void keepAlive(), [keepAlive]), 60_000)
  useForegroundPoll(heartbeat, 60_000)
  useForegroundPoll(useCallback(() => void checkPlan(), [checkPlan]), locked ? 45_000 : 10 * 60_000)

  useEffect(() => { if (me) track(navKeyFor(pathname)) }, [me, pathname, track])

  // Signed out from anywhere (revoked, expired, logout) — leave pages opened
  // over the tabs too, which a focus-based <Redirect> would not.
  useEffect(() => {
    if (!unauthorized) return
    if (router.canDismiss()) router.dismissAll()
    router.replace(notice ? { pathname: '/login', params: { notice } } : '/login')
  }, [unauthorized, notice, router])

  useEffect(() => {
    if (me?.id) {
      void registerForPush()
    }
  }, [me?.id])

  useNotificationTap(useCallback(href => router.push(href), [router]))

  if (unauthorized) return null
  if (me && !me.password_changed) return <Redirect href="/change-password" />
  if (!me) {
    return (
      <View className="flex-1 justify-center gap-4 bg-background px-6">
        {loading ? <Loading label={t.layout.loadingAccount} /> : (
          <>
            <Alert>{error ?? t.layout.loadError}</Alert>
            <Button label={t.tryAgain} onPress={() => void load()} testID="retry-load" />
          </>
        )}
      </View>
    )
  }

  const hide = (feature: string) => (has(feature) ? {} : { href: null })
  return (
    <Tabs screenOptions={{ header: () => <ChildHeader />, tabBarActiveTintColor: color, tabBarLabelStyle: { fontSize: 11 } }}>
      <Tabs.Screen name="index" options={{ title: t.tabs.home, tabBarButtonTestID: 'tab-home', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: t.tabs.attendance, tabBarButtonTestID: 'tab-attendance', ...hide('attendance'), tabBarIcon: ({ color }) => <CalendarCheck size={22} color={color} /> }} />
      <Tabs.Screen name="fees" options={{ title: t.tabs.fees, tabBarButtonTestID: 'tab-fees', ...hide('fee-management'), tabBarIcon: ({ color }) => <IndianRupee size={22} color={color} /> }} />
      <Tabs.Screen name="exams" options={{ title: t.tabs.exams, tabBarButtonTestID: 'tab-exams', ...hide('exam-marks'), tabBarIcon: ({ color }) => <GraduationCap size={22} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: t.tabs.more, tabBarButtonTestID: 'tab-more', tabBarIcon: ({ color }) => <Menu size={22} color={color} /> }} />
    </Tabs>
  )
}

