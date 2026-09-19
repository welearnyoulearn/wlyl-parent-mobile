import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { BellOff } from 'lucide-react-native'
import * as Notifications from 'expo-notifications'
import { useSession } from '@/stores/session'
import { api, longDay, type Notification } from '@/lib/api'
import { Screen, Panel, Empty, Alert, Loading, Row } from '@/components/ui'

export default function NotificationsScreen() {
  const { me } = useSession()
  const [items, setItems] = useState<Notification[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!me) return

    function load() {
      api<Notification[]>('/api/notifications')
        .then(setItems)
        .catch((e) => setError(e.message))
    }

    load()
    const sub = Notifications.addNotificationReceivedListener(() => load())

    return () => sub.remove()
  }, [me])

  async function open(n: Notification) {
    if (n.is_read) return
    setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)) ?? null)
    await api('/api/notifications', { method: 'PUT', body: JSON.stringify({ notification_id: n.id }) }).catch(() => null)
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <Screen testID="notifications-screen">
        {error ? (
          <Alert>{error}</Alert>
        ) : !items ? (
          <Loading />
        ) : items.length === 0 ? (
          <Empty icon={BellOff} title="No notifications" />
        ) : (
          <Panel className="divide-y divide-black/5">
            {items.map((n) => (
              <Row key={n.id} onPress={() => open(n)} testID={`notification-${n.id}`} className="items-start">
                <View className={`mt-1.5 size-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-teal-500'}`} />
                <View className="flex-1">
                  <Text className={`text-sm text-foreground ${n.is_read ? '' : 'font-semibold'}`}>
                    {n.title ?? n.type}
                  </Text>
                  {n.message ? <Text className="mt-0.5 text-xs text-muted-foreground">{n.message}</Text> : null}
                  <Text className="mt-1 text-[11px] text-muted-foreground">{longDay(n.created_at)}</Text>
                </View>
              </Row>
            ))}
          </Panel>
        )}
      </Screen>
    </>
  )
}
