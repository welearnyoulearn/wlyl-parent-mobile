import { useState, useMemo } from 'react'
import { ScrollView, View, Text, Pressable } from 'react-native'
import { Stack } from 'expo-router'
import { CalendarDays } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { day, longDay, EXAM_TYPE, titleCase, type CalendarEvent, type CalendarExam } from '@/lib/api'
import { Screen, Loading, Alert, Empty, Panel, Section, Divider } from '@/components/ui'

type Kind = 'holiday' | 'exam' | 'event'
type Item = { key: string; kind: Kind; label: string; title: string; start: string; end: string | null; note: string }

const FILTERS = [['all', 'All'], ['holiday', 'Holidays'], ['exam', 'Exams'], ['event', 'Events']] as const
const BADGE: Record<Kind, string> = { holiday: 'bg-emerald-50', exam: 'bg-violet-50', event: 'bg-sky-50' }
const BADGE_TEXT: Record<Kind, string> = { holiday: 'text-emerald-700', exam: 'text-violet-700', event: 'text-sky-700' }
const EVENT_LABEL: Record<string, string> = { holiday: 'Holiday', exam: 'Exam', meeting: 'Meeting', event: 'Event', other: 'Other' }

export default function CalendarScreen() {
  const { student } = useSession()
  const currentYear = new Date().getFullYear()

  const eventsApi = useApi<CalendarEvent[]>(
    student ? `/api/school-calendar?school_id=${student.school_id}&year=${currentYear}` : null
  )
  const examsApi = useApi<CalendarExam[]>(
    // Parents must pass student_id and not class_id; the platform scopes it to that child's class.
    student ? `/api/exams/calendar?school_id=${student.school_id}&student_id=${student.id}` : null
  )

  const loading = eventsApi.loading || examsApi.loading
  const refreshing = eventsApi.refreshing || examsApi.refreshing
  const error = eventsApi.error || examsApi.error
  const status = eventsApi.status || examsApi.status

  const items = useMemo(() => {
    if (!eventsApi.data || !examsApi.data) return null
    const events = eventsApi.data.map((e): Item => ({
      key: `event-${e.id}`,
      kind: e.event_type === 'holiday' || e.event_type === 'exam' ? e.event_type as Kind : 'event',
      label: EVENT_LABEL[e.event_type] ?? titleCase(e.event_type),
      title: e.title,
      start: e.event_date,
      end: e.end_date,
      note: e.description ?? '',
    }))
    const exams = examsApi.data.flatMap((e): Item[] => e.exam_date ? [{
      key: `exam-${e.id}`,
      kind: 'exam',
      label: EXAM_TYPE[e.exam_type] ?? 'Exam',
      title: e.exam_name,
      start: e.exam_date,
      end: null,
      note: e.subjects.length ? `${e.subjects.length} subjects` : '',
    }] : [])
    return [...events, ...exams].sort((a, b) => a.start.localeCompare(b.start))
  }, [eventsApi.data, examsApi.data])

  const [filter, setFilter] = useState<Kind | 'all'>('all')
  const [showPast, setShowPast] = useState(false)

  if (status === 404 || status === 405) {
    return (
      <View className="flex-1 bg-background pt-4 px-4">
        <Stack.Screen options={{ title: 'Calendar' }} />
        <Empty icon={CalendarDays} title="Not available yet" hint="Your school's server doesn't have this feature yet." />
      </View>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const shown = items ? items.filter(i => filter === 'all' || i.kind === filter) : []
  const upcoming = shown.filter(i => (i.end ?? i.start) >= today)
  const past = shown.filter(i => (i.end ?? i.start) < today).reverse()

  const refresh = () => { eventsApi.refresh(); examsApi.refresh(); }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} testID="calendar-screen">
      <Stack.Screen options={{ title: 'Calendar' }} />

      {loading ? (
        <Loading />
      ) : error ? (
        <Alert>{error}</Alert>
      ) : !items ? (
        <Empty icon={CalendarDays} title="No events" />
      ) : (
        <View className="gap-4">
          <View>
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
          </View>

          {upcoming.length === 0 ? (
            <Empty icon={CalendarDays} title="Nothing coming up" hint="Holidays, exams and school events will appear here." />
          ) : (
            <Months items={upcoming} />
          )}

          {past.length > 0 && (
            <Pressable
              onPress={() => setShowPast(v => !v)}
              testID="calendar-toggle-past"
              accessibilityRole="button"
              accessibilityState={{ expanded: showPast }}
              className="py-1"
            >
              <Text className="text-center text-xs font-medium text-primary">
                {showPast ? 'Hide past' : `Show past (${past.length})`}
              </Text>
            </Pressable>
          )}

          {showPast && <Months items={past} past />}
        </View>
      )}
    </Screen>
  )
}

function Months({ items, past = false }: { items: Item[]; past?: boolean }) {
  const groups = items.reduce((acc, item) => {
    const month = item.start.slice(0, 7)
    if (!acc[month]) acc[month] = []
    acc[month].push(item)
    return acc
  }, {} as Record<string, Item[]>)

  return (
    <>
      {Object.entries(groups).map(([month, list]) => {
        const [yy, mm] = month.split('-')
        const monthDate = new Date(parseInt(yy, 10), parseInt(mm, 10) - 1, 1)
        const monthLabel = monthDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

        return (
          <Section key={month} title={monthLabel}>
            <Panel className={`overflow-hidden ${past ? 'opacity-70' : ''}`}>
              {list.map((i, index) => (
                <View key={i.key}>
                  {index > 0 && <Divider />}
                  <View className="flex-row items-center gap-3 px-4 py-3" testID={`calendar-item-${i.key}`}>
                    <View className={`h-12 w-12 shrink-0 items-center justify-center rounded-xl ${BADGE[i.kind]}`}>
                      <Text className={`text-[10px] font-medium uppercase leading-none ${BADGE_TEXT[i.kind]}`}>
                        {new Date(i.start).toLocaleString('en-IN', { month: 'short' })}
                      </Text>
                      <Text className={`text-lg font-bold leading-none ${BADGE_TEXT[i.kind]}`}>
                        {new Date(i.start).getDate()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground">{i.title}</Text>
                      <Text className="text-[11px] text-muted-foreground mt-0.5">
                        {i.label} · {i.end && i.end !== i.start ? `${longDay(i.start)} – ${day(i.end)}` : longDay(i.start)}
                      </Text>
                      {i.note ? (
                        <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={2}>
                          {i.note}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))}
            </Panel>
          </Section>
        )
      })}
    </>
  )
}
