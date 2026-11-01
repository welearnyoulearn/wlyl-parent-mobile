import { Fragment, useState, useMemo } from 'react'
import { ScrollView, View, Pressable } from 'react-native'
import { Stack } from 'expo-router'
import { CalendarDays } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { longDay, titleCase, type SchoolCalendar, type CalendarEvent } from '@/lib/api'
import { Screen, Loading, ErrorState, Empty, Panel, Divider, Text } from '@/components/ui'
import { MonthCalendar, monthRange, shiftMonth, todayISO } from '@/components/month-calendar'
import { useT, type Strings } from '@/lib/i18n'

type LabelKey = Exclude<keyof Strings['calendar'], 'nothingOn'>

type Kind = 'holiday' | 'exam' | 'event'

const FILTERS = [['all', 'filterAll'], ['holiday', 'filterHolidays'], ['exam', 'filterExams'], ['event', 'filterEvents']] as const satisfies readonly (readonly [Kind | 'all', LabelKey])[]
const DOT: Record<Kind | 'all', string> = { all: 'bg-primary', holiday: 'bg-success-graphic', exam: 'bg-accent', event: 'bg-info-graphic' }
const BADGE: Record<Kind, string> = { holiday: 'bg-success-soft', exam: 'bg-accent-soft', event: 'bg-info-soft' }
const BADGE_TEXT: Record<Kind, string> = { holiday: 'text-success', exam: 'text-accent', event: 'text-info' }
const EVENT_LABEL: Record<string, LabelKey> = { holiday: 'labelHoliday', exam: 'labelExam', meeting: 'labelMeeting', event: 'labelEvent', other: 'labelOther' }

const kindOf = (eventType: string): Kind => (eventType === 'holiday' || eventType === 'exam' ? eventType : 'event')
const covers = (e: CalendarEvent, d: string) => e.event_date <= d && d <= (e.end_date ?? e.event_date)

function EventLine({ e }: { e: CalendarEvent }) {
  const t = useT()
  const k = kindOf(e.event_type)
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <View className={`rounded-full px-2.5 py-0.5 ${BADGE[k]}`}>
          <Text className={`text-[11px] font-semibold ${BADGE_TEXT[k]}`}>
            {e.event_type in EVENT_LABEL ? t.calendar[EVENT_LABEL[e.event_type]] : titleCase(e.event_type)}
          </Text>
        </View>
        <Text className="flex-1 text-[15px] font-medium text-foreground">{e.title}</Text>
      </View>
      {e.description ? <Text className="text-sm leading-5 text-muted-foreground">{e.description}</Text> : null}
    </View>
  )
}

export default function CalendarScreen() {
  const { student } = useSession()
  const t = useT()
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
      <Screen>
        <Stack.Screen options={{ title: t.screenTitles.calendar }} />
        <Empty icon={CalendarDays} title={t.notAvailableTitle} hint={t.notAvailableHint} />
      </Screen>
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
      <Stack.Screen options={{ title: t.screenTitles.calendar }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4" contentContainerClassName="gap-2 px-4">
        {FILTERS.map(([k, labelKey]) => {
          const on = k === filter
          return (
            <Pressable
              key={k}
              onPress={() => setFilter(k)}
              testID={`calendar-filter-${k}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              className={`min-h-10 flex-row items-center gap-2 rounded-full border px-4 ${on ? 'border-primary bg-primary' : 'border-border bg-card active:bg-muted'}`}
            >
              {k !== 'all' && <View className={`size-2 rounded-full ${on ? 'bg-primary-foreground' : DOT[k]}`} />}
              <Text className={`text-sm font-semibold ${on ? 'text-primary-foreground' : 'text-foreground'}`}>
                {t.calendar[labelKey]}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {eventsApi.loading ? (
        <Loading />
      ) : eventsApi.error && !eventsApi.data ? (
        <ErrorState message={eventsApi.error} onRetry={eventsApi.refresh} busy={eventsApi.refreshing} />
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
              if (evs.some(e => e.event_type === 'holiday')) return 'bg-success-soft'
              const dow = new Date(`${d}T00:00:00`).getDay()
              return weeklyOff.includes(dow) ? 'bg-muted' : ''
            }}
            dayMarkers={d => {
              const evs = eventsOn(d)
              if (!evs.length) return null
              return (
                <View className="flex-row gap-0.5">
                  {evs.slice(0, 3).map(e => <View key={e.id} className={`size-1.5 rounded-full ${DOT[kindOf(e.event_type)]}`} />)}
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
                <View className="gap-3">
                  <Text className="text-sm font-semibold text-foreground">{longDay(selected)}</Text>
                  {selectedEvents.map(e => <EventLine key={e.id} e={e} />)}
                </View>
              ) : (
                <Text className="text-sm text-muted-foreground">{t.calendar.nothingOn(longDay(selected))}</Text>
              )
            ) : monthEvents.length === 0 ? (
              <Text className="text-sm text-muted-foreground">{t.calendar.nothingThisMonth}</Text>
            ) : (
              <View>
                <Text className="mb-1 text-xs font-semibold text-muted-foreground">{t.thisMonth}</Text>
                {monthEvents.map((e, index) => (
                  <Fragment key={e.id}>
                    {index > 0 && <Divider />}
                    <Pressable className="min-h-12 flex-row items-center gap-3 py-2 active:opacity-70" testID={`calendar-item-${e.id}`}
                      onPress={() => { if (e.event_date.slice(0, 7) === month) setSelected(e.event_date) }} accessibilityRole="button">
                      <View className={`h-7 w-1 rounded-full ${DOT[kindOf(e.event_type)]}`} />
                      <Text className="flex-1 text-[15px] text-foreground" numberOfLines={2}>{e.title}</Text>
                      <Text className="text-xs text-muted-foreground">{longDay(e.event_date)}</Text>
                    </Pressable>
                  </Fragment>
                ))}
              </View>
            )}
          </Panel>
        </View>
      )}
    </Screen>
  )
}
