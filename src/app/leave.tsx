import { useState } from 'react'
import { Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { CalendarX2, Clock } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { api, longDay, type LeaveRequest, ApiError } from '@/lib/api'
import { useApi } from '@/lib/use-api'
import { Screen, Panel, Empty, Chip, Alert, Loading, Button, Field, type Tone } from '@/components/ui'

const TONE: Record<string, Tone> = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'muted' }
const iso = (d: Date) => d.toISOString().slice(0, 10)

function ApplyForm({ studentId, name, onCancel, onDone }: { studentId: number; name: string; onCancel: () => void; onDone: () => void }) {
  const [from, setFrom] = useState(() => iso(new Date()))
  const [to, setTo] = useState(() => iso(new Date()))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return setError('From date must be YYYY-MM-DD')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) return setError('To date must be YYYY-MM-DD')
    if (to < from) return setError('End date must be on or after the start date')
    if (reason.trim().length < 3) return setError('Please give a short reason')

    setBusy(true)
    setError('')
    try {
      await api('/api/parent/leave', {
        method: 'POST',
        body: JSON.stringify({ student_id: studentId, from_date: from, to_date: to, reason: reason.trim() })
      })
      onDone()
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
         setError('Not available yet: Your school\'s server doesn\'t have this feature yet.')
      } else {
         setError(err instanceof Error ? err.message : 'Could not apply')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className="gap-4" testID="leave-sheet">
      <View>
        <Text className="text-xl font-bold text-foreground">Apply for {name}&apos;s leave</Text>
        <Text className="mt-1 text-sm text-muted-foreground">The class teacher will approve or reject it. You&apos;ll get a notification.</Text>
      </View>

      <View className="gap-4">
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Field
              label="From"
              value={from}
              onChangeText={setFrom}
              placeholder="YYYY-MM-DD"
              testID="leave-from-input"
              maxLength={10}
            />
            <Text className="mt-1 text-xs text-muted-foreground">Format: YYYY-MM-DD</Text>
          </View>
          <View className="flex-1">
            <Field
              label="To"
              value={to}
              onChangeText={setTo}
              placeholder="YYYY-MM-DD"
              testID="leave-to-input"
              maxLength={10}
            />
            <Text className="mt-1 text-xs text-muted-foreground">Format: YYYY-MM-DD</Text>
          </View>
        </View>

        <Field
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder="e.g. Fever, family function"
          multiline
          numberOfLines={3}
          maxLength={500}
          testID="leave-reason-input"
          style={{ height: 80, textAlignVertical: 'top', paddingTop: 12, paddingBottom: 12 }}
        />

        {error ? <Alert>{error}</Alert> : null}

        <View className="mt-2 gap-3">
          <Button label={busy ? 'Sending…' : 'Send to class teacher'} onPress={submit} disabled={busy} testID="leave-submit-btn" />
          <Button label="Cancel" variant="outline" onPress={onCancel} disabled={busy} testID="leave-cancel-btn" />
        </View>
      </View>
    </View>
  )
}

export default function LeavePage() {
  const { student } = useSession()
  const { data: items, loading, error: fetchError, status, refreshing, refresh } = useApi<LeaveRequest[]>(student ? `/api/parent/leave?student_id=${student.id}` : null)

  const [applying, setApplying] = useState(false)
  const [cancelling, setCancelling] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')

  if (status === 404 || status === 405) {
    return (
      <>
        <Stack.Screen options={{ title: 'Leave' }} />
        <Screen testID="leave-screen-404">
          <Empty icon={Clock} title="Not available yet" hint="Your school's server doesn't have this feature yet." />
        </Screen>
      </>
    )
  }

  async function cancel(id: number) {
    setCancelling(id)
    setActionError('')
    try {
      await api(`/api/parent/leave/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'cancel' }) })
      refresh()
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 405)) {
        setActionError('Not available yet: Your school\'s server doesn\'t have this feature yet.')
      } else {
        setActionError(e instanceof Error ? e.message : 'Could not cancel')
      }
    } finally {
      setCancelling(null)
    }
  }

  const first = student?.name.split(' ')[0] ?? ''

  return (
    <>
      <Stack.Screen options={{ title: 'Leave' }} />
      <Screen testID="leave-screen" refreshing={refreshing} onRefresh={refresh}>
        {fetchError && <Alert>{fetchError}</Alert>}

        {loading ? <Loading /> : items && student ? (
          applying ? (
            <ApplyForm
              studentId={student.id}
              name={first}
              onCancel={() => setApplying(false)}
              onDone={() => { setApplying(false); refresh() }}
            />
          ) : (
            <View className="gap-4">
              <Button label="Apply for leave" onPress={() => setApplying(true)} testID="leave-apply-btn" />

              {actionError ? <Alert>{actionError}</Alert> : null}

              {items.length === 0 ? (
                <Empty icon={CalendarX2} title="No leave requests" hint={`Apply here when ${first} will miss school.`} />
              ) : (
                items.map(l => (
                  <Panel key={l.id} className="p-4" testID={`leave-${l.id}`}>
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1 shrink">
                        <Text className="text-sm font-semibold text-foreground">
                          {l.from_date === l.to_date ? longDay(l.from_date) : `${longDay(l.from_date)} – ${longDay(l.to_date)}`}
                        </Text>
                        <Text className="mt-0.5 text-xs text-muted-foreground">{l.reason}</Text>
                      </View>
                      <View className="shrink-0">
                        <Chip tone={TONE[l.status] || 'muted'}>
                          {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                        </Chip>
                      </View>
                    </View>
                    {(l.reviewed_by_name || l.review_note) && l.status !== 'cancelled' && (
                      <View className="mt-2 rounded-xl bg-muted/60 px-3 py-2">
                        <Text className="text-xs text-foreground">
                          {l.reviewed_by_name && <Text className="font-medium">{l.reviewed_by_name}{l.review_note ? ': ' : ''}</Text>}
                          {l.review_note}
                        </Text>
                      </View>
                    )}
                    {l.status === 'pending' && (
                      <View className="mt-3">
                        <Button
                          variant="outline"
                          label={cancelling === l.id ? 'Cancelling…' : 'Cancel request'}
                          disabled={cancelling === l.id}
                          onPress={() => cancel(l.id)}
                          testID={`leave-cancel-${l.id}`}
                        />
                      </View>
                    )}
                  </Panel>
                ))
              )}
            </View>
          )
        ) : null}
      </Screen>
    </>
  )
}
