import { useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { ZoomIn, useReducedMotion } from 'react-native-reanimated'
import { KeyRound, MailCheck, UserRound } from 'lucide-react-native'
import { api, ApiError } from '@/lib/api'
import { useSession } from '@/stores/session'
import { AuthShell } from '@/components/auth-shell'
import { Button, Field, Alert, haptic, Text, useColors } from '@/components/ui'
import { useT } from '@/lib/i18n'

// Same contract as the web's ForgotPasswordForm (#451): the platform says whether the
// link went out (to which masked email), or why not, and each answer gets its own message.
// The link opens the web reset page; the parent signs in here afterwards.
type ForgotResult =
  | { status: 'sent'; sentTo: string[] }
  | { status: 'not_found' } | { status: 'no_contact' } | { status: 'ambiguous' } | { status: 'rate_limited' }
  // Older platforms answer { success: true } without saying where the link went.
  | { status?: undefined; success?: boolean }

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const t = useT()
  const c = useColors()
  const still = useReducedMotion()
  // Starts from the account last signed in on this phone, if any.
  const [identifier, setIdentifier] = useState(() => useSession.getState().lastLogin?.identifier ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string[] | null>(null)
  const [resent, setResent] = useState(false)

  async function submit(again = false) {
    const id = identifier.trim()
    if (!id || busy) return
    setBusy(true)
    setError('')
    try {
      const r = await api<ForgotResult>('/api/parent/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier: id }) })
      if (r.status === 'sent') { haptic.success(); setSentTo(r.sentTo); setResent(again) }
      else if (r.status === 'not_found') setError(t.forgotPassword.notFound)
      else if (r.status === 'no_contact') setError(t.forgotPassword.noContact)
      else if (r.status === 'ambiguous') setError(t.forgotPassword.ambiguous)
      else if (r.status === 'rate_limited') setError(t.forgotPassword.rateLimited)
      else { haptic.success(); setSentTo([]); setResent(again) }
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? t.forgotPassword.rateLimited
        : err instanceof ApiError || !(err instanceof Error) ? t.forgotPassword.error : err.message)
    } finally {
      setBusy(false)
    }
  }

  function startOver() {
    setSentTo(null)
    setResent(false)
    setError('')
  }

  const back = () => (router.canGoBack() ? router.back() : router.replace('/login'))
  const steps = [t.forgotPassword.step1, t.forgotPassword.step2, t.forgotPassword.step3]

  if (sentTo) {
    return (
      <AuthShell title={sentTo.length ? t.forgotPassword.checkEmail : t.forgotPassword.sentTitle} testID="forgot-password-sent-screen">
        <View className="items-center gap-2" testID="forgot-password-sent" accessibilityLiveRegion="polite">
          <Animated.View entering={still ? undefined : ZoomIn.springify().damping(12)} className="size-16 items-center justify-center rounded-full bg-success-soft">
            <MailCheck size={30} color={c.success} />
          </Animated.View>
          {sentTo.length ? (
            <>
              <Text className="mt-1 text-center text-[15px] text-muted-foreground">{t.forgotPassword.sentToLead}</Text>
              <Text className="text-center text-lg font-bold text-foreground" testID="forgot-password-sent-to">{sentTo.join(', ')}</Text>
            </>
          ) : (
            <Text className="text-center text-[15px] leading-5 text-muted-foreground">{t.forgotPassword.sent(identifier.trim())}</Text>
          )}
        </View>

        {/* The three things to do, numbered, so nobody wonders what happens next. */}
        <View className="gap-3 rounded-2xl bg-card p-4 dark:border dark:border-border">
          <Text className="text-[13px] font-semibold text-muted-foreground">{t.forgotPassword.nextSteps}</Text>
          {steps.map((s, i) => (
            <View key={i} className="flex-row items-center gap-3">
              <View className="size-7 items-center justify-center rounded-full bg-primary-soft">
                <Text className="text-[13px] font-bold text-primary">{i + 1}</Text>
              </View>
              <Text className="flex-1 text-[15px] leading-5 text-foreground">{s}</Text>
            </View>
          ))}
        </View>
        <Text className="text-center text-[13px] leading-[18px] text-muted-foreground">{t.forgotPassword.expires}</Text>

        {resent ? <Alert tone="success">{t.forgotPassword.resent}</Alert> : null}
        {error ? <Alert>{error}</Alert> : null}
        <Button label={t.forgotPassword.backToSignIn} onPress={back} testID="forgot-password-back-link" />
        <Button variant="outline" label={t.forgotPassword.resend} onPress={() => void submit(true)} loading={busy} testID="forgot-password-resend" />
        <Button variant="ghost" label={t.forgotPassword.tryAnother} onPress={startOver} testID="forgot-password-try-another" />
        {sentTo.length ? <Text className="text-center text-xs text-muted-foreground">{t.forgotPassword.notYours}</Text> : null}
      </AuthShell>
    )
  }

  return (
    <AuthShell icon={KeyRound} title={t.forgotPassword.title} subtitle={t.forgotPassword.subtitle} testID="forgot-password-screen">
      <Field
        label={t.forgotPassword.identifierLabel}
        testID="forgot-password-identifier-input"
        icon={UserRound}
        value={identifier}
        onChangeText={v => { setIdentifier(v); setError('') }}
        placeholder={t.login.identifierPlaceholder}
        keyboardType="email-address"
        autoComplete="username"
        autoFocus={!identifier}
        returnKeyType="send"
        onSubmitEditing={() => void submit()}
      />
      {error ? <Alert>{error}</Alert> : null}
      <Button
        label={busy ? t.forgotPassword.sending : t.forgotPassword.send}
        testID="forgot-password-submit-btn"
        onPress={() => void submit()}
        loading={busy}
        disabled={!identifier.trim()}
      />
      <Button variant="ghost" label={t.forgotPassword.backToSignIn} onPress={back} testID="forgot-password-cancel" />
    </AuthShell>
  )
}
