import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { api, birthday, dobInput, isoDate } from '@/lib/api'
import { Button, Field, Alert, Row } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { useSession } from '@/stores/session'

// Ported from the web's BirthdayField: the first-login prompt (with Skip) and the
// Add/Edit row on Profile. The server checks the age rules (18–100, not in the
// future); here we only make sure it is a real YYYY-MM-DD date.
export function BirthdayField({ value, onSaved, onSkip }: { value: string | null; onSaved?: () => void; onSkip?: () => void }) {
  const t = useT()
  const [editing, setEditing] = useState(!!onSkip)
  const [date, setDate] = useState(value?.slice(0, 10) ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!isoDate(date)) return setError(t.birthday.invalid)
    setBusy(true)
    setError('')
    try {
      await api('/api/parent/auth/date-of-birth', { method: 'PUT', body: JSON.stringify({ date_of_birth: date }) })
      // Patch the session rather than reloading /me, so Profile doesn't blank out while it refetches.
      useSession.setState(s => ({ me: s.me && { ...s.me, date_of_birth: date } }))
      setEditing(false)
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.birthday.error)
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <Row>
        <View className="flex-1">
          <Text className="text-[11px] text-muted-foreground">{t.birthday.label}</Text>
          <Text className="text-sm font-medium text-foreground">{value ? birthday(value) : '—'}</Text>
        </View>
        <Pressable onPress={() => { setDate(value?.slice(0, 10) ?? ''); setError(''); setEditing(true) }}
          testID="birthday-edit-btn" accessibilityRole="button" hitSlop={8}
          accessibilityLabel={`${value ? t.birthday.edit : t.birthday.add} ${t.birthday.label}`}>
          <Text className="text-xs font-medium text-primary">{value ? t.birthday.edit : t.birthday.add}</Text>
        </Pressable>
      </Row>
    )
  }

  return (
    <View className="gap-3 p-4">
      <Field
        label={t.birthday.inputLabel}
        testID="birthday-date-input"
        value={date}
        onChangeText={v => setDate(dobInput(v))}
        placeholder="YYYY-MM-DD"
        keyboardType="number-pad"
        maxLength={10}
        autoComplete="birthdate-full"
      />
      {error ? <Alert>{error}</Alert> : null}
      <Button label={busy ? t.savingEllipsis : t.birthday.save} testID="birthday-save-btn" onPress={save} loading={busy} disabled={busy || !date} />
      {onSkip ? (
        <Button label={t.birthday.skip} testID="birthday-skip-btn" variant="outline" onPress={onSkip} disabled={busy} />
      ) : (
        <Button label={t.cancel} testID="birthday-cancel-btn" variant="outline" onPress={() => { setError(''); setEditing(false) }} disabled={busy} />
      )}
    </View>
  )
}
