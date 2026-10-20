import { ClassLoading } from '@/components/class-loading'
import { useState } from 'react'
import { ScrollView, View, Text, Pressable } from 'react-native'
import { Stack } from 'expo-router'
import { Coffee } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { DAYS, hhmm, type Timetable } from '@/lib/api'
import { Screen, Loading, Alert, Empty, Panel, Row, Chip, Divider } from '@/components/ui'

export default function TimetableScreen() {
  const { student } = useSession()
  const [dayName, setDayName] = useState(DAYS[(new Date().getDay() + 6) % 7])

  const { data, error, status, loading, refreshing, refresh } = useApi<Timetable>(
    student && student.class_id > 0 ? `/api/parent/timetable?school_id=${student.school_id}&class_id=${student.class_id}` : null
  )

  if (student && student.class_id === 0) return <Screen><ClassLoading /></Screen>

  if (status === 404 || status === 405) {
    return (
      <View className="flex-1 bg-background pt-4 px-4">
        <Stack.Screen options={{ title: 'Timetable' }} />
        <Empty icon={Coffee} title="Not available yet" hint="Your school's server doesn't have this feature yet." />
      </View>
    )
  }

  const days = data ? DAYS.filter(d => data.week_periods.some(p => p.day_of_week === d)) : []
  const availableDays = days.length ? days : DAYS.slice(0, 6)
  const periods = data ? data.week_periods.filter(p => p.day_of_week === dayName).sort((a, b) => a.period_number - b.period_number) : []

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} testID="timetable-screen">
      <Stack.Screen options={{ title: 'Timetable' }} />
      {loading ? (
        <Loading />
      ) : error ? (
        <Alert>{error}</Alert>
      ) : !data ? (
        <Empty icon={Coffee} title="No data" />
      ) : (
        <View className="gap-4">
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-1 py-1">
              {availableDays.map(d => (
                <Pressable
                  key={d}
                  onPress={() => setDayName(d)}
                  testID={`day-${d.toLowerCase()}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: d === dayName }}
                  className={`rounded-full px-4 py-2 ${d === dayName ? 'bg-teal-700' : 'bg-card border border-border'}`}
                >
                  <Text className={`text-xs font-medium ${d === dayName ? 'text-white' : 'text-muted-foreground'}`}>
                    {d.slice(0, 3)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {periods.length === 0 ? (
            <Empty icon={Coffee} title={`No classes on ${dayName}`} />
          ) : (
            <Panel className="overflow-hidden">
              {periods.map((p, i) => (
                <View key={p.period_number}>
                  {i > 0 && <Divider />}
                  {p.is_break ? (
                    <Row className="bg-muted/40 py-2">
                      <Coffee size={16} color="#6b7280" />
                      <Text className="flex-1 text-xs text-muted-foreground">
                        {p.break_label ?? 'Break'} · {hhmm(p.time_from)}–{hhmm(p.time_to)}
                      </Text>
                    </Row>
                  ) : (
                    <Row>
                      <View className="w-16 shrink-0">
                        <Text className="text-[11px] text-muted-foreground">{hhmm(p.time_from)}</Text>
                        <Text className="text-[11px] text-muted-foreground">{hhmm(p.time_to)}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-foreground">{p.subject_name ?? 'Free period'}</Text>
                        {p.teacher_name && <Text className="text-[11px] text-muted-foreground mt-0.5">{p.teacher_name}</Text>}
                      </View>
                      <Chip>P{p.period_number}</Chip>
                    </Row>
                  )}
                </View>
              ))}
            </Panel>
          )}
        </View>
      )}
    </Screen>
  )
}
