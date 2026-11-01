import { useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { KeyRound, MailCheck, UserRound } from 'lucide-react-native'
import { api, ApiError } from '@/lib/api'
import { AuthShell } from '@/components/auth-shell'
import { Button, Field, Alert, IconTile, haptic, Text } from '@/components/ui'
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
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string[] | null>(null)

  async function submit() {
    const id = identifier.trim()
    if (!id || busy) return
    setBusy(true)
    setError('')
    try {
      const r = await api<ForgotResult>('/api/parent/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier: id }) })
      if (r.status === 'sent') { haptic.success(); setSentTo(r.sentTo) }
      else if (r.status === 'not_found') setError(t.forgotPassword.notFound)
      else if (r.status === 'no_contact') setError(t.forgotPassword.noContact)
      else if (r.status === 'ambiguous') setError(t.forgotPassword.ambiguous)
      else if (r.status === 'rate_limited') setError(t.forgotPassword.rateLimited)
      else { haptic.success(); setSentTo([]) }
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? t.forgotPassword.rateLimited
        : err instanceof ApiError || !(err instanceof Error) ? t.forgotPassword.error : err.message)
    } finally {
      setBusy(false)
    }
  }

  const back = () => (router.canGoBack() ? router.back() : router.replace('/login'))

  return (
    <AuthShell icon={KeyRound} title={t.forgotPassword.title} subtitle={sentTo ? undefined : t.forgotPassword.subtitle}>
      {sentTo ? (
        <View className="items-center gap-3 py-2" testID="forgot-password-sent" accessibilityLiveRegion="polite">
          <IconTile icon={MailCheck} tone="green" size="lg" />
          <Text className="text-xl font-extrabold text-foreground">{sentTo.length ? t.forgotPassword.checkEmail : t.forgotPassword.sentTitle}</Text>
          {sentTo.length ? (
            <>
              <Text className="text-center text-sm text-muted-foreground">{t.forgotPassword.sentToLead}</Text>
              <Text className="text-center text-base font-bold text-foreground" testID="forgot-password-sent-to">{sentTo.join(', ')}</Text>
              <Text className="text-center text-sm leading-5 text-muted-foreground">{t.forgotPassword.expires}</Text>
              <Text className="text-center text-xs text-muted-foreground">{t.forgotPassword.notYours}</Text>
            </>
          ) : (
            <Text className="text-center text-sm leading-5 text-muted-foreground">{t.forgotPassword.sent(identifier.trim())}</Text>
          )}
          <Text className="text-center text-sm leading-5 text-muted-foreground">{t.forgotPassword.openLink}</Text>
        </View>
      ) : (
        <>
          <Field
            label={t.forgotPassword.identifierLabel}
            testID="forgot-password-identifier-input"
            icon={UserRound}
            value={identifier}
            onChangeText={v => { setIdentifier(v); setError('') }}
            placeholder={t.login.identifierPlaceholder}
            keyboardType="email-address"
            autoComplete="username"
            returnKeyType="send"
            onSubmitEditing={submit}
          />
          {error ? <Alert>{error}</Alert> : null}
          <Button
            label={busy ? t.forgotPassword.sending : t.forgotPassword.send}
            testID="forgot-password-submit-btn"
            onPress={submit}
            loading={busy}
            disabled={!identifier.trim()}
          />
        </>
      )}
      <Button variant="ghost" label={t.forgotPassword.back} onPress={back} testID="forgot-password-back-link" />
    </AuthShell>
  )
}
