import { useState, useMemo } from 'react'
import { ScrollView, View, Text, Pressable } from 'react-native'
import { Stack } from 'expo-router'
import { CalendarDays } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { longDay, titleCase, type SchoolCalendar, type CalendarEvent } from '@/lib/api'
import { Screen, Loading, Alert, Empty, Panel, Divider } from '@/components/ui'
import { MonthCalendar, monthRange, shiftMonth, todayISO } from '@/components/month-calendar'

type Kind = 'holiday' | 'exam' | 'event'

const FILTERS = [['all', 'All'], ['holiday', 'Holidays'], ['exam', 'Exams'], ['event', 'Events']] as const
const DOT: Record<Kind, string> = { holiday: 'bg-emerald-500', exam: 'bg-violet-500', event: 'bg-sky-500' }
const BADGE: Record<Kind, string> = { holiday: 'bg-emerald-50', exam: 'bg-violet-50', event: 'bg-sky-50' }
const BADGE_TEXT: Record<Kind, string> = { holiday: 'text-emerald-700', exam: 'text-violet-700', event: 'text-sky-700' }
const EVENT_LABEL: Record<string, string> = { holiday: 'Holiday', exam: 'Exam', meeting: 'Meeting', event: 'Event', other: 'Other' }

const kindOf = (eventType: string): Kind => (eventType === 'holiday' || eventType === 'exam' ? eventType : 'event')
const covers = (e: CalendarEvent, d: string) => e.event_date <= d && d <= (e.end_date ?? e.event_date)

export default function CalendarScreen() {
  const { student } = useSession()
  const [month, setMonth] = useState(() => todayISO().slice(0, 7))
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<Kind | 'all'>('all')
  const { from, to } = monthRange(month)

  const eventsApi = useApi<SchoolCalendar>(
    student ? `/api/school-calendar?school_id=${student.school_id}&from=${from}&to=${to}` : null
  )

  const events = useMemo(() => {
    if (!eventsApi.data) return []
    return eventsApi.data.events.filter(e => filter === 'all' || kindOf(e.event_type) === filter)
  }, [eventsApi.data, filter])

  const eventsOn = (d: string) => events.filter(e => covers(e, d))

  if (eventsApi.status === 404 || eventsApi.status === 405) {
    return (
      <View className="flex-1 bg-background pt-4 px-4">
        <Stack.Screen options={{ title: 'Calendar' }} />
        <Empty icon={CalendarDays} title="Not available yet" hint="Your school's server doesn't have this feature yet." />
      </View>
    )
  }

  function go(delta: number) {
    setMonth(m => shiftMonth(m, delta))
    setSelected(null)
  }

  const weeklyOff = eventsApi.data?.weeklyOff ?? []
  const selectedEvents = selected ? eventsOn(selected) : []
  const monthEvents = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date))

  return (
    <Screen refreshing={eventsApi.refreshing} onRefresh={eventsApi.refresh} testID="calendar-screen">
      <Stack.Screen options={{ title: 'Calendar' }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-1 py-1">
        {FILTERS.map(([k, label]) => (
          <Pressable
            key={k}
            onPress={() => setFilter(k)}
            testID={`calendar-filter-${k}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: k === filter }}
            className={`rounded-full px-4 py-2 ${k === filter ? 'bg-teal-700' : 'bg-card border border-border'}`}
          >
            <Text className={`text-xs font-medium ${k === filter ? 'text-white' : 'text-muted-foreground'}`}>
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {eventsApi.loading ? (
        <Loading />
      ) : eventsApi.error ? (
        <Alert>{eventsApi.error}</Alert>
      ) : (
        <View className="gap-4">
          <MonthCalendar
            month={month}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            selected={selected}
            onSelectDay={d => setSelected(s => (s === d ? null : d))}
            testIDPrefix="cal"
            dayBg={d => {
              const evs = eventsOn(d)
              if (evs.some(e => e.event_type === 'holiday')) return 'bg-emerald-50'
              const dow = new Date(`${d}T00:00:00`).getDay()
              return weeklyOff.includes(dow) ? 'bg-muted' : ''
            }}
            dayMarkers={d => {
              const evs = eventsOn(d)
              if (!evs.length) return null
              return (
                <View className="flex-row gap-0.5">
                  {evs.slice(0, 3).map(e => <View key={e.id} className={`h-1.5 w-1.5 rounded-full ${DOT[kindOf(e.event_type)]}`} />)}
                </View>
              )
            }}
            accessibilityLabelFor={d => {
              const evs = eventsOn(d)
              return evs.length ? `${longDay(d)}: ${evs.map(e => e.title).join(', ')}` : longDay(d)
            }}
          />

          <Panel className="p-4" testID="calendar-detail">
            {selected ? (
              selectedEvents.length > 0 ? (
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">{longDay(selected)}</Text>
                  {selectedEvents.map(e => (
                    <View key={e.id} className="gap-0.5">
                      <View className="flex-row items-center gap-2">
                        <View className={`rounded-full px-2 py-0.5 ${BADGE[kindOf(e.event_type)]}`}>
                          <Text className={`text-[10px] font-medium ${BADGE_TEXT[kindOf(e.event_type)]}`}>
                            {EVENT_LABEL[e.event_type] ?? titleCase(e.event_type)}
                          </Text>
                        </View>
                        <Text className="flex-1 text-sm font-medium text-foreground">{e.title}</Text>
                      </View>
                      {e.description ? <Text className="text-xs text-muted-foreground">{e.description}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-sm text-muted-foreground">{longDay(selected)} — nothing scheduled.</Text>
              )
            ) : monthEvents.length === 0 ? (
              <Text className="text-sm text-muted-foreground">Nothing scheduled this month.</Text>
            ) : (
              <View>
                <Text className="mb-2 text-xs font-medium text-muted-foreground">This month</Text>
                {monthEvents.map((e, index) => (
                  <View key={e.id}>
                    {index > 0 && <Divider />}
                    <View className="flex-row items-center gap-2 py-2" testID={`calendar-item-${e.id}`}>
                      <View className={`h-2 w-2 rounded-full ${DOT[kindOf(e.event_type)]}`} />
                      <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>{e.title}</Text>
                      <Text className="text-xs text-muted-foreground">{longDay(e.event_date)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Panel>
        </View>
      )}
    </Screen>
  )
}
