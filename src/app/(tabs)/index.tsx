import { Fragment, useState, type ReactNode } from 'react'
import { ClassLoading } from '@/components/class-loading'
import { Linking, Pressable, View } from 'react-native'
import { useIsFocused, useRouter } from 'expo-router'
import { ChevronRight, GraduationCap, Phone } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { day, inr, longDay, telHref, type DailyReport, type SchoolCalendar, type SchoolContacts, type Fees, type Summary } from '@/lib/api'
import { localised, needsPopup } from '@/lib/notices'
import { NoticeModal, NoticeRow, useNotices } from '@/components/notices'
import { QuickLinks } from '@/components/quick-links'
import { Screen, Panel, Section, Divider, Alert, Empty, Ring, Skeleton, ScreenSkeleton, FadeInView, DateBadge, Text, useColors } from '@/components/ui'
import { useT, type Strings } from '@/lib/i18n'

// Home answers one question: what does this child need from me today?
// Three numbers at a glance, the things to act on, then what's coming. Each fact appears once.

function daysUntil(d: string, t: Strings) {
  const n = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  return n <= 0 ? t.today : n === 1 ? t.tomorrow : t.exams.inDays(n)
}

// One tile of the glance row, tinted in its area's colour: a figure and what it is. Tap to open the detail.
function Glance({ label, value, hint, tone = 'text-foreground', bg, onPress, testID, children }: {
  label: string; value: string; hint?: string; tone?: string; bg: string; onPress: () => void; testID: string; children?: ReactNode
}) {
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button" accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}
      className={`flex-1 gap-1 rounded-2xl px-3 py-3.5 active:opacity-75 ${bg}`}>
      <Text className="text-xs font-medium text-foreground/70" numberOfLines={1}>{label}</Text>
      <View className="flex-row items-center gap-1.5">
        {children}
        <Text className={`shrink text-xl font-bold tracking-tight ${tone}`} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      </View>
      {hint ? <Text className="text-xs text-foreground/60" numberOfLines={1}>{hint}</Text> : null}
    </Pressable>
  )
}

const DOT = { red: 'bg-danger-graphic', amber: 'bg-warning-graphic', violet: 'bg-accent', teal: 'bg-primary' } as const
type Task = { key: string; dot: keyof typeof DOT; title: string; hint: string; onPress: () => void }

export default function HomePage() {
  const { student, has, lang } = useSession()
  const router = useRouter()
  const focused = useIsFocused()
  const t = useT()
  const c = useColors()

  const q = student && student.class_id > 0 ? `school_id=${student.school_id}&student_id=${student.id}&class_id=${student.class_id}` : null

  const { data: summary, error: er1, refreshing: r1, refresh: ref1 } = useApi<Summary>(q ? `/api/parent/child-summary?${q}` : null)
  const { data: feesData, error: er2, refreshing: r2, refresh: ref2 } = useApi<Fees>(student ? `/api/parent/fees?school_id=${student.school_id}&student_id=${student.id}` : null)
  const notices = useNotices(student ? `/api/announcements?school_id=${student.school_id}` : null)
  const { error: er4, refreshing: r4, refresh: ref4 } = notices
  const { data: eventsObj, error: er5, refreshing: r5, refresh: ref5 } = useApi<SchoolCalendar>(
    student ? `/api/school-calendar?school_id=${student.school_id}&year=${new Date().getFullYear()}` : null
  )
  // Same request as the Syllabus screen; contact details are optional, so failures just hide them.
  const { data: contact, refreshing: r6, refresh: ref6 } = useApi<SchoolContacts>(student ? `/api/parent/subjects?student_id=${student.id}` : null)
  // The child's day (#430): quiz done or not and open doubts, as on the web's parent home. Parents
  // only follow the quiz; the child takes it in the student portal.
  const { data: report } = useApi<DailyReport>(student && has('daily-quiz') ? `/api/parent/daily-report?student_id=${student.id}` : null)
  const [openId, setOpenId] = useState<number | null>(null)
  // Unseen urgent / action-needed / greeting notices open by themselves, one at a time
  // (opening marks it seen, so closing it brings up the next).
  const popupId = focused ? notices.items?.find(needsPopup)?.id : undefined
  if (popupId !== undefined && openId === null) setOpenId(popupId)

  const refreshing = r1 || r2 || r4 || r5 || r6
  const error = er1 || er2 || er4 || er5
  const onRefresh = () => { ref1(); ref2(); ref4(); ref5(); ref6() }

  if (!student) return <Screen testID="home-screen"><ScreenSkeleton /></Screen>

  const fees = feesData?.summary ?? null
  const news = notices.items ?? []
  const openNotice = news.find(n => n.id === openId) ?? null
  const todayIso = new Date().toISOString().slice(0, 10)
  const events = (eventsObj?.events ?? [])
    .filter(e => (e.end_date ?? e.event_date) >= todayIso)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 4)
  const pending = summary?.released_results.filter(r => !r.parent_acknowledged) ?? []
  const latest = summary?.released_results[0]
  const upcoming = summary?.upcoming_exams ?? []
  const nextExam = upcoming[0]
  const attendancePct = summary?.attendance_pct ?? null

  // The things only the parent can do, most urgent first.
  const tasks: Task[] = []
  const quizStatus = report?.quiz && report.quiz.status !== 'no_quiz' ? report.quiz.status : null
  const openDoubts = report?.doubts ? report.doubts.waiting + report.doubts.answered : 0
  const dayParts = [quizStatus && `${t.dailyReport.quiz}: ${t.quiz.status[quizStatus]}`, openDoubts > 0 && t.dailyReport.homeDoubts(openDoubts)].filter(Boolean)
  if (dayParts.length) tasks.push({
    key: 'day', dot: quizStatus === 'missed' ? 'red' : quizStatus === 'in_progress' || quizStatus === 'not_started' || openDoubts > 0 ? 'amber' : 'teal',
    title: dayParts.join(' · '), hint: t.dailyReport.open, onPress: () => router.push('/daily-report'),
  })
  if (fees && fees.overdue_count > 0) tasks.push({ key: 'overdue', dot: 'red', title: t.home.feesOverdue(fees.overdue_count, inr(fees.total_outstanding)), hint: t.home.tapToPay, onPress: () => router.push('/fees') })
  if (pending.length > 0) tasks.push({ key: 'ack', dot: 'amber', title: t.home.resultsWaiting(pending.length), hint: t.exams.signOffNeeded, onPress: () => router.push('/exams') })
  news.filter(n => n.priority === 'urgent').forEach(n => tasks.push({ key: `news-${n.id}`, dot: 'red', title: localised(n, lang).title, hint: t.urgent, onPress: () => setOpenId(n.id) }))

  const glance = [has('attendance'), has('fee-management'), has('exam-marks')].filter(Boolean).length

  return (
    <Screen testID="home-screen" refreshing={refreshing} onRefresh={onRefresh}>
      {error && <Alert action={{ label: t.tryAgain, onPress: onRefresh, testID: 'home-retry' }}>{error}</Alert>}

      {/* Keyed by child, so switching child fades the whole page over instead of jumping. */}
      <FadeInView key={student.id} className="gap-6">
        {glance > 0 && (
          <View className="flex-row gap-2" testID="home-glance">
            {has('attendance') && (
              <Glance label={t.home.attendance} testID="tile-attendance" bg="bg-primary-soft" tone="text-primary" onPress={() => router.push('/attendance')}
                value={attendancePct === null ? '—' : `${Math.round(attendancePct)}%`} hint={t.home.attendanceSub}>
                {summary ? <Ring pct={attendancePct} size={18} stroke={3} /> : <Skeleton className="size-[18px] rounded-full" />}
              </Glance>
            )}
            {has('fee-management') && (
              <Glance label={t.home.feesDue} testID="tile-fees" onPress={() => router.push('/fees')}
                value={fees ? inr(fees.total_outstanding) : '—'} tone={fees && fees.overdue_count > 0 ? 'text-danger' : 'text-success'}
                bg={fees && fees.overdue_count > 0 ? 'bg-danger-soft' : 'bg-success-soft'}
                hint={fees && fees.total_outstanding === 0 ? t.home.feesClear : t.home.tapToPay} />
            )}
            {has('exam-marks') && (
              <Glance label={t.home.nextExam} testID="tile-next-exam" bg="bg-accent-soft" tone="text-accent" onPress={() => router.push('/exams')}
                value={nextExam ? daysUntil(nextExam.exam_date, t) : '—'} hint={nextExam ? nextExam.exam_name : t.home.noUpcoming} />
            )}
          </View>
        )}

        {tasks.length > 0 && (
          <Section title={t.home.needsAttention}>
            <Panel className="overflow-hidden">
              {tasks.map((a, i) => (
                <Fragment key={a.key}>
                  {i > 0 && <Divider />}
                  <Pressable testID={`attention-${a.key}`} onPress={a.onPress} accessibilityRole="button" accessibilityLabel={`${a.title}. ${a.hint}`}
                    className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-muted">
                    <View className={`size-2 rounded-full ${DOT[a.dot]}`} />
                    <View className="flex-1 gap-0.5">
                      <Text className="text-[15px] leading-5 text-foreground">{a.title}</Text>
                      <Text className="text-[13px] text-muted-foreground">{a.hint}</Text>
                    </View>
                    <ChevronRight size={18} color={c.subtle} />
                  </Pressable>
                </Fragment>
              ))}
            </Panel>
          </Section>
        )}

        <QuickLinks />

        {has('exam-marks') && (
          <Section title={t.home.examsTitle} action={{ label: t.seeAll, testID: 'see-all-exams', onPress: () => router.push('/exams') }}>
            {summary === null ? (student.class_id === 0 ? <ClassLoading /> : <Skeleton className="h-28 w-full rounded-2xl" />) : (
              latest || upcoming.length ? (
                <Panel className="overflow-hidden">
                  {latest && (
                    <Pressable testID="latest-result" accessibilityRole="button" onPress={() => router.push({ pathname: '/exam/[id]', params: { id: String(latest.id) } })}
                      className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-muted">
                      {(() => {
                        const p = latest.total_obtained !== null && latest.total_max ? Math.round((latest.total_obtained / latest.total_max) * 100) : null
                        return <Ring pct={p} size={40} stroke={4}><Text className="text-[11px] font-bold text-foreground">{p === null ? '—' : `${p}%`}</Text></Ring>
                      })()}
                      <View className="flex-1 gap-0.5">
                        <Text className="text-[15px] text-foreground" numberOfLines={1}>{latest.exam_name}</Text>
                        <Text className={`text-[13px] ${latest.parent_acknowledged ? 'text-muted-foreground' : 'font-medium text-warning'}`}>
                          {t.home.latestResult} · {latest.parent_acknowledged ? t.acknowledged : t.exams.signOffNeeded}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={c.subtle} />
                    </Pressable>
                  )}
                  {upcoming.slice(0, 3).map((e, i) => (
                    <Fragment key={e.id}>
                      {(latest || i > 0) && <Divider />}
                      <View className="min-h-14 flex-row items-center gap-3 px-4 py-2.5">
                        <DateBadge date={e.exam_date} />
                        <View className="flex-1 gap-0.5">
                          <Text className="text-[15px] text-foreground" numberOfLines={1}>{e.exam_name}</Text>
                          <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>{t.examType[e.exam_type] ?? e.exam_type} · {t.home.subjectsCount(e.total_subjects)}</Text>
                        </View>
                        <Text className="text-[13px] font-medium text-accent">{daysUntil(e.exam_date, t)}</Text>
                      </View>
                    </Fragment>
                  ))}
                </Panel>
              ) : <Empty icon={GraduationCap} title={t.home.noExamsYet} />
            )}
          </Section>
        )}

        {news.length > 0 && (
          <Section title={t.notices.title} action={{ label: t.notices.viewAll(news.length), testID: 'notice-viewall', onPress: () => router.push('/notices') }}>
            <Panel className="overflow-hidden">
              {news.slice(0, 4).map((n, i, arr) => (
                <View key={n.id}>
                  <NoticeRow notice={n} onPress={() => setOpenId(n.id)} />
                  {i < arr.length - 1 && <Divider />}
                </View>
              ))}
            </Panel>
          </Section>
        )}

        {events.length > 0 && (
          <Section title={t.home.comingUp} action={has('calendar') ? { label: t.screenTitles.calendar, testID: 'see-calendar', onPress: () => router.push('/calendar') } : undefined}>
            <Panel className="overflow-hidden">
              {events.map((e, i) => (
                <Fragment key={e.id}>
                  {i > 0 && <Divider />}
                  <View className="min-h-14 flex-row items-center gap-3 px-4 py-2.5">
                    <DateBadge date={e.event_date} />
                    <View className="flex-1 gap-0.5">
                      <Text className="text-[15px] text-foreground" numberOfLines={2}>{e.title}</Text>
                      <Text className="text-[13px] text-muted-foreground">{longDay(e.event_date)}{e.end_date ? ` – ${day(e.end_date)}` : ''}</Text>
                    </View>
                    {e.event_type === 'holiday' && <Text className="text-[13px] font-medium text-success">{t.attendance.holiday}</Text>}
                  </View>
                </Fragment>
              ))}
            </Panel>
          </Section>
        )}

        {(contact?.class_teacher || contact?.school) && (
          <Section title={t.home.contactTitle}>
            <Panel className="overflow-hidden">
              {contact.class_teacher && (
                <Contact id="class-teacher" name={contact.class_teacher.name} role={t.home.classTeacher} phone={contact.class_teacher.phone} />
              )}
              {contact.class_teacher && contact.school && <Divider />}
              {contact.school && (
                <Contact id="administration" name={contact.school.name} role={t.home.schoolAdmin} phone={contact.school.phone} address={contact.school.address} />
              )}
            </Panel>
          </Section>
        )}
      </FadeInView>

      {openNotice && <NoticeModal notice={openNotice} onClose={() => setOpenId(null)} />}
    </Screen>
  )
}

// One Contact & Support row: who, their role, the address when there is one, and a call button.
function Contact({ id, name, role, phone, address }: { id: string; name: string; role: string; phone: string | null; address?: string | null }) {
  const t = useT()
  const c = useColors()
  return (
    <View className="min-h-14 flex-row items-center gap-3 px-4 py-3">
      <View className="flex-1 gap-0.5">
        <Text className="text-[15px] text-foreground" numberOfLines={1}>{name}</Text>
        <Text className="text-[13px] text-muted-foreground">{role}</Text>
        {address ? <Text className="text-[13px] leading-4 text-muted-foreground">{address}</Text> : null}
      </View>
      {phone && (
        <Pressable onPress={() => void Linking.openURL(telHref(phone)).catch(() => null)} testID={`call-${id}`}
          accessibilityRole="button" accessibilityLabel={t.home.call(name)} hitSlop={8}
          className="size-11 items-center justify-center rounded-full bg-primary-soft active:opacity-60">
          <Phone size={19} color={c.primary} />
        </Pressable>
      )}
    </View>
  )
}
