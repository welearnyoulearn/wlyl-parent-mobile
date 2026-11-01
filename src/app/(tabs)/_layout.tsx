import { useCallback, useEffect, type ComponentProps } from 'react'
import { ActivityIndicator, AppState, Pressable, View } from 'react-native'
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated'
import { CalendarCheck, GraduationCap, House, LayoutGrid, Wallet, type LucideIcon } from 'lucide-react-native'
import { navKeyFor, useSession } from '@/stores/session'
import { BrandBackdrop, BrandMark, Button, ErrorState, SafeAreaView, Text, haptic, useColors } from '@/components/ui'
import { TabHeader } from '@/components/child-header'
import { registerForPush, useNotificationTap } from '@/lib/push'
import { useT } from '@/lib/i18n'

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0]

const ICONS: Record<string, LucideIcon> = { index: House, attendance: CalendarCheck, fees: Wallet, exams: GraduationCap, more: LayoutGrid }
// Tab → the school feature that must be switched on for it to show.
const FEATURE: Record<string, string> = { attendance: 'attendance', fees: 'fee-management', exams: 'exam-marks' }

// One tab: the icon springs up a touch when it becomes active (skipped under reduced motion).
function TabButton({ label, Icon, focused, testID, onPress, onLongPress }: {
  label: string; Icon: LucideIcon; focused: boolean; testID?: string; onPress: () => void; onLongPress: () => void
}) {
  const c = useColors()
  const reduce = useReducedMotion()
  const lift = useSharedValue(focused ? 1 : 0)
  useEffect(() => {
    lift.set(reduce ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, { damping: 14, stiffness: 220 }))
  }, [focused, reduce, lift])
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -2 * lift.get() }, { scale: 1 + 0.06 * lift.get() }] }))
  return (
    <Pressable testID={testID} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}
      onPress={onPress} onLongPress={onLongPress} className="min-h-[52px] flex-1 items-center justify-center gap-0.5 active:opacity-60">
      <Animated.View style={iconStyle}>
        <Icon size={24} color={focused ? c.primary : c.mutedForeground} strokeWidth={focused ? 2.2 : 1.8} />
      </Animated.View>
      <Text numberOfLines={1} className={`text-[11px] ${focused ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{label}</Text>
    </Pressable>
  )
}

// A plain bottom bar, as the platforms draw theirs: the page colour, a hairline above,
// tabs the school has switched off left out.
function BottomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets()
  const has = useSession(s => s.has)
  const routes = state.routes.filter(r => !FEATURE[r.name] || has(FEATURE[r.name]))
  const activeKey = state.routes[state.index]?.key
  return (
    <View className="border-t border-border bg-card" style={{ paddingBottom: Math.max(insets.bottom, 6) }} accessibilityRole="tablist">
      <View className="w-full max-w-2xl flex-row self-center px-1 pt-1.5">
        {routes.map(route => {
          const { options } = descriptors[route.key]
          const focused = route.key === activeKey
          return (
            <TabButton key={route.key} label={options.title ?? route.name} Icon={ICONS[route.name] ?? LayoutGrid} focused={focused}
              testID={options.tabBarButtonTestID}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
                if (!focused && !event.defaultPrevented) { haptic.select(); navigation.navigate(route.name, route.params) }
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })} />
          )
        })}
      </View>
    </View>
  )
}

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
  const { me, loading, error, unauthorized, notice, locked, load, has, logout, keepAlive, checkPlan, heartbeat, track } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const t = useT()
  const c = useColors()

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
    // Startup: same teal and W as the native splash, so the hand-off is seamless.
    return loading ? (
      <View className="flex-1 items-center justify-center gap-6" testID="launch-screen">
        <BrandBackdrop />
        <BrandMark size={88} />
        <View className="items-center gap-4">
          <Text className="text-2xl font-extrabold tracking-tight text-on-brand">{t.appName}</Text>
          <ActivityIndicator color={c.onBrand} accessibilityLabel={t.layout.loadingAccount} />
        </View>
      </View>
    ) : (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
        <View className="w-full max-w-md flex-1 justify-center gap-4 self-center px-6">
          <ErrorState message={error ?? t.layout.loadError} onRetry={() => void load(true)} />
          <Button label={t.more.signOut} variant="ghost" onPress={() => void logout().then(() => router.replace('/login'))} testID="launch-sign-out" />
        </View>
      </SafeAreaView>
    )
  }

  const hide = (feature: string) => (has(feature) ? {} : { href: null })
  return (
    <Tabs
      tabBar={props => <BottomTabBar {...props} />}
      screenOptions={({ route }) => ({
        header: ({ options }) => <TabHeader title={options.title ?? ''} home={route.name === 'index'} />,
        sceneStyle: { backgroundColor: c.background },
        animation: 'fade',
      })}>
      <Tabs.Screen name="index" options={{ title: t.tabs.home, tabBarButtonTestID: 'tab-home' }} />
      <Tabs.Screen name="attendance" options={{ title: t.tabs.attendance, tabBarButtonTestID: 'tab-attendance', ...hide('attendance') }} />
      <Tabs.Screen name="fees" options={{ title: t.tabs.fees, tabBarButtonTestID: 'tab-fees', ...hide('fee-management') }} />
      <Tabs.Screen name="exams" options={{ title: t.tabs.exams, tabBarButtonTestID: 'tab-exams', ...hide('exam-marks') }} />
      <Tabs.Screen name="more" options={{ title: t.tabs.more, tabBarButtonTestID: 'tab-more' }} />
    </Tabs>
  )
}
