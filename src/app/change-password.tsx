import { useState } from 'react'
import { Text, View, KeyboardAvoidingView, ScrollView, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { api, ApiError } from '@/lib/api'
import { useSession } from '@/stores/session'
import { Button, Field, Alert, SafeAreaView } from '@/components/ui'

export default function ChangePasswordScreen() {
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!current || !next || !confirm) return
    if (next !== confirm) {
      setError('New passwords do not match')
      return
    }
    if (next.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api('/api/parent/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      await useSession.getState().load()
      router.replace('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Could not change password'))
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    await useSession.getState().logout()
    router.replace('/login')
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
          <View className="mb-2">
            <Text className="text-2xl font-bold text-foreground text-center">Set your password</Text>
            <Text className="text-muted-foreground mt-2 text-center text-sm">Replace the temporary password from your school with one only you know.</Text>
          </View>

          <View className="gap-4">
            <Field
              label="Temporary password"
              testID="current-password-input"
              value={current}
              onChangeText={setCurrent}
              password
              autoComplete="current-password"
            />
            <Field
              label="New password (8+ characters)"
              testID="new-password-input"
              value={next}
              onChangeText={setNext}
              password
              autoComplete="new-password"
            />
            <Field
              label="Repeat new password"
              testID="confirm-password-input"
              value={confirm}
              onChangeText={setConfirm}
              password
              autoComplete="new-password"
            />
            {error ? <Alert>{error}</Alert> : null}
            <Button
              label={busy ? 'Saving…' : 'Save and continue'}
              testID="change-password-submit-btn"
              onPress={submit}
              loading={busy}
              disabled={busy || !current || !next || !confirm}
            />

            <Pressable testID="change-password-logout-btn" onPress={logout} className="mt-4 p-4 items-center">
              <Text className="text-muted-foreground font-medium text-sm">Log out instead</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
