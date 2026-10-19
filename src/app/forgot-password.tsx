import { useState } from 'react'
import { Text, View, KeyboardAvoidingView, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { MailCheck } from 'lucide-react-native'
import { api, ApiError } from '@/lib/api'
import { Button, Field, Alert, SafeAreaView, COLORS } from '@/components/ui'
import { useT } from '@/lib/i18n'

// The server always answers { success: true } so it never reveals whether an
// account exists. The reset link it sends opens the web reset page; the app
// has no reset screen of its own, the parent signs in here afterwards.
export default function ForgotPasswordScreen() {
  const router = useRouter()
  const t = useT()
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit() {
    const id = identifier.trim()
    if (!id) return
    setBusy(true)
    setError('')
    try {
      await api('/api/parent/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier: id }) })
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError || !(err instanceof Error) ? t.forgotPassword.error : err.message)
    } finally {
      setBusy(false)
    }
  }

  const back = () => (router.canGoBack() ? router.back() : router.replace('/login'))

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView contentContainerClassName="flex-grow justify-center p-6 gap-6" keyboardShouldPersistTaps="handled">
          <View className="mb-2">
            <Text accessibilityRole="header" className="text-2xl font-bold text-foreground text-center">{t.forgotPassword.title}</Text>
            <Text className="text-muted-foreground mt-2 text-center text-sm">{t.forgotPassword.subtitle}</Text>
          </View>

          {sent ? (
            <View className="items-center gap-3" testID="forgot-password-sent">
              <View className="size-14 items-center justify-center rounded-full bg-teal-50">
                <MailCheck size={28} color={COLORS.primary} />
              </View>
              <Text className="text-base font-semibold text-foreground">{t.forgotPassword.sentTitle}</Text>
              <Text className="text-center text-sm text-muted-foreground">{t.forgotPassword.sent(identifier.trim())}</Text>
              <Text className="text-center text-sm text-muted-foreground">{t.forgotPassword.openLink}</Text>
            </View>
          ) : (
            <View className="gap-4">
              <Field
                label={t.forgotPassword.identifierLabel}
                testID="forgot-password-identifier-input"
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType="email-address"
                autoComplete="username"
              />
              {error ? <Alert>{error}</Alert> : null}
              <Button
                label={busy ? t.forgotPassword.sending : t.forgotPassword.send}
                testID="forgot-password-submit-btn"
                onPress={submit}
                loading={busy}
                disabled={busy || !identifier.trim()}
              />
            </View>
          )}

          <Text
            accessibilityRole="link"
            testID="forgot-password-back-link"
            onPress={back}
            className="py-2 text-center text-sm font-medium text-primary"
          >
            {t.forgotPassword.back}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
