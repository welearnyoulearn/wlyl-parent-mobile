import { useRef, useState } from 'react'
import { View, KeyboardAvoidingView, ScrollView, Linking, Pressable, type TextInput } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { LockKeyhole, UserRound } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { api, ApiError, PRIVACY_URL } from '@/lib/api'
import { Button, Field, Alert, SafeAreaView, LangToggle, BrandBackdrop, BrandMark, Text } from '@/components/ui'
import { useT } from '@/lib/i18n'

type LoginResponse = { success: boolean; passwordChanged: boolean; name: string | null; schoolName: string | null; usageSessionId: number | null }

export default function LoginScreen() {
  const router = useRouter()
  const t = useT()
  // Set by screens that sign the parent out (e.g. the school turned parent access off).
  const { notice } = useLocalSearchParams<{ notice?: string }>()
  const passwordRef = useRef<TextInput>(null)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)

  // Field errors appear only after the first attempt, then update as the parent types.
  const idError = tried && !identifier.trim() ? t.login.identifierRequired : undefined
  const pwError = tried && !password ? t.login.passwordRequired : undefined

  async function submit() {
    setTried(true)
    if (busy || !identifier.trim() || !password) return
    setBusy(true)
    setError('')
    try {
      const r = await api<LoginResponse>('/api/parent/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      })
      useSession.getState().setUsageSessionId(r.usageSessionId ?? null)
      // Clear the signed-out gate synchronously; the shell shows account loading
      // while school metadata continues in the background.
      void useSession.getState().load()
      router.replace(r.passwordChanged ? '/' : '/change-password')
    } catch (err) {
      // 403 (portal off, plan expired) and 429 carry a message meant for the parent; show it as-is.
      setError(err instanceof ApiError ? err.message : (err instanceof Error ? err.message : t.login.error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        // Android 15+ draws edge-to-edge and no longer resizes for the keyboard,
        // so pad on both platforms or the password field sits under the keyboard.
        behavior="padding"
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled" bounces={false}>
          <SafeAreaView edges={['top']}>
            <BrandBackdrop />
            <View className="w-full max-w-md self-center px-6 pb-14">
              <View className="items-end pt-2"><LangToggle /></View>
              <View className="items-center gap-3 pb-2 pt-6">
                <BrandMark size={68} />
                <Text accessibilityRole="header" className="text-2xl font-bold tracking-tight text-on-brand">{t.appName}</Text>
                <Text className="text-center text-sm text-on-brand/85">{t.login.tagline}</Text>
              </View>
            </View>
          </SafeAreaView>

          <SafeAreaView edges={['bottom']} className="-mt-7 flex-1 rounded-t-3xl bg-background">
            <View className="w-full max-w-md flex-1 gap-5 self-center px-6 pb-6 pt-8">
              <View className="gap-1">
                <Text className="text-[22px] font-bold tracking-tight text-foreground">{t.login.welcome}</Text>
                <Text className="text-sm leading-5 text-muted-foreground">{t.login.subtitle}</Text>
              </View>

              <View className="gap-4">
                {notice ? <Alert>{notice}</Alert> : null}
                <Field
                  label={t.login.identifierLabel}
                  testID="login-identifier-input"
                  icon={UserRound}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder={t.login.identifierPlaceholder}
                  keyboardType="email-address"
                  autoComplete="username"
                  textContentType="username"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  error={idError}
                />
                <View className="gap-2">
                  <Field
                    label={t.password}
                    testID="login-password-input"
                    inputRef={passwordRef}
                    icon={LockKeyhole}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t.login.passwordPlaceholder}
                    password
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={submit}
                    error={pwError}
                  />
                  <Pressable onPress={() => router.push('/forgot-password')} testID="login-forgot-password-link" accessibilityRole="button" hitSlop={8} className="self-end py-1">
                    <Text className="text-sm font-semibold text-primary">{t.login.forgot}</Text>
                  </Pressable>
                </View>
                {error ? <Alert>{error}</Alert> : null}
                <Button
                  label={busy ? t.login.signingIn : t.login.signIn}
                  testID="login-submit-btn"
                  onPress={submit}
                  loading={busy}
                />
              </View>

              <View className="flex-1" />
              <Text
                accessibilityRole="link"
                testID="login-privacy-link"
                onPress={() => Linking.openURL(PRIVACY_URL)}
                className="py-2 text-center text-sm text-muted-foreground underline"
              >
                {t.privacyPolicy}
              </Text>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>

    </View>
  )
}
