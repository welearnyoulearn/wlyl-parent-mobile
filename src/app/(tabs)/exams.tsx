import { ClassLoading } from '@/components/class-loading'
import { useMemo, useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import { Link } from 'expo-router'
import { CalendarDays, ChevronRight, GraduationCap, Inbox } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { day, longDay, type CalendarExam, type Summary, type MarkSheet } from '@/lib/api'
import { useApi } from '@/lib/use-api'
import { Screen, Loading, Panel, Empty, Chip, Alert, Ring } from '@/components/ui'
import { MonthCalendar, monthRange, shiftMonth, todayISO } from '@/components/month-calendar'
import { useT, type Strings } from '@/lib/i18n'

function daysUntil(d: string, t: Strings) {
  const n = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  return n <= 0 ? t.today : n === 1 ? t.tomorrow : t.exams.inDays(n)
}

const EXAM_DOT: Record<string, string> = { unit_test: 'bg-sky-500', mid_term: 'bg-amber-500', final_exam: 'bg-violet-500', practical: 'bg-emerald-500' }

function ExamCalendar({ schoolId, studentId }: { schoolId: number; studentId: number }) {
  const [month, setMonth] = useState(() => todayISO().slice(0, 7))
  const [selected, setSelected] = useState<string | null>(null)
  const t = useT()
  const { from, to } = monthRange(month)
  const { data, error, loading } = useApi<CalendarExam[]>(
    `/api/exams/calendar?school_id=${schoolId}&student_id=${studentId}&from=${from}&to=${to}`
  )

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarExam[]>()
    for (const e of data ?? []) {
      if (!e.exam_date) continue
      if (!map.has(e.exam_date)) map.set(e.exam_date, [])
      map.get(e.exam_date)!.push(e)
    }
    return map
  }, [data])

  const selectedExams = selected ? byDate.get(selected) ?? [] : []

  function go(delta: number) {
    setMonth(m => shiftMonth(m, delta))
    setSelected(null)
  }

  if (loading) return <Loading label={t.exams.loadingCalendar} />
  if (error) return <Alert>{error}</Alert>

  return (
    <View className="gap-3" testID="exam-calendar">
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
              {exams.slice(0, 3).map(e => <View key={e.id} className={`h-1.5 w-1.5 rounded-full ${EXAM_DOT[e.exam_type] ?? 'bg-gray-400'}`} />)}
            </View>
          )
        }}
        accessibilityLabelFor={d => {
          const exams = byDate.get(d) ?? []
          return exams.length ? `${longDay(d)}: ${exams.map(e => e.exam_name).join(', ')}` : longDay(d)
        }}
      />

      <Panel className="p-4" testID="exam-calendar-detail">
        {selected ? (
          selectedExams.length > 0 ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">{longDay(selected)}</Text>
              {selectedExams.map(e => (
                <View key={e.id} className="gap-1">
                  <Text className="text-sm font-medium text-foreground">{e.exam_name}</Text>
                  <View className="flex-row flex-wrap items-center gap-1.5">
                    <Chip tone="teal">{t.examType[e.exam_type] ?? e.exam_type}</Chip>
                    {e.subjects.map(s => <Chip key={s}>{s}</Chip>)}
                  </View>
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
  )
}

export default function ExamsScreen() {
  const { student } = useSession()
  const t = useT()
  const q = student && student.class_id > 0 ? `school_id=${student.school_id}&student_id=${student.id}&class_id=${student.class_id}` : null
  const summaryApi = useApi<Summary>(q ? `/api/parent/child-summary?${q}` : null)
  const sheetsApi = useApi<MarkSheet[]>(student && q ? `/api/students/${student.id}/exams?${q}` : null)
  const [tab, setTab] = useState<string | null>(null)

  const loading = summaryApi.loading || sheetsApi.loading
  const error = summaryApi.error || sheetsApi.error
  const refreshing = summaryApi.refreshing || sheetsApi.refreshing
  const onRefresh = () => { summaryApi.refresh(); sheetsApi.refresh() }

  if (student && student.class_id === 0) return <Screen><ClassLoading /></Screen>

  if (error) return <Screen><Alert>{error}</Alert></Screen>
  if (loading || !student) return <Screen><Loading /></Screen>

  const summary = summaryApi.data
  const sheets = sheetsApi.data
  const pending = sheets?.filter(s => !s.parent_acknowledged).length ?? 0
  const activeTab = tab ?? (pending > 0 || (summary && summary.upcoming_exams.length === 0) ? 'results' : 'upcoming')

  return (
    <View testID="exams-screen" className="flex-1 bg-background">
      <View className="flex-row border-b border-border bg-card">
        <Pressable
          testID="exams-tab-upcoming"
          accessibilityRole="tab"
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
        {activeTab === 'upcoming' && <ExamCalendar schoolId={student.school_id} studentId={student.id} />}

        {activeTab === 'upcoming' ? (
          summary?.upcoming_exams.length === 0 ? (
            <Empty icon={CalendarDays} title={t.exams.noneScheduledTitle} hint={t.exams.noneScheduledHint} />
          ) : (
            summary?.upcoming_exams.map(e => (
              <Panel key={e.id} className="p-4" testID={`upcoming-${e.id}`}>
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-violet-50">
                    <Text className="text-[10px] font-medium uppercase leading-none text-violet-700">
                      {new Date(e.exam_date).toLocaleString('en-IN', { month: 'short' })}
                    </Text>
                    <Text className="text-lg font-bold leading-none text-violet-700">
                      {new Date(e.exam_date).getDate()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">{e.exam_name}</Text>
                    <Text className="text-[11px] text-muted-foreground">{t.examType[e.exam_type] ?? e.exam_type} · {t.exams.startsWord} {longDay(e.exam_date)}</Text>
                  </View>
                  <Chip tone="blue">{daysUntil(e.exam_date, t)}</Chip>
                </View>
                <View className="mt-3 flex-row flex-wrap gap-1.5">
                  {e.subjects.map(s => <Chip key={s}>{s}</Chip>)}
                </View>
              </Panel>
            ))
          )
        ) : (
          sheets?.length === 0 ? (
            <Empty icon={GraduationCap} title={t.exams.noResultsYet} />
          ) : (
            sheets?.map(r => (
              <Link key={r.exam_id} href={{ pathname: '/exam/[id]', params: { id: String(r.exam_id) } }} asChild>
                <Pressable testID={`result-${r.exam_id}`}>
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