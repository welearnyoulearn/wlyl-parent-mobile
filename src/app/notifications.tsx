import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Stack, useRouter, type Href } from 'expo-router'
import { BellOff } from 'lucide-react-native'
import { onNotificationReceived } from '@/lib/push'
import { useSession } from '@/stores/session'
import { api, longDay, type Notification } from '@/lib/api'
import { Screen, Panel, Empty, Alert, Loading, Row, Section } from '@/components/ui'
import { useT, type Strings } from '@/lib/i18n'

// Feature groups, as in the platform's app/components/notificationGroups.ts (guide §8).
type GroupId = keyof Strings['notifications']['groups']
const ORDER: GroupId[] = ['exams', 'marks', 'messages', 'attendance', 'birthdays', 'fees', 'other']
const GROUP: Record<string, GroupId> = {
  exam_scheduled: 'exams', exam_updated: 'exams', exam_cancelled: 'exams',
  exam_reminder_7day: 'exams', exam_reminder_1day: 'exams', exam_reminder_today: 'exams',
  marks_released: 'marks', ack_nudge: 'marks',
  teacher_broadcast: 'messages',
  attendance_reminder: 'attendance',
  birthday: 'birthdays',
  fee_year_end_reminder: 'fees', fee_writeoff_request: 'fees', fee_writeoff_decided: 'fees',
}
const groupOf = (type: string): GroupId => GROUP[type] ?? 'other'

// `data` is JSONB (an object), but older rows or proxies may send it as a JSON string.
function dataOf(n: Notification): Record<string, unknown> {
  if (n.data && typeof n.data === 'object') return n.data
  if (typeof n.data !== 'string') return {}
  try {
    const v: unknown = JSON.parse(n.data)
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// Where a tap goes: exam notices → exam calendar; results and sign-off reminders → that mark sheet.
function routeFor(n: Notification): Href | null {
  switch (groupOf(n.type)) {
    case 'exams': return { pathname: '/exams', params: { tab: 'upcoming' } }
    case 'marks': {
      const examId = Number(dataOf(n).exam_id)
      return examId > 0 ? { pathname: '/exam/[id]', params: { id: String(examId) } } : { pathname: '/exams', params: { tab: 'results' } }
    }
    case 'fees': return '/fees'
    case 'attendance': return '/attendance'
    default: return null
  }
}

export default function NotificationsScreen() {
  const { me, children, student, selectChild } = useSession()
  const t = useT()
  const router = useRouter()
  const [items, setItems] = useState<Notification[] | null>(null)
  const [error, setError] = useState('')
  const [markError, setMarkError] = useState('')

  useEffect(() => {
    if (!me) return

    function load() {
      api<Notification[]>('/api/notifications')
        .then(setItems)
        .catch((e) => setError(e.message))
    }

    load()
    // Real time: a push that arrives while this screen is open shows up at once.
    return onNotificationReceived(load)
  }, [me])

  async function open(n: Notification) {
    const href = routeFor(n)
    if (href) {
      // Notifications are per parent; open the result for the child it is about.
      const childId = Number(dataOf(n).student_id)
      const child = children.find(c => c.id === childId)
      if (child && child.id !== student?.id) selectChild(child)
      router.push(href)
    }
    if (n.is_read) return
    setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)) ?? null)
    await api('/api/notifications', { method: 'PUT', body: JSON.stringify({ notification_id: n.id }) }).catch(() => null)
  }

  // Marks every notification (ids undefined) or the given ones read.
  async function markRead(ids?: number[]) {
    setMarkError('')
    try {
      await api('/api/notifications', { method: 'PUT', body: JSON.stringify(ids ? { notification_ids: ids.slice(0, 200) } : {}) })
      const done = ids && new Set(ids)
      setItems((list) => list?.map((x) => (!done || done.has(x.id) ? { ...x, is_read: true } : x)) ?? null)
    } catch {
      setMarkError(t.notifications.markError)
    }
  }

  const groups = ORDER
    .map((id) => ({ id, items: items?.filter((n) => groupOf(n.type) === id) ?? [] }))
    .filter((g) => g.items.length > 0)
  const anyUnread = items?.some((n) => !n.is_read) ?? false

  return (
    <>
      <Stack.Screen options={{ title: t.screenTitles.notifications }} />
      <Screen testID="notifications-screen">
        {error ? (
          <Alert>{error}</Alert>
        ) : !items ? (
          <Loading />
        ) : items.length === 0 ? (
          <Empty icon={BellOff} title={t.notifications.empty} />
        ) : (
          <>
            {markError ? <Alert>{markError}</Alert> : null}
            {anyUnread && (
              <Pressable onPress={() => markRead()} testID="notifications-mark-all" accessibilityRole="button" hitSlop={8} className="self-end">
                <Text className="text-xs font-medium text-primary">{t.notifications.markAllRead}</Text>
              </Pressable>
            )}
            {groups.map((g) => {
              const unread = g.items.filter((n) => !n.is_read).map((n) => n.id)
              return (
                <Section
                  key={g.id}
                  title={unread.length ? `${t.notifications.groups[g.id]} · ${unread.length}` : t.notifications.groups[g.id]}
                  action={unread.length ? { label: t.notifications.markGroupRead, onPress: () => markRead(unread), testID: `notifications-mark-${g.id}` } : undefined}
                >
                  <Panel className="divide-y divide-black/5" testID={`notification-group-${g.id}`}>
                    {g.items.map((n) => (
                      <Row key={n.id} onPress={() => open(n)} testID={`notification-${n.id}`} className="items-start">
                        <View className={`mt-1.5 size-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-teal-500'}`} />
                        <View className="flex-1">
                          <Text className={`text-sm text-foreground ${n.is_read ? '' : 'font-semibold'}`}>
                            {n.title ?? n.type}
                          </Text>
                          {n.message ? <Text className="mt-0.5 text-xs text-muted-foreground">{n.message}</Text> : null}
                          <Text className="mt-1 text-[11px] text-muted-foreground">
                            {n.sender_name ? `${n.sender_name} · ` : ''}{longDay(n.created_at)}
                          </Text>
                        </View>
                      </Row>
                    ))}
                  </Panel>
                </Section>
              )
            })}
          </>
        )}
      </Screen>
    </>
  )
}
