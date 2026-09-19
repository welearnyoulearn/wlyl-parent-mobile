import { useState } from 'react'
import { Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { AlertCircle, CheckCircle2 } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { api, ApiError } from '@/lib/api'
import { Screen, Panel, Section, Row, Button, Field, Alert, Empty, Avatar, Divider, COLORS } from '@/components/ui'

export default function ProfileScreen() {
  const { me, children, load } = useSession()
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

    if (n.length < 2) return setError('Enter your name')
    if (e !== '' && !/^\S+@\S+\.\S+$/.test(e)) return setError('Enter a valid email')
    if (p !== '' && !/^[6-9]\d{9}$/.test(p)) return setError('Enter a 10-digit mobile number')
    if (!e && !p) return setError('Keep at least an email or a phone number to sign in with')

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
        setError(err instanceof Error ? err.message : 'Could not save')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <Screen testID="profile-screen">
        <Section title="School Details">
          <Panel>
            <View className="px-4 py-3">
              <Text className="text-sm font-medium text-foreground">{me.school_name ?? 'School'}</Text>
            </View>
          </Panel>
        </Section>

        <Section title={children.length > 1 ? 'Linked Children' : 'Linked Child'}>
          <Panel className="divide-y divide-black/5">
            {children.map((c, i) => (
              <View key={c.id}>
                {i > 0 && <Divider />}
                <Row className="items-center">
                  <Avatar name={c.name} className="size-10 bg-teal-50" textClassName="text-sm text-teal-800" />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">{c.name}</Text>
                    <Text className="text-[11px] text-muted-foreground">
                      Class {c.grade}-{c.section} · Roll {c.roll_number.split('-').pop()}
                    </Text>
                  </View>
                </Row>
              </View>
            ))}
          </Panel>
        </Section>

        <Section title="Edit Profile">
          {notAvailable ? (
            <Empty icon={AlertCircle} title="Not available yet" hint="Editing your profile isn't available yet." />
          ) : (
            <Panel className="gap-3 p-4">
              <Field
                label="Name"
                value={name}
                onChangeText={setName}
                autoComplete="name"
                testID="profile-name-input"
              />
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                testID="profile-email-input"
              />
              <Field
                label="Mobile number"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
                keyboardType="number-pad"
                maxLength={10}
                autoComplete="tel"
                testID="profile-phone-input"
              />
              <Text className="text-[11px] text-muted-foreground">
                You sign in with this email or mobile number.
              </Text>

              {error ? <Alert>{error}</Alert> : null}
              {saved ? (
                <View className="flex-row items-center gap-1.5">
                  <CheckCircle2 size={16} color={COLORS.green} />
                  <Text className="text-sm text-emerald-700">Saved</Text>
                </View>
              ) : null}

              <Button
                label={busy ? 'Saving…' : 'Save changes'}
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
