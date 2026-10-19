import { ClassLoading } from '@/components/class-loading'
import { useEffect, useMemo, useState } from 'react'
import { Text, View, Pressable, ScrollView } from 'react-native'
import { Link, useLocalSearchParams } from 'expo-router'
import { CalendarDays, ChevronRight, GraduationCap, Inbox } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { day, hhmm, longDay, type CalendarExam, type MarkSheet } from '@/lib/api'
import { useApi } from '@/lib/use-api'
import { Screen, Loading, Panel, Empty, Chip, Alert, Ring, Section, Row, Divider } from '@/components/ui'
import { MonthCalendar, monthRange, shiftMonth, todayISO } from '@/components/month-calendar'
import { useT, type Strings } from '@/lib/i18n'

// Exam-type colours from the web calendar (guide Appendix B).
const EXAM_TONE: Record<string, { bg: string; fg: string; dot: string }> = {
  unit_test: { bg: 'bg-red-50', fg: 'text-red-700', dot: 'bg-red-500' },
  mid_term: { bg: 'bg-orange-50', fg: 'text-orange-700', dot: 'bg-orange-500' },
  final_exam: { bg: 'bg-purple-50', fg: 'text-purple-700', dot: 'bg-purple-500' },
  practical: { bg: 'bg-blue-50', fg: 'text-blue-700', dot: 'bg-blue-500' },
}
const OTHER_TONE = { bg: 'bg-muted', fg: 'text-muted-foreground', dot: 'bg-gray-400' }

function ExamTypeChip({ type }: { type: string }) {
  const t = useT()
  const c = EXAM_TONE[type] ?? OTHER_TONE
  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${c.bg}`}>
      <Text className={`text-[11px] font-medium ${c.fg}`}>{t.examType[type] ?? type}</Text>
    </View>
  )
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoFromToday(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return isoDay(d)
}

// Whole days from `today` to a YYYY-MM-DD date; negative when it has passed.
function daysFrom(today: string, d: string) {
  return Math.round((Date.parse(d) - Date.parse(today)) / 86400000)
}

const minutesOf = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function timeRange(e: CalendarExam) {
  if (!e.start_time) return null
  return e.end_time ? `${hhmm(e.start_time)}–${hhmm(e.end_time)}` : hhmm(e.start_time)
}

// From start/end when both are set, else duration_minutes: "2 hours" / "45 min".
function duration(e: CalendarExam, t: Strings) {
  const span = e.start_time && e.end_time ? minutesOf(e.end_time) - minutesOf(e.start_time) : 0
  const total = span > 0 ? span : e.duration_minutes ?? 0
  if (total <= 0) return null
  return total % 60 === 0 ? t.exams.hours(total / 60) : t.exams.minutes(total)
}

const metaLine = (e: CalendarExam, t: Strings) =>
  [timeRange(e), duration(e, t), e.room ? t.exams.room(e.room) : null].filter(Boolean).join(' · ')

const subjectsLine = (subjects: string[]) =>
  `${subjects.slice(0, 2).join(', ')}${subjects.length > 2 ? ` +${subjects.length - 2}` : ''}`

// "In 3 days" / "Tomorrow" ahead of the day; on the day, down to the minute: "Starts in 45 minutes",
// "In progress", then "Done" once it has ended. `nowMin` is minutes since local midnight.
function countdown(e: CalendarExam & { exam_date: string }, today: string, nowMin: number, t: Strings) {
  const days = daysFrom(today, e.exam_date)
  if (days < 0) return t.done
  if (days > 0) return days === 1 ? t.tomorrow : t.exams.inDays(days)
  if (!e.start_time) return t.today
  const start = minutesOf(e.start_time)
  const end = e.end_time ? minutesOf(e.end_time) : e.duration_minutes ? start + e.duration_minutes : null
  if (start - nowMin > 60) return t.exams.startsInHours(Math.round((start - nowMin) / 60))
  if (start > nowMin) return t.exams.startsInMinutes(start - nowMin)
  if (end === null) return t.today
  return nowMin < end ? t.exams.inProgress : t.done
}

type DatedExam = CalendarExam & { exam_date: string }

function ExamCalendar({ schoolId, studentId, nearby }: { schoolId: number; studentId: number; nearby: DatedExam[] }) {
  const [month, setMonth] = useState(() => todayISO().slice(0, 7))
  const [selected, setSelected] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const t = useT()
  const { from, to } = monthRange(month)
  const { data, error, loading } = useApi<CalendarExam[]>(
    `/api/exams/calendar?school_id=${schoolId}&student_id=${studentId}&from=${from}&to=${to}`
  )

  // Keeps "Starts in N minutes" live while the screen is open.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarExam[]>()
    for (const e of data ?? []) {
      if (!e.exam_date) continue
      if (!map.has(e.exam_date)) map.set(e.exam_date, [])
      map.get(e.exam_date)!.push(e)
    }
    return map
  }, [data])

  const today = isoDay(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const todays = nearby.filter(e => e.exam_date === today)
  const upcoming = nearby.filter(e => e.exam_date >= today).sort((a, b) => a.exam_date.localeCompare(b.exam_date))
  const completed = nearby.filter(e => e.exam_date < today).sort((a, b) => b.exam_date.localeCompare(a.exam_date)).slice(0, 10)
  const selectedExams = selected ? byDate.get(selected) ?? [] : []

  function go(delta: number) {
    setMonth(m => shiftMonth(m, delta))
    setSelected(null)
  }

  function jumpTo(date: string) {
    setMonth(date.slice(0, 7))
    setSelected(date)
  }

  return (
    <View className="gap-5" testID="exam-calendar">
      {todays.length > 0 && (
        <View className="gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4" testID="todays-exams" accessibilityRole="summary">
          <Text className="text-xs font-semibold uppercase text-rose-700">{t.exams.todaysExams}</Text>
          {todays.map(e => (
            <View key={e.id}>
              <Text className="text-sm font-bold text-rose-800">{e.exam_name} · {countdown(e, today, nowMin, t)}</Text>
              {metaLine(e, t) ? <Text className="text-xs text-rose-700">{metaLine(e, t)}</Text> : null}
            </View>
          ))}
        </View>
      )}

      {upcoming.length === 0 ? (
        <Empty icon={CalendarDays} title={t.exams.noneScheduledTitle} hint={t.exams.noneScheduledHint} />
      ) : (
        <Section title={t.exams.upcomingTitle}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {upcoming.map(e => {
              const days = daysFrom(today, e.exam_date)
              return (
                <Pressable
                  key={e.id}
                  testID={`upcoming-${e.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${e.exam_name}, ${longDay(e.exam_date)}`}
                  onPress={() => jumpTo(e.exam_date)}
                  className={`w-44 gap-1 rounded-2xl border p-3 ${days === 0 ? 'border-rose-200 bg-rose-50' : days <= 3 ? 'border-orange-200 bg-orange-50' : 'border-border bg-card'}`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold text-muted-foreground">{day(e.exam_date)}</Text>
                    <Chip tone={days === 0 ? 'red' : days <= 3 ? 'amber' : 'muted'}>{days === 0 ? t.today : t.exams.daysShort(days)}</Chip>
                  </View>
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{e.exam_name}</Text>
                  {e.subjects.length > 0 && <Text className="text-xs text-muted-foreground" numberOfLines={1}>{subjectsLine(e.subjects)}</Text>}
                  {metaLine(e, t) ? <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{metaLine(e, t)}</Text> : null}
                  <ExamTypeChip type={e.exam_type} />
                </Pressable>
              )
            })}
          </ScrollView>
        </Section>
      )}

      {loading ? <Loading label={t.exams.loadingCalendar} /> : error ? <Alert>{error}</Alert> : (
        <View className="gap-3">
          <MonthCalendar
            month={month}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            selected={selected}
            onSelectDay={d => setSelected(s => (s === d ? null : d))}
            testIDPrefix="exam-cal"
            dayMarkers={d => {
              const exams = byDate.get(d) ?? []
              if (!exams.length) return null
              return (
                <View className="flex-row gap-0.5">
                  {exams.slice(0, 3).map(e => <View key={e.id} className={`h-1.5 w-1.5 rounded-full ${(EXAM_TONE[e.exam_type] ?? OTHER_TONE).dot}`} />)}
                </View>
              )
            }}
            accessibilityLabelFor={d => {
              const exams = byDate.get(d) ?? []
              return exams.length ? `${longDay(d)}: ${exams.map(e => e.exam_name).join(', ')}` : longDay(d)
            }}
          />

          <View className="flex-row flex-wrap gap-3 px-1">
            {Object.entries(EXAM_TONE).map(([type, c]) => (
              <View key={type} className="flex-row items-center gap-1.5">
                <View className={`h-2.5 w-2.5 rounded-sm ${c.dot}`} />
                <Text className="text-xs text-muted-foreground">{t.examType[type]}</Text>
              </View>
            ))}
          </View>

          <Panel className="p-4" testID="exam-calendar-detail">
            {selected ? (
              selectedExams.length > 0 ? (
                <View className="gap-4">
                  <Text className="text-sm font-semibold text-foreground">{longDay(selected)}</Text>
                  {selectedExams.map(e => (
                    <View key={e.id} className="gap-1.5" testID={`exam-detail-${e.id}`}>
                      <Text className="text-sm font-medium text-foreground">{e.exam_name}</Text>
                      <ExamTypeChip type={e.exam_type} />
                      {metaLine(e, t) ? <Text className="text-xs text-muted-foreground">{metaLine(e, t)}</Text> : null}
                      {e.subjects.length > 0 && (
                        <View className="gap-1">
                          <Text className="text-[11px] font-semibold uppercase text-muted-foreground">{t.exams.subjectsLabel}</Text>
                          <View className="flex-row flex-wrap gap-1.5">{e.subjects.map(s => <Chip key={s}>{s}</Chip>)}</View>
                        </View>
                      )}
                      {e.syllabus ? (
                        <View className="gap-0.5">
                          <Text className="text-[11px] font-semibold uppercase text-muted-foreground">{t.exams.syllabusLabel}</Text>
                          <Text className="text-xs text-foreground">{e.syllabus}</Text>
                        </View>
                      ) : null}
                      {e.instructions ? (
                        <View className="gap-0.5">
                          <Text className="text-[11px] font-semibold uppercase text-muted-foreground">{t.exams.instructionsLabel}</Text>
                          <Text className="text-xs text-foreground">{e.instructions}</Text>
                        </View>
                      ) : null}
                      {e.exam_date && e.exam_date >= today && (
                        <Text className="text-xs font-semibold text-primary">{countdown({ ...e, exam_date: e.exam_date }, today, nowMin, t)}</Text>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View className="flex-row items-center gap-2">
                  <Inbox size={16} color="#9ca3af" />
                  <Text className="text-sm text-muted-foreground">{t.exams.noExamsOn(longDay(selected))}</Text>
                </View>
              )
            ) : (
              <Text className="text-sm text-muted-foreground">{t.exams.tapDayHint}</Text>
            )}
          </Panel>
        </View>
      )}

      {completed.length > 0 && (
        <Section title={t.exams.completedTitle}>
          <Panel className="overflow-hidden">
            {completed.map((e, i) => (
              <View key={e.id}>
                {i > 0 && <Divider />}
                <Row testID={`completed-${e.id}`}>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground" numberOfLines={1}>{e.exam_name}</Text>
                    <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                      {day(e.exam_date)}{e.subjects.length > 0 ? ` · ${subjectsLine(e.subjects)}` : ''}
                    </Text>
                  </View>
                  <ExamTypeChip type={e.exam_type} />
                </Row>
              </View>
            ))}
          </Panel>
        </Section>
      )}
    </View>
  )
}

export default function ExamsScreen() {
  const { student } = useSession()
  const t = useT()
  // Notifications open a tab directly: /exams?tab=upcoming|results. A later param wins over a tab picked by hand.
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>()
  const [picked, setPicked] = useState<{ tab: string; param?: string } | null>(null)
  const q = student && student.class_id > 0 ? `school_id=${student.school_id}&student_id=${student.id}&class_id=${student.class_id}` : null
  const nearbyApi = useApi<CalendarExam[]>(
    student ? `/api/exams/calendar?school_id=${student.school_id}&student_id=${student.id}&from=${isoFromToday(-60)}&to=${isoFromToday(60)}` : null
  )
  const sheetsApi = useApi<MarkSheet[]>(student && q ? `/api/students/${student.id}/exams?${q}` : null)

  const loading = nearbyApi.loading || sheetsApi.loading
  const error = nearbyApi.error || sheetsApi.error
  const refreshing = nearbyApi.refreshing || sheetsApi.refreshing
  const onRefresh = () => { nearbyApi.refresh(); sheetsApi.refresh() }

  if (student && student.class_id === 0) return <Screen><ClassLoading /></Screen>

  if (error) return <Screen><Alert>{error}</Alert></Screen>
  if (loading || !student) return <Screen><Loading /></Screen>

  const nearby = (nearbyApi.data ?? []).filter((e): e is DatedExam => e.exam_date !== null)
  const sheets = sheetsApi.data
  const pending = sheets?.filter(s => !s.parent_acknowledged).length ?? 0
  const hasUpcoming = nearby.some(e => e.exam_date >= todayISO())
  const activeTab = picked && picked.param === tabParam ? picked.tab : tabParam ?? (pending > 0 || !hasUpcoming ? 'results' : 'upcoming')
  const setTab = (tab: string) => setPicked({ tab, param: tabParam })

  return (
    <View testID="exams-screen" className="flex-1 bg-background">
      <View className="flex-row border-b border-border bg-card">
        <Pressable
          testID="exams-tab-upcoming"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'upcoming' }}
          onPress={() => setTab('upcoming')}
          className={`flex-1 items-center justify-center p-3 border-b-2 ${activeTab === 'upcoming' ? 'border-primary' : 'border-transparent'}`}
        >
          <Text className={`text-sm font-semibold ${activeTab === 'upcoming' ? 'text-foreground' : 'text-muted-foreground'}`}>
            {t.exams.tabUpcoming}
          </Text>
        </Pressable>
        <Pressable
          testID="exams-tab-results"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'results' }}
          onPress={() => setTab('results')}
          className={`flex-1 flex-row items-center justify-center p-3 border-b-2 gap-1 ${activeTab === 'results' ? 'border-primary' : 'border-transparent'}`}
        >
          <Text className={`text-sm font-semibold ${activeTab === 'results' ? 'text-foreground' : 'text-muted-foreground'}`}>
            {t.exams.tabResults}
          </Text>
          {pending > 0 && (
            <View className="rounded-full bg-amber-400 px-1.5 py-0.5">
              <Text className="text-[10px] font-bold text-amber-950">{pending}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {activeTab === 'upcoming' ? (
          <ExamCalendar schoolId={student.school_id} studentId={student.id} nearby={nearby} />
        ) : (
          sheets?.length === 0 ? (
            <Empty icon={GraduationCap} title={t.exams.noResultsYet} />
          ) : (
            sheets?.map(r => (
              <Link key={r.exam_id} href={{ pathname: '/exam/[id]', params: { id: String(r.exam_id) } }} asChild>
                <Pressable testID={`result-${r.exam_id}`} accessibilityRole="button" accessibilityLabel={r.exam_name}>
                  <Panel className="flex-row items-center gap-3 p-3.5">
                    <Ring pct={r.percentage} size={56} stroke={6}>
                      <Text className="text-xs font-bold text-foreground">
                        {r.percentage === null ? '—' : `${Math.round(r.percentage)}%`}
                      </Text>
                    </Ring>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{r.exam_name}</Text>
                      <Text className="text-[11px] text-muted-foreground">
                        {t.examType[r.exam_type] ?? r.exam_type} · {day(r.exam_date)}
                        {r.total_obtained !== null ? ` · ${r.total_obtained}/${r.total_max}` : ''}
                      </Text>
                      <View className="mt-1 flex-row flex-wrap gap-1.5">
                        {r.pass !== null && <Chip tone={r.pass ? 'green' : 'red'}>{r.pass ? t.examDetail.pass : t.examDetail.fail}</Chip>}
                        {r.grade && <Chip tone={r.pass === false ? 'red' : 'teal'}>{t.exams.gradeChip(r.grade)}</Chip>}
                        {r.parent_acknowledged ? <Chip tone="green">{t.acknowledged}</Chip> : <Chip tone="amber">{t.exams.signOffNeeded}</Chip>}
                      </View>
                    </View>
                    <ChevronRight size={16} color="#9ca3af" />
                  </Panel>
                </Pressable>
              </Link>
            ))
          )
        )}
      </Screen>
    </View>
  )
}