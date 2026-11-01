import { Fragment, useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Stack, useRouter, type Href } from 'expo-router'
import { Bell, BellOff, Brain, CalendarCheck, Cake, CheckCheck, GraduationCap, IndianRupee, Megaphone, NotebookPen, type LucideIcon } from 'lucide-react-native'
import { onNotificationReceived } from '@/lib/push'
import { useSession } from '@/stores/session'
import { api, longDay, type Notification } from '@/lib/api'
import { Screen, Panel, Empty, Alert, ErrorState, ScreenSkeleton, Section, Divider, IconTile, type Tone, Text, useColors } from '@/components/ui'
import { useT, type Strings } from '@/lib/i18n'

// Feature groups, as in the platform's app/components/notificationGroups.ts (guide §8).
type GroupId = keyof Strings['notifications']['groups']
const ORDER: GroupId[] = ['exams', 'marks', 'learning', 'messages', 'attendance', 'birthdays', 'fees', 'other']
const GROUP: Record<string, GroupId> = {
  exam_scheduled: 'exams', exam_updated: 'exams', exam_cancelled: 'exams',
  exam_reminder_7day: 'exams', exam_reminder_1day: 'exams', exam_reminder_today: 'exams',
  marks_released: 'marks', ack_nudge: 'marks',
  teacher_broadcast: 'messages',
  attendance_reminder: 'attendance',
  birthday: 'birthdays',
  fee_year_end_reminder: 'fees', fee_writeoff_request: 'fees', fee_writeoff_decided: 'fees',
}
// Daily Quiz and Student Doubts (#430) send many kinds (daily_quiz_results, doubt_answered, ...).
const groupOf = (type: string): GroupId => GROUP[type] ?? (/^(daily_quiz|doubt)/.test(type) ? 'learning' : 'other')
const LOOK: Record<GroupId, { icon: LucideIcon; tone: Tone }> = {
  exams: { icon: NotebookPen, tone: 'violet' }, marks: { icon: GraduationCap, tone: 'teal' }, learning: { icon: Brain, tone: 'violet' },
  messages: { icon: Megaphone, tone: 'blue' }, attendance: { icon: CalendarCheck, tone: 'red' }, birthdays: { icon: Cake, tone: 'amber' },
  fees: { icon: IndianRupee, tone: 'green' }, other: { icon: Bell, tone: 'muted' },
}

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

// Where a tap goes: exam notices → exam calendar; results and sign-off reminders → that mark sheet;
// quiz and doubt news → that child's Daily Report.
function routeFor(n: Notification): Href | null {
  switch (groupOf(n.type)) {
    case 'exams': return { pathname: '/exams', params: { tab: 'upcoming' } }
    case 'marks': {
      const examId = Number(dataOf(n).exam_id)
      return examId > 0 ? { pathname: '/exam/[id]', params: { id: String(examId) } } : { pathname: '/exams', params: { tab: 'results' } }
    }
    case 'learning': return '/daily-report'
    case 'fees': return '/fees'
    case 'attendance': return '/attendance'
    default: return null
  }
}

export default function NotificationsScreen() {
  const { me, children, student, selectChild } = useSession()
  const t = useT()
  const c = useColors()
  const router = useRouter()
  const [items, setItems] = useState<Notification[] | null>(null)
  const [error, setError] = useState('')
  const [markError, setMarkError] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!me) return

    function load() {
      api<Notification[]>('/api/notifications')
        .then(list => { setItems(list); setError('') })
        .catch((e) => setError(e.message))
    }

    load()
    // Real time: a push that arrives while this screen is open shows up at once.
    return onNotificationReceived(load)
  }, [me, tick])

  async function open(n: Notification) {
    const href = routeFor(n)
    if (href) {
      // Notifications are per parent; open the screen for the child it is about.
      const childId = Number(dataOf(n).student_id)
      const child = children.find(k => k.id === childId)
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
  const unreadTotal = items?.filter((n) => !n.is_read).length ?? 0

  return (
    <>
      <Stack.Screen options={{ title: t.screenTitles.notifications }} />
      <Screen testID="notifications-screen">
        {error && !items ? (
          <ErrorState message={error} onRetry={() => setTick(n => n + 1)} />
        ) : !items ? (
          <ScreenSkeleton rows={5} />
        ) : items.length === 0 ? (
          <Empty icon={BellOff} title={t.notifications.empty} hint={t.notifications.emptyHint} />
        ) : (
          <>
            {markError ? <Alert>{markError}</Alert> : null}
            {unreadTotal > 0 && (
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-primary" accessibilityLiveRegion="polite">{t.notifications.unreadCount(unreadTotal)}</Text>
                <Pressable onPress={() => markRead()} testID="notifications-mark-all" accessibilityRole="button" hitSlop={8}
                  className="flex-row items-center gap-1.5 rounded-full bg-primary-soft px-3.5 py-1.5 active:opacity-70">
                  <CheckCheck size={15} color={c.primary} strokeWidth={2.4} />
                  <Text className="text-xs font-bold text-primary">{t.notifications.markAllRead}</Text>
                </Pressable>
              </View>
            )}
            {groups.map((g) => {
              const unread = g.items.filter((n) => !n.is_read).map((n) => n.id)
              const look = LOOK[g.id]
              return (
                <Section
                  key={g.id}
                  title={unread.length ? `${t.notifications.groups[g.id]} · ${unread.length}` : t.notifications.groups[g.id]}
                  action={unread.length ? { label: t.notifications.markGroupRead, onPress: () => markRead(unread), testID: `notifications-mark-${g.id}` } : undefined}
                >
                  <Panel className="overflow-hidden" testID={`notification-group-${g.id}`}>
                    {g.items.map((n, i) => (
                      <Fragment key={n.id}>
                        {i > 0 && <Divider inset />}
                        <Pressable onPress={() => open(n)} testID={`notification-${n.id}`} accessibilityRole="button"
                          className={`flex-row items-start gap-3.5 px-4 py-3.5 active:bg-muted ${n.is_read ? '' : 'bg-primary-soft'}`}>
                          <IconTile icon={look.icon} tone={look.tone} size="sm" />
                          <View className="flex-1 gap-0.5">
                            <Text className={`text-[15px] leading-5 text-foreground ${n.is_read ? 'font-medium' : 'font-bold'}`}>{n.title ?? n.type}</Text>
                            {n.message ? <Text className="text-sm leading-5 text-muted-foreground">{n.message}</Text> : null}
                            <Text className="mt-0.5 text-xs text-muted-foreground">{n.sender_name ? `${n.sender_name} · ` : ''}{longDay(n.created_at)}</Text>
                          </View>
                          {!n.is_read && <View className="mt-1.5 size-2.5 rounded-full bg-primary" accessibilityElementsHidden />}
                        </Pressable>
                      </Fragment>
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
