import { useState } from 'react'
import { Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { AlertCircle, CheckCircle2 } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { api, ApiError } from '@/lib/api'
import { Screen, Panel, Section, Row, Button, Field, Alert, Empty, Avatar, Divider, COLORS } from '@/components/ui'
import { useT } from '@/lib/i18n'

export default function ProfileScreen() {
  const { me, children, load } = useSession()
  const t = useT()
  const [name, setName] = useState(me?.name ?? '')
  const [email, setEmail] = useState(me?.email ?? '')
  const [phone, setPhone] = useState(me?.phone ?? '')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notAvailable, setNotAvailable] = useState(false)

  if (!me) return null

  async function submit() {
    const n = name.trim()
    const e = email.trim()
    const p = phone.trim()

    if (n.length < 2) return setError(t.profile.errName)
    if (e !== '' && !/^\S+@\S+\.\S+$/.test(e)) return setError(t.profile.errEmail)
    if (p !== '' && !/^[6-9]\d{9}$/.test(p)) return setError(t.profile.errPhone)
    if (!e && !p) return setError(t.profile.errContact)

    setBusy(true)
    setError('')
    setSaved(false)
    try {
      await api('/api/parent/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name: n, email: e, phone: p }),
      })
      setSaved(true)
      await load()
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        setNotAvailable(true)
      } else {
        setError(err instanceof Error ? err.message : t.profile.saveError)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t.screenTitles.profile }} />
      <Screen testID="profile-screen">
        <Section title={t.profile.schoolDetails}>
          <Panel>
            <View className="px-4 py-3">
              <Text className="text-sm font-medium text-foreground">{me.school_name ?? t.profile.schoolFallback}</Text>
            </View>
          </Panel>
        </Section>

        <Section title={children.length > 1 ? t.profile.linkedChildren : t.profile.linkedChild}>
          <Panel className="divide-y divide-black/5">
            {children.map((c, i) => (
              <View key={c.id}>
                {i > 0 && <Divider />}
                <Row className="items-center">
                  <Avatar name={c.name} className="size-10 bg-teal-50" textClassName="text-sm text-teal-800" />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">{c.name}</Text>
                    <Text className="text-[11px] text-muted-foreground">
                      {t.classRoll(c.grade, c.section, c.roll_number.split('-').pop() ?? '')}
                    </Text>
                  </View>
                </Row>
              </View>
            ))}
          </Panel>
        </Section>

        <Section title={t.profile.editProfile}>
          {notAvailable ? (
            <Empty icon={AlertCircle} title={t.notAvailableTitle} hint={t.profile.editNotAvailableHint} />
          ) : (
            <Panel className="gap-3 p-4">
              <Field
                label={t.profile.nameLabel}
                value={name}
                onChangeText={setName}
                autoComplete="name"
                testID="profile-name-input"
              />
              <Field
                label={t.profile.emailLabel}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                testID="profile-email-input"
              />
              <Field
                label={t.profile.mobileLabel}
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
                keyboardType="number-pad"
                maxLength={10}
                autoComplete="tel"
                testID="profile-phone-input"
              />
              <Text className="text-[11px] text-muted-foreground">
                {t.profile.signInHint}
              </Text>

              {error ? <Alert>{error}</Alert> : null}
              {saved ? (
                <View className="flex-row items-center gap-1.5">
                  <CheckCircle2 size={16} color={COLORS.green} />
                  <Text className="text-sm text-emerald-700">{t.profile.saved}</Text>
                </View>
              ) : null}

              <Button
                label={busy ? t.savingEllipsis : t.profile.saveChanges}
                onPress={submit}
                loading={busy}
                testID="profile-save-btn"
              />
            </Panel>
          )}
        </Section>
      </Screen>
    </>
  )
}
