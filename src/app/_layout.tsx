import '@/global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { COLORS } from '@/components/ui'

// Start on the tabs (home). Without this, the first declared Stack.Screen
// (the mark sheet) became the initial route.
export const unstable_settings = { initialRouteName: '(tabs)' }

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exam/[id]" options={{ headerShown: true, title: 'Mark sheet', headerTintColor: COLORS.primary }} />
      </Stack>
    </SafeAreaProvider>
  )
}
