import { Linking, Text, View, Pressable } from 'react-native'
import { Stack } from 'expo-router'
import { Bus, Phone } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { hhmm, type Transport } from '@/lib/api'
import { Screen, Loading, Alert, Empty, Panel, Section, Row, Chip } from '@/components/ui'

export default function TransportPage() {
  const { student } = useSession()
  const { data, error, loading, refreshing, refresh, status } = useApi<Transport>(
    student ? `/api/parent/transport?student_id=${student.id}` : null
  )

  if (loading) return <Loading />
  if (status === 404 || status === 405) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Transport' }} />
        <Empty icon={Bus} title="Not available yet" hint="Your school's server doesn't have this feature yet." />
      </Screen>
    )
  }
  if (error) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Transport' }} />
        <Alert>{String(error)}</Alert>
      </Screen>
    )
  }
  if (!data || !student) return <Loading />

  const first = student.name.split(' ')[0]

  if (!data.route) {
    return (
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <Stack.Screen options={{ title: 'Transport' }} />
        <Empty
          icon={Bus}
          title="Not on school transport"
          hint={`${first} isn't assigned to a school bus. Contact the school office to add a route.`}
        />
      </Screen>
    )
  }

  const { route } = data
  const mine = data.stops.find(s => s.id === data.stop_id)

  return (
    <Screen testID="transport-screen" refreshing={refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: 'Transport' }} />
      <View className="space-y-5">
        <Panel className="bg-amber-50 p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-amber-400">
              <Bus size={24} color="#451a03" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-amber-950" testID="transport-route">{route.name}</Text>
              {route.vehicle_number ? (
                <Text className="font-mono text-xs text-amber-900/70">{route.vehicle_number}</Text>
              ) : null}
            </View>
          </View>
          {mine && (
            <View className="mt-3 flex-row flex-wrap justify-between rounded-xl bg-white p-3 shadow-sm">
              <View className="flex-1 items-center">
                <Text className="text-[10px] uppercase tracking-wide text-muted-foreground">Pickup</Text>
                <Text className="text-lg font-bold text-foreground">
                  {mine.pickup_time ? hhmm(mine.pickup_time) : '—'}
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-[10px] uppercase tracking-wide text-muted-foreground">Drop</Text>
                <Text className="text-lg font-bold text-foreground">
                  {mine.drop_time ? hhmm(mine.drop_time) : '—'}
                </Text>
              </View>
              <View className="w-full mt-2 items-center">
                <Text className="text-xs text-muted-foreground">
                  at <Text className="font-medium text-foreground">{mine.name}</Text>
                </Text>
              </View>
            </View>
          )}
        </Panel>

        {(route.driver_name || route.attendant_name) && (
          <Section title="Contacts">
            <Panel className="divide-y divide-border">
              {[
                { role: 'Driver', name: route.driver_name, phone: route.driver_phone },
                { role: 'Attendant', name: route.attendant_name, phone: route.attendant_phone }
              ].filter(c => c.name).map(c => (
                <Row key={c.role}>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">{c.name}</Text>
                    <Text className="text-[11px] text-muted-foreground">{c.role}</Text>
                  </View>
                  {c.phone ? (
                    <Pressable
                      testID={`call-${c.role.toLowerCase()}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Call ${c.role} ${c.name}`}
                      onPress={() => Linking.openURL(`tel:${c.phone}`)}
                      className="h-9 w-9 items-center justify-center rounded-full bg-emerald-50"
                    >
                      <Phone size={16} color="#047857" />
                    </Pressable>
                  ) : null}
                </Row>
              ))}
            </Panel>
          </Section>
        )}

        <Section title="Stops">
          <Panel className="p-4">
            <View className="ml-5 space-y-4 border-l-2 border-dashed border-muted pl-5">
              {data.stops.map(s => {
                const here = s.id === data.stop_id
                return (
                  <View key={s.id} className="relative" testID={`stop-${s.id}`}>
                    <View
                      className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-[4px] border-white ${
                        here ? 'bg-teal-600' : 'bg-muted-foreground/30'
                      }`}
                    />
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className={`text-sm text-foreground ${here ? 'font-semibold' : ''}`}>{s.name}</Text>
                      {here && <Chip tone="teal">{first}&apos;s stop</Chip>}
                    </View>
                    <Text className="text-[11px] text-muted-foreground">
                      {s.pickup_time ? `Pickup ${hhmm(s.pickup_time)}` : ''}
                      {s.pickup_time && s.drop_time ? ' · ' : ''}
                      {s.drop_time ? `Drop ${hhmm(s.drop_time)}` : ''}
                    </Text>
                  </View>
                )
              })}
            </View>
          </Panel>
        </Section>
      </View>
    </Screen>
  )
}
