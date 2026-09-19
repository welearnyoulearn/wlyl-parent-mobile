import { useEffect } from 'react'
import { View } from 'react-native'
import { Redirect, Tabs } from 'expo-router'
import { CalendarCheck, GraduationCap, Home, IndianRupee, Menu } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { Alert, Button, COLORS, Loading } from '@/components/ui'
import { ChildHeader } from '@/components/child-header'

// Signed-in shell: loads the parent's account, gates on login and first-login
// password change, and hides tabs for features the school has switched off.
export default function TabsLayout() {
  const { me, loading, error, unauthorized, load, has } = useSession()

  useEffect(() => { void load() }, [load])

  if (unauthorized) return <Redirect href="/login" />
  if (me && !me.password_changed) return <Redirect href="/change-password" />
  if (!me) {
    return (
      <View className="flex-1 justify-center gap-4 bg-background px-6">
        {loading ? <Loading label="Loading your account" /> : (
          <>
            <Alert>{error ?? 'Could not load your account'}</Alert>
            <Button label="Try again" onPress={() => void load()} testID="retry-load" />
          </>
        )}
      </View>
    )
  }

  const hide = (feature: string) => (has(feature) ? {} : { href: null })
  return (
    <Tabs screenOptions={{ header: () => <ChildHeader />, tabBarActiveTintColor: COLORS.primary, tabBarLabelStyle: { fontSize: 11 } }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarButtonTestID: 'tab-home', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarButtonTestID: 'tab-attendance', ...hide('attendance'), tabBarIcon: ({ color }) => <CalendarCheck size={22} color={color} /> }} />
      <Tabs.Screen name="fees" options={{ title: 'Fees', tabBarButtonTestID: 'tab-fees', ...hide('fee-management'), tabBarIcon: ({ color }) => <IndianRupee size={22} color={color} /> }} />
      <Tabs.Screen name="exams" options={{ title: 'Exams', tabBarButtonTestID: 'tab-exams', ...hide('exam-marks'), tabBarIcon: ({ color }) => <GraduationCap size={22} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarButtonTestID: 'tab-more', tabBarIcon: ({ color }) => <Menu size={22} color={color} /> }} />
    </Tabs>
  )
}

