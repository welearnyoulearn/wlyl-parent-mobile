import '@/global.css'
import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Uniwind, useUniwind } from 'uniwind'
import {
  useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans'
import { FONTS, useColors } from '@/components/ui'
import { PlanLocked } from '@/components/plan-locked'
import { useSession } from '@/stores/session'
import { useT } from '@/lib/i18n'

// Keep the native splash up until we know where to send the parent, then fade it out.
SplashScreen.preventAutoHideAsync().catch(() => {})
// Expo Go can't customise the splash animation (it warns); store and dev builds can.
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) SplashScreen.setOptions({ duration: 250, fade: true })

// Start on the tabs (home). Without this, the first declared Stack.Screen
// (the mark sheet) became the initial route.
export const unstable_settings = { initialRouteName: '(tabs)' }

// Never hold the splash longer than this, even on a very slow network:
// the signed-in shell has its own branded loading screen.
const SPLASH_MAX_MS = 2500

function useLaunch(fontsReady: boolean) {
  const [hydrated, setHydrated] = useState(() => useSession.persist.hasHydrated())
  const theme = useSession(s => s.theme)
  const settled = useSession(s => !s.loading || s.unauthorized || !!s.error)

  useEffect(() => useSession.persist.onFinishHydration(() => setHydrated(true)), [])
  // The saved theme applies before the splash lifts, so a dark-mode parent never sees a light flash.
  useEffect(() => { if (hydrated) Uniwind.setTheme(theme ?? 'system') }, [hydrated, theme])
  useEffect(() => {
    if (hydrated && settled && fontsReady) SplashScreen.hide()
  }, [hydrated, settled, fontsReady])
  useEffect(() => {
    const timer = setTimeout(() => SplashScreen.hide(), SPLASH_MAX_MS)
    return () => clearTimeout(timer)
  }, [])
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  })
  useLaunch(fontsLoaded || !!fontError)
  const c = useColors()
  const t = useT()
  const { theme } = useUniwind()
  return (
    <SafeAreaProvider>
      {/* Dark text on the light canvas, light text at night. Sign-in screens override it for their teal hero. */}
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {/* Pages opened from a tab or More get a quiet header on the page colour with a
          back button; iOS shows a large title that tucks in as the page scrolls. */}
      <Stack screenOptions={{
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.foreground,
        headerTitleStyle: { fontFamily: FONTS.bold, fontSize: 17 },
        headerLargeTitle: true,
        headerLargeTitleStyle: { fontFamily: FONTS.extrabold },
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: c.background },
      }}>
        {/* The title is what the back button says (and reads aloud) on pages opened from a tab. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t.appName }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="change-password" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="birthday" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="exam/[id]" />
        <Stack.Screen name="book/[id]" options={{ headerLargeTitle: false }} />
      </Stack>
      <PlanLocked />
    </SafeAreaProvider>
  )
}
