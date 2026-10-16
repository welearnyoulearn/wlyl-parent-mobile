import { Pressable, Text, View } from 'react-native'
import { Href, useRouter } from 'expo-router'
import { AlertTriangle, CalendarDays, ChevronRight, Megaphone, PartyPopper } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { day, longDay, hhmm, inr, num, EXAM_TYPE, type Announcement, type SchoolCalendar, type Fees, type Summary, type Timetable } from '@/lib/api'
import { QuickLinks } from '@/components/quick-links'
import { Screen, Loading, Panel, Section, Row, Divider, Chip, Alert, Empty, Ring } from '@/components/ui'

function nowHHMM() { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

export default function HomePage() {
  const { student, year, has } = useSession()
  const router = useRouter()

  const q = student ? `school_id=${student.school_id}&student_id=${student.id}&class_id=${student.class_id}` : null

  const { data: summary, error: er1, refreshing: r1, refresh: ref1 } = useApi<Summary>(q ? `/api/parent/child-summary?${q}` : null)
  const { data: feesData, error: er2, refreshing: r2, refresh: ref2 } = useApi<Fees>(q ? `/api/parent/fees?${q}${year ? `&academic_year=${year}` : ''}` : null)
  const { data: today, error: ttError, status: ttStatus, refreshing: r3, refresh: ref3 } = useApi<Timetable>(q && has('timetable') ? `/api/parent/timetable?${q}` : null)
  // 404/405: this platform has no timetable route — hide the card instead of erroring.
  const noTimetable = ttStatus === 404 || ttStatus === 405
  const er3 = noTimetable ? null : ttError
  const { data: newsObj, error: er4, refreshing: r4, refresh: ref4 } = useApi<Announcement[] | { data: Announcement[] }>(
    student ? `/api/announcements?school_id=${student.school_id}&audience=parents` : null
  )
  const { data: eventsObj, error: er5, refreshing: r5, refresh: ref5 } = useApi<SchoolCalendar>(
    student ? `/api/school-calendar?school_id=${student.school_id}&year=${new Date().getFullYear()}` : null
  )

  const refreshing = r1 || r2 || r3 || r4 || r5
  const error = er1 || er2 || er3 || er4 || er5
  const onRefresh = () => { ref1(); ref2(); ref3(); ref4(); ref5() }

  if (!student) {
    return (
      <Screen testID="home-screen">
        <Loading />
      </Screen>
    )
  }

  const fees = feesData?.summary ?? null
  const newsRaw = Array.isArray(newsObj) ? newsObj : (newsObj?.data ?? [])
  const news = newsRaw.slice(0, 3)

  const todayIso = new Date().toISOString().slice(0, 10)
  const events = (eventsObj?.events ?? [])
    .filter(e => (e.end_date ?? e.event_date) >= todayIso)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 3)

  const pending = summary?.released_results.filter(r => !r.parent_acknowledged) ?? []
  const latest = summary?.released_results[0]
  const now = nowHHMM()

  const attention: { key: string; text: string; href?: string }[] = []
  if (fees && fees.overdue_count > 0) {
    attention.push({ key: 'overdue', text: `${fees.overdue_count} fee${fees.overdue_count > 1 ? 's' : ''} overdue · ${inr(fees.total_outstanding)} outstanding`, href: '/fees' })
  }
  if (pending.length > 0) {
    attention.push({ key: 'ack', text: `${pending.length} result${pending.length > 1 ? 's' : ''} waiting for your acknowledgement`, href: '/exams' })
  }
  news.filter(n => n.priority === 'urgent').forEach(n => {
    attention.push({ key: `news-${n.id}`, text: n.title })
  })

  return (
    <Screen testID="home-screen" refreshing={refreshing} onRefresh={onRefresh}>
      {error && <Alert>{error}</Alert>}

      {attention.length > 0 && (
        <View className="gap-2">
          {attention.map(a => (
            <Pressable
              key={a.key}
              testID={`attention-${a.key}`}
              onPress={() => { if (a.href) router.push(a.href as Href) }}
              accessibilityRole={a.href ? 'button' : 'none'}
              className="flex-row items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
            >
              <AlertTriangle size={16} color="#f59e0b" />
              <Text className="flex-1 text-sm text-amber-900">{a.text}</Text>
              {a.href && <ChevronRight size={16} color="#fbbf24" />}
            </Pressable>
          ))}
        </View>
      )}

      <View className="flex-row gap-3">
        {has('attendance') && (
          <Pressable className="flex-1" testID="tile-attendance" onPress={() => router.push('/attendance')}>
            <Panel className="flex-row h-24 items-center gap-3 p-3.5">
              <Ring pct={summary ? summary.attendance_pct : null} size={58} stroke={6}>
                {summary ? <Text className="text-xs font-bold">{summary.attendance_pct === null ? '—' : `${Math.round(summary.attendance_pct)}%`}</Text> : null}
                {!summary && <Text className="text-xs font-bold">…</Text>}
              </Ring>
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground">Attendance</Text>
                <Text className="text-sm font-semibold text-foreground">This month</Text>
              </View>
            </Panel>
          </Pressable>
        )}

        {has('fee-management') && (
          <Pressable className="flex-1" testID="tile-fees" onPress={() => router.push('/fees')}>
            <Panel className={`h-24 justify-center p-3.5 ${fees && fees.total_outstanding > 0 ? 'bg-amber-50' : ''}`}>
              <Text className="text-xs text-muted-foreground">Fees due</Text>
              <Text className="text-2xl font-bold tracking-tight text-foreground">{fees ? inr(fees.total_outstanding) : '—'}</Text>
              <Text className="text-[11px] text-muted-foreground">{fees === null ? ' ' : fees.total_outstanding > 0 ? 'Tap to pay' : 'All clear'}</Text>
            </Panel>
          </Pressable>
        )}
      </View>

      <QuickLinks />

      {has('timetable') && !noTimetable && (
        <Section title="Today's classes">
          {today === null ? <Loading /> : today.periods.length === 0 ? (
            <Empty icon={PartyPopper} title="No classes today" hint="Enjoy the day off." />
          ) : (
            <Panel className="overflow-hidden">
              {today.periods.filter(p => !p.is_break).map((p, i, arr) => {
                const live = now >= p.time_from.slice(0, 5) && now < p.time_to.slice(0, 5)
                return (
                  <View key={p.period_number}>
                    <Row className={live ? 'bg-teal-50/60' : ''}>
                      <Text className="w-16 shrink-0 text-[11px] leading-tight text-muted-foreground">{hhmm(p.time_from)}</Text>
                      <Text className="flex-1 text-sm font-medium text-foreground">{p.subject_name ?? 'Free period'}</Text>
                      {live ? <Chip tone="teal">Now</Chip> : p.teacher_name ? <Text className="text-xs text-muted-foreground">{p.teacher_name.split(' ')[0]}</Text> : null}
                    </Row>
                    {i < arr.length - 1 && <Divider />}
                  </View>
                )
              })}
            </Panel>
          )}
        </Section>
      )}

      {has('exam-marks') && (
        <Section title="Exams" action={{ label: 'See all', testID: 'see-all-exams', onPress: () => router.push('/exams') }}>
          {summary === null ? <Loading /> : (
            <View className="gap-2">
              {latest && (
                <Pressable testID="latest-result" onPress={() => router.push({ pathname: '/exam/[id]', params: { id: String(latest.id) } })}>
                  <Panel className="flex-row items-center gap-3 p-3.5">
                    {(() => {
                      const p = latest.total_obtained !== null && latest.total_max ? Math.round((latest.total_obtained / latest.total_max) * 100) : null
                      return (
                        <Ring pct={p} size={54} stroke={6}>
                          <Text className="text-xs font-bold text-foreground">{p === null ? '—' : `${p}%`}</Text>
                        </Ring>
                      )
                    })()}
                    <View className="flex-1">
                      <Text className="text-[11px] text-muted-foreground">Latest result</Text>
                      <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{latest.exam_name}</Text>
                      <Text className="text-[11px] text-muted-foreground">{latest.parent_acknowledged ? 'Acknowledged' : 'Tap to view mark sheet'}</Text>
                    </View>
                    <ChevronRight size={16} color="#9ca3af" />
                  </Panel>
                </Pressable>
              )}

              {summary.upcoming_exams.slice(0, 2).map((e) => (
                <Panel key={e.id} className="flex-row items-center gap-3 p-3.5">
                  <View className="size-11 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                    <Text className="text-[10px] font-medium uppercase text-violet-700">{new Date(e.exam_date).toLocaleString('en-IN', { month: 'short' })}</Text>
                    <Text className="text-base font-bold text-violet-700">{new Date(e.exam_date).getDate()}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{e.exam_name}</Text>
                    <Text className="text-[11px] text-muted-foreground">{EXAM_TYPE[e.exam_type] ?? e.exam_type} · {e.total_subjects} subjects</Text>
                  </View>
                  <Chip tone="blue">{day(e.exam_date)}</Chip>
                </Panel>
              ))}
              {!latest && summary.upcoming_exams.length === 0 && <Empty icon={CalendarDays} title="No exams yet" />}
            </View>
          )}
        </Section>
      )}

      {news.length > 0 && (
        <Section title="From the school">
          <View className="gap-2">
            {news.map(n => (
              <Panel key={n.id} className="p-3.5">
                <View className="flex-row items-start gap-3">
                  <View className="size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                    <Megaphone size={16} color="#0f766e" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{n.title}</Text>
                      {n.priority === 'urgent' ? <Chip tone="red">Urgent</Chip> : n.priority === 'high' ? <Chip tone="amber">Important</Chip> : null}
                    </View>
                    <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={3}>{n.content}</Text>
                    <Text className="mt-1 text-[11px] text-muted-foreground/80">{n.created_by_name ? `${n.created_by_name} · ` : ''}{day(n.created_at)}</Text>
                  </View>
                </View>
              </Panel>
            ))}
          </View>
        </Section>
      )}

      {events.length > 0 && (
        <Section title="Coming up">
          <Panel className="overflow-hidden">
            {events.map((e, i, arr) => (
              <View key={e.id}>
                <Row>
                  <View className={`size-2 shrink-0 rounded-full ${e.event_type === 'holiday' ? 'bg-emerald-500' : e.event_type === 'exam' ? 'bg-rose-500' : 'bg-sky-500'}`} />
                  <Text className="flex-1 text-sm text-foreground">{e.title}</Text>
                  <Text className="text-xs text-muted-foreground">{longDay(e.event_date)}{e.end_date ? ` – ${day(e.end_date)}` : ''}</Text>
                </Row>
                {i < arr.length - 1 && <Divider />}
              </View>
            ))}
          </Panel>
        </Section>
      )}

      {num(fees?.total_due) > 0 && year ? (
        <Text className="pt-2 text-center text-[11px] text-muted-foreground">Academic year {year}</Text>
      ) : null}

    </Screen>
  )
}
