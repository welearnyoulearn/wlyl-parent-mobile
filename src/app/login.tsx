import { useRef, useState } from 'react'
import { View, Linking, Pressable, type TextInput } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LockKeyhole, UserRound } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { api, ApiError, PRIVACY_URL } from '@/lib/api'
import { AuthShell } from '@/components/auth-shell'
import { Avatar, Button, Field, Alert, haptic, Text } from '@/components/ui'
import { useT } from '@/lib/i18n'

type LoginResponse = { success: boolean; passwordChanged: boolean; name: string | null; schoolName: string | null; usageSessionId: number | null }

export default function LoginScreen() {
  const router = useRouter()
  const t = useT()
  // Set by screens that sign the parent out (e.g. the school turned parent access off).
  const { notice } = useLocalSearchParams<{ notice?: string }>()
  // The account last signed in on this phone: the parent only types the password.
  const [last, setLast] = useState(() => useSession.getState().lastLogin)
  const passwordRef = useRef<TextInput>(null)
  const [identifier, setIdentifier] = useState(last?.identifier ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)

  // Field errors appear only after the first attempt, then update as the parent types.
  const idError = tried && !identifier.trim() ? t.login.identifierRequired : undefined
  const pwError = tried && !password ? t.login.passwordRequired : undefined

  function switchAccount() {
    haptic.select()
    setLast(null)
    setIdentifier('')
    setPassword('')
    setError('')
    setTried(false)
    useSession.getState().setLastLogin(null)
  }

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
      haptic.success()
      const s = useSession.getState()
      s.setUsageSessionId(r.usageSessionId ?? null)
      s.setLastLogin({ identifier: identifier.trim(), name: r.name })
      // Clear the signed-out gate synchronously; the shell shows account loading
      // while school metadata continues in the background.
      void s.load()
      router.replace(r.passwordChanged ? '/' : '/change-password')
    } catch (err) {
      haptic.warn()
      // 403 (portal off, plan expired) and 429 carry a message meant for the parent; show it as-is.
      setError(err instanceof ApiError ? err.message : (err instanceof Error ? err.message : t.login.error))
    } finally {
      setBusy(false)
    }
  }

  const firstName = last?.name?.split(' ')[0]

  return (
    <AuthShell brand title={firstName ? t.login.welcomeName(firstName) : t.appName} subtitle={t.login.tagline} testID="login-screen">
      {!last && (
        <View className="gap-1">
          <Text className="text-[22px] font-bold tracking-tight text-foreground">{t.login.welcome}</Text>
          <Text className="text-[15px] leading-5 text-muted-foreground">{t.login.subtitle}</Text>
        </View>
      )}

      {notice ? <Alert>{notice}</Alert> : null}

      {last ? (
        // Returning parent: who they are, one tap to switch, straight to the password.
        <View className="flex-row items-center gap-3 rounded-2xl bg-muted px-4 py-3" testID="login-remembered">
          <Avatar name={last.name ?? last.identifier} className="size-11 bg-primary-soft" textClassName="text-sm text-primary" />
          <View className="flex-1">
            <Text className="text-xs text-muted-foreground">{t.login.signingInAs}</Text>
            <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>{last.identifier}</Text>
          </View>
          <Pressable onPress={switchAccount} testID="login-use-another" accessibilityRole="button" accessibilityLabel={t.login.notYou} hitSlop={8}
            className="rounded-full px-2 py-1.5 active:bg-card">
            <Text className="text-[13px] font-semibold text-primary">{t.login.notYou}</Text>
          </Pressable>
        </View>
      ) : (
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
      )}

      <View className="gap-1">
        <Field
          label={t.password}
          testID="login-password-input"
          inputRef={passwordRef}
          icon={LockKeyhole}
          value={password}
          onChangeText={v => { setPassword(v); if (error) setError('') }}
          placeholder={t.login.passwordPlaceholder}
          password
          autoFocus={!!last}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={pwError}
        />
        <Pressable onPress={() => router.push('/forgot-password')} testID="login-forgot-password-link" accessibilityRole="button" hitSlop={8} className="self-end py-1.5">
          <Text className="text-sm font-semibold text-primary">{t.login.forgot}</Text>
        </Pressable>
      </View>

      {error ? <Alert>{error}</Alert> : null}
      <Button label={busy ? t.login.signingIn : t.login.signIn} testID="login-submit-btn" onPress={submit} loading={busy} />

      <View className="flex-1" />
      <Text accessibilityRole="link" testID="login-privacy-link" onPress={() => Linking.openURL(PRIVACY_URL)}
        className="py-2 text-center text-[13px] text-muted-foreground underline">
        {t.privacyPolicy}
      </Text>
    </AuthShell>
  )
}
