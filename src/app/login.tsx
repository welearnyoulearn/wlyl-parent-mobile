import { useState } from 'react'
import { Text, View, KeyboardAvoidingView, ScrollView, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '@/stores/session'
import { api, ApiError, PRIVACY_URL } from '@/lib/api'
import { Button, Field, Alert, SafeAreaView } from '@/components/ui'

type LoginResponse = { success: boolean; passwordChanged: boolean; name: string | null; schoolName: string | null }

export default function LoginScreen() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!identifier || !password) return
    setBusy(true)
    setError('')
    try {
      const r = await api<LoginResponse>('/api/parent/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      })
      // Reload the session first: it still holds `unauthorized` from before
      // sign-in, and the tabs gate would bounce straight back to /login.
      await useSession.getState().load()
      router.replace(r.passwordChanged ? '/' : '/change-password')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Login failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <KeyboardAvoidingView
        // Android 15+ draws edge-to-edge and no longer resizes for the keyboard,
        // so pad on both platforms or the password field sits under the keyboard.
        behavior="padding"
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow justify-center p-6 gap-6" keyboardShouldPersistTaps="handled">
          <View className="items-center bg-primary rounded-3xl p-8 mb-2">
            <View className="mb-3 size-14 items-center justify-center rounded-2xl bg-white/20">
              <Text className="text-3xl font-bold text-primary-foreground">W</Text>
            </View>
            <Text className="text-2xl font-bold text-primary-foreground">WLYL Parent</Text>
            <Text className="text-primary-foreground/90 mt-2 text-center text-sm">Sign in with the login your school sent you.</Text>
          </View>

          <View className="gap-4">
            <Field
              label="Email or phone number"
              testID="login-identifier-input"
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="username"
            />
            <Field
              label="Password"
              testID="login-password-input"
              value={password}
              onChangeText={setPassword}
              password
              autoComplete="current-password"
            />
            {error ? <Alert>{error}</Alert> : null}
            <Button
              label={busy ? 'Signing in…' : 'Sign in'}
              testID="login-submit-btn"
              onPress={submit}
              loading={busy}
              disabled={busy || !identifier || !password}
            />
            <Text
              accessibilityRole="link"
              testID="login-privacy-link"
              onPress={() => Linking.openURL(PRIVACY_URL)}
              className="py-2 text-center text-sm text-primary underline"
            >
              Privacy policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
