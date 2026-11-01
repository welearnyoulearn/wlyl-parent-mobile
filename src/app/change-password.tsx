import { useRef, useState } from 'react'
import { View, KeyboardAvoidingView, ScrollView, type TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { CheckCircle2, Circle, ShieldCheck } from 'lucide-react-native'
import { api, ApiError } from '@/lib/api'
import { useSession } from '@/stores/session'
import { Button, Field, Alert, SafeAreaView, BrandBackdrop, useColors, Text } from '@/components/ui'
import { useT } from '@/lib/i18n'

// 0–3: length, then letters+digits, then length 12+ or a symbol.
function strength(pw: string) {
  if (pw.length < 8) return 0
  let s = 1
  if (/[a-z]/i.test(pw) && /\d/.test(pw)) s++
  if (pw.length >= 12 || /[^a-z0-9]/i.test(pw)) s++
  return s
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  const c = useColors()
  return (
    <View className="flex-row items-center gap-2" accessible accessibilityLabel={label} accessibilityState={{ checked: ok }}>
      {ok ? <CheckCircle2 size={16} color={c.success} /> : <Circle size={16} color={c.subtle} />}
      <Text className={`text-[13px] ${ok ? 'text-success' : 'text-muted-foreground'}`}>{label}</Text>
    </View>
  )
}

export default function ChangePasswordScreen() {
  const router = useRouter()
  const t = useT()
  const nextRef = useRef<TextInput>(null)
  const confirmRef = useRef<TextInput>(null)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Opened from Profile once the temporary password is gone; otherwise this is the first-login step.
  const [signedIn] = useState(() => useSession.getState().me?.password_changed ?? false)

  const score = strength(next)
  const longEnough = next.length >= 8
  const matches = next.length > 0 && next === confirm
  const same = next.length > 0 && next === current
  const ready = !!current && longEnough && matches && !same
  const levels = [t.changePassword.weak, t.changePassword.weak, t.changePassword.fair, t.changePassword.strong]
  const barTone = score >= 3 ? 'bg-success-graphic' : score === 2 ? 'bg-warning-graphic' : 'bg-danger-graphic'

  async function submit() {
    if (!current || !next || !confirm) return
    if (next !== confirm) {
      setError(t.changePassword.mismatch)
      return
    }
    if (next.length < 8) {
      setError(t.changePassword.tooShort)
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
      if (signedIn) { router.back(); return }
      // First login: ask for a birthday once, unless the school already has it.
      const me = useSession.getState().me
      router.replace(me && !me.date_of_birth ? '/birthday' : '/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err instanceof Error ? err.message : t.changePassword.error))
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    await useSession.getState().logout()
    router.replace('/login')
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
            <View className="w-full max-w-md items-center gap-3 self-center px-6 pb-12 pt-8">
              <View className="size-16 items-center justify-center rounded-2xl border border-white/25 bg-white/15">
                <ShieldCheck size={30} color="#ffffff" />
              </View>
              <Text accessibilityRole="header" className="text-center text-2xl font-bold tracking-tight text-on-brand">{signedIn ? t.changePassword.changeTitle : t.changePassword.title}</Text>
              <Text className="text-center text-sm leading-5 text-on-brand/85">{signedIn ? t.changePassword.changeSubtitle : t.changePassword.subtitle}</Text>
            </View>
          </SafeAreaView>

          <SafeAreaView edges={['bottom']} className="-mt-6 flex-1 rounded-t-3xl bg-background">
            <View className="w-full max-w-md gap-4 self-center px-6 pb-6 pt-7">
              <Field
                label={signedIn ? t.changePassword.currentLabel : t.changePassword.tempLabel}
                testID="current-password-input"
                value={current}
                onChangeText={setCurrent}
                password
                autoComplete="current-password"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => nextRef.current?.focus()}
              />
              <Field
                label={t.changePassword.newLabel}
                testID="new-password-input"
                inputRef={nextRef}
                value={next}
                onChangeText={setNext}
                password
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmRef.current?.focus()}
                error={same ? t.changePassword.sameAsTemp : undefined}
              />
              {next.length > 0 && (
                <View className="gap-1.5" accessible accessibilityLabel={t.changePassword.strength(levels[score])}>
                  <View className="flex-row gap-1.5">
                    {[1, 2, 3].map(i => <View key={i} className={`h-1.5 flex-1 rounded-full ${i <= Math.max(score, 1) ? barTone : 'bg-muted'}`} />)}
                  </View>
                  <Text className="text-xs text-muted-foreground">{t.changePassword.strength(levels[score])}</Text>
                </View>
              )}
              <Field
                label={t.changePassword.repeatLabel}
                testID="confirm-password-input"
                inputRef={confirmRef}
                value={confirm}
                onChangeText={setConfirm}
                password
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={() => { if (ready) void submit() }}
                error={confirm.length >= next.length && confirm.length > 0 && !matches ? t.changePassword.mismatch : undefined}
              />

              <View className="gap-2 rounded-2xl bg-muted px-4 py-3">
                <Rule ok={longEnough} label={t.changePassword.ruleLength} />
                <Rule ok={matches} label={t.changePassword.ruleMatch} />
              </View>

              {error ? <Alert>{error}</Alert> : null}
              <Button
                label={busy ? t.savingEllipsis : t.changePassword.submit}
                testID="change-password-submit-btn"
                onPress={submit}
                loading={busy}
                disabled={!ready}
              />
              <Button variant="ghost" label={signedIn ? t.cancel : t.changePassword.logout} onPress={signedIn ? () => router.back() : logout}
                testID={signedIn ? 'change-password-cancel-btn' : 'change-password-logout-btn'} />
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
