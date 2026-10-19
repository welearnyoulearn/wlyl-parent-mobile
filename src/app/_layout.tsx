import '@/global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { COLORS } from '@/components/ui'
import { PlanLocked } from '@/components/plan-locked'

// Start on the tabs (home). Without this, the first declared Stack.Screen
// (the mark sheet) became the initial route.
export const unstable_settings = { initialRouteName: '(tabs)' }

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {/* Pages opened from More (timetable, calendar, ...) get a header with a back
          button; each sets its own title. Tabs and sign-in screens have none. */}
      <Stack screenOptions={{ headerTintColor: COLORS.primary, headerTitleStyle: { fontWeight: '600' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="change-password" options={{ headerShown: false }} />
        <Stack.Screen name="exam/[id]" options={{ title: 'Mark sheet' }} />
        <Stack.Screen name="book/[id]" options={{ title: 'Book' }} />
      </Stack>
      <PlanLocked />
    </SafeAreaProvider>
  )
}
