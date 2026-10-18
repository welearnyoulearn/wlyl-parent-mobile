import { useCallback, useEffect } from 'react'
import { View } from 'react-native'
import { Redirect, Tabs, useRouter } from 'expo-router'
import { CalendarCheck, GraduationCap, Home, IndianRupee, Menu } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { Alert, Button, COLORS, Loading } from '@/components/ui'
import { ChildHeader } from '@/components/child-header'
import { registerForPush, useNotificationTap } from '@/lib/push'
import { useT } from '@/lib/i18n'

// Signed-in shell: loads the parent's account, gates on login and first-login
// password change, and hides tabs for features the school has switched off.
export default function TabsLayout() {
  const { me, loading, error, unauthorized, load, has } = useSession()
  const router = useRouter()
  const t = useT()

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (me?.id) {
      void registerForPush()
    }
  }, [me?.id])

  useNotificationTap(useCallback(href => router.push(href), [router]))

  if (unauthorized) return <Redirect href="/login" />
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
    <Tabs screenOptions={{ header: () => <ChildHeader />, tabBarActiveTintColor: COLORS.primary, tabBarLabelStyle: { fontSize: 11 } }}>
      <Tabs.Screen name="index" options={{ title: t.tabs.home, tabBarButtonTestID: 'tab-home', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: t.tabs.attendance, tabBarButtonTestID: 'tab-attendance', ...hide('attendance'), tabBarIcon: ({ color }) => <CalendarCheck size={22} color={color} /> }} />
      <Tabs.Screen name="fees" options={{ title: t.tabs.fees, tabBarButtonTestID: 'tab-fees', ...hide('fee-management'), tabBarIcon: ({ color }) => <IndianRupee size={22} color={color} /> }} />
      <Tabs.Screen name="exams" options={{ title: t.tabs.exams, tabBarButtonTestID: 'tab-exams', ...hide('exam-marks'), tabBarIcon: ({ color }) => <GraduationCap size={22} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: t.tabs.more, tabBarButtonTestID: 'tab-more', tabBarIcon: ({ color }) => <Menu size={22} color={color} /> }} />
    </Tabs>
  )
}

