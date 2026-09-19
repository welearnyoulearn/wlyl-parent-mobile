import '@/global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { COLORS } from '@/components/ui'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="exam/[id]" options={{ headerShown: true, title: 'Mark sheet', headerTintColor: COLORS.primary }} />
      </Stack>
    </SafeAreaProvider>
  )
}
