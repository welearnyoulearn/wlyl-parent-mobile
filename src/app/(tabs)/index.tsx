import { ClassLoading } from '@/components/class-loading'
import { useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { useIsFocused, useRouter } from 'expo-router'
import { AlertTriangle, CalendarDays, ChevronRight, PartyPopper, Phone } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { day, longDay, hhmm, inr, telHref, type SchoolCalendar, type SchoolContacts, type Fees, type Summary, type Timetable } from '@/lib/api'
import { localised, needsPopup } from '@/lib/notices'
import { NoticeModal, NoticeRow, useNotices } from '@/components/notices'
import { QuickLinks } from '@/components/quick-links'
import { Screen, Loading, Panel, Section, Row, Divider, Chip, Alert, Empty, Ring } from '@/components/ui'
import { useT } from '@/lib/i18n'

// Timetable stays "Coming soon" until /api/parent/timetable ships on the platform (#129).
const TIMETABLE_READY = false

// One Contact & Support row: who, their role, and a call button when there is a number.
function Contact({ id, name, role, phone }: { id: string; name: string; role: string; phone: string | null }) {
  const t = useT()
  return (
    <Row>
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>{name}</Text>
        <Text className="text-xs text-muted-foreground">{role}</Text>
      </View>
      {phone && (
        <Pressable onPress={() => void Linking.openURL(telHref(phone)).catch(() => null)} testID={`call-${id}`}
          accessibilityRole="button" accessibilityLabel={t.home.call(name)} hitSlop={6}
          className="size-10 items-center justify-center rounded-full bg-teal-50 active:bg-teal-100">
          <Phone size={17} color="#0f766e" />
        </Pressable>
      )}
    </Row>
  )
}

function nowHHMM() { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

export default function HomePage() {
  const { student, has, lang } = useSession()
  const router = useRouter()
  const focused = useIsFocused()
  const t = useT()

  const q = student && student.class_id > 0 ? `school_id=${student.school_id}&student_id=${student.id}&class_id=${student.class_id}` : null

  const { data: summary, error: er1, refreshing: r1, refresh: ref1 } = useApi<Summary>(q ? `/api/parent/child-summary?${q}` : null)
  const { data: feesData, error: er2, refreshing: r2, refresh: ref2 } = useApi<Fees>(student ? `/api/parent/fees?school_id=${student.school_id}&student_id=${student.id}` : null)
  const { data: today, error: ttError, status: ttStatus, refreshing: r3, refresh: ref3 } = useApi<Timetable>(q && TIMETABLE_READY && has('timetable') ? `/api/parent/timetable?${q}` : null)
  // 404/405: this platform has no timetable route — hide the card instead of erroring.
  const noTimetable = ttStatus === 404 || ttStatus === 405
  const er3 = noTimetable ? null : ttError
  const notices = useNotices(student ? `/api/announcements?school_id=${student.school_id}` : null)
  const { error: er4, refreshing: r4, refresh: ref4 } = notices
  const { data: eventsObj, error: er5, refreshing: r5, refresh: ref5 } = useApi<SchoolCalendar>(
    student ? `/api/school-calendar?school_id=${student.school_id}&year=${new Date().getFullYear()}` : null
  )
  // Same request as the Syllabus screen; contact details are optional, so failures just hide the card.
  const { data: contact, refreshing: r6, refresh: ref6 } = useApi<SchoolContacts>(student ? `/api/parent/subjects?student_id=${student.id}` : null)
  const [openId, setOpenId] = useState<number | null>(null)
  // Unseen urgent / action-needed / greeting notices open by themselves, one at a time
  // (opening marks it seen, so closing it brings up the next).
  const popupId = focused ? notices.items?.find(needsPopup)?.id : undefined
  if (popupId !== undefined && openId === null) setOpenId(popupId)

  const refreshing = r1 || r2 || r3 || r4 || r5 || r6
  const error = er1 || er2 || er3 || er4 || er5
  const onRefresh = () => { ref1(); ref2(); ref3(); ref4(); ref5(); ref6() }

  if (!student) {
    return (
      <Screen testID="home-screen">
        <Loading />
      </Screen>
    )
  }

  const fees = feesData?.summary ?? null
  const news = notices.items ?? []
  const openNotice = news.find(n => n.id === openId) ?? null

  const todayIso = new Date().toISOString().slice(0, 10)
  const events = (eventsObj?.events ?? [])
    .filter(e => (e.end_date ?? e.event_date) >= todayIso)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 3)

  const pending = summary?.released_results.filter(r => !r.parent_acknowledged) ?? []
  const latest = summary?.released_results[0]
  const now = nowHHMM()

  const attention: { key: string; text: string; onPress?: () => void }[] = []
  if (fees && fees.overdue_count > 0) {
    attention.push({ key: 'overdue', text: t.home.feesOverdue(fees.overdue_count, inr(fees.total_outstanding)), onPress: () => router.push('/fees') })
  }
  if (pending.length > 0) {
    attention.push({ key: 'ack', text: t.home.resultsWaiting(pending.length), onPress: () => router.push('/exams') })
  }
  news.filter(n => n.priority === 'urgent').forEach(n => {
    attention.push({ key: `news-${n.id}`, text: localised(n, lang).title, onPress: () => setOpenId(n.id) })
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
              onPress={a.onPress}
              accessibilityRole={a.onPress ? 'button' : 'none'}
              className="flex-row items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
            >
              <AlertTriangle size={16} color="#f59e0b" />
              <Text className="flex-1 text-sm text-amber-900">{a.text}</Text>
              {a.onPress && <ChevronRight size={16} color="#fbbf24" />}
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
                <Text className="text-xs text-muted-foreground">{t.home.attendance}</Text>
                <Text className="text-sm font-semibold text-foreground">{t.thisMonth}</Text>
              </View>
            </Panel>
          </Pressable>
        )}

        {has('fee-management') && (
          <Pressable className="flex-1" testID="tile-fees" onPress={() => router.push('/fees')}>
            <Panel className={`h-24 justify-center p-3.5 ${fees && fees.total_outstanding > 0 ? 'bg-amber-50' : ''}`}>
              <Text className="text-xs text-muted-foreground">{t.home.feesDue}</Text>
              <Text className="text-2xl font-bold tracking-tight text-foreground">{fees ? inr(fees.total_outstanding) : '—'}</Text>
              <Text className="text-[11px] text-muted-foreground">{fees === null ? ' ' : fees.total_outstanding > 0 ? t.home.tapToPay : t.allClear}</Text>
            </Panel>
          </Pressable>
        )}
      </View>

      <QuickLinks />

      {(contact?.class_teacher || contact?.school) && (
        <Section title={t.home.contactTitle}>
          <Panel className="overflow-hidden">
            {contact.class_teacher && <Contact id="class-teacher" name={contact.class_teacher.name} role={t.home.classTeacher} phone={contact.class_teacher.phone} />}
            {contact.class_teacher && contact.school && <Divider />}
            {contact.school && <Contact id="administration" name={contact.school.name} role={t.home.schoolAdmin} phone={contact.school.phone} />}
            {contact.school?.address && <Text className="px-4 pb-3 text-xs text-muted-foreground">{contact.school.address}</Text>}
          </Panel>
        </Section>
      )}

      {TIMETABLE_READY && has('timetable') && !noTimetable && (
        <Section title={t.home.todaysClasses}>
          {today === null ? <Loading /> : today.periods.length === 0 ? (
            <Empty icon={PartyPopper} title={t.home.noClassesTitle} hint={t.home.noClassesHint} />
          ) : (
            <Panel className="overflow-hidden">
              {today.periods.filter(p => !p.is_break).map((p, i, arr) => {
                const live = now >= p.time_from.slice(0, 5) && now < p.time_to.slice(0, 5)
                return (
                  <View key={p.period_number}>
                    <Row className={live ? 'bg-teal-50/60' : ''}>
                      <Text className="w-16 shrink-0 text-[11px] leading-tight text-muted-foreground">{hhmm(p.time_from)}</Text>
                      <Text className="flex-1 text-sm font-medium text-foreground">{p.subject_name ?? t.home.freePeriod}</Text>
                      {live ? <Chip tone="teal">{t.home.now}</Chip> : p.teacher_name ? <Text className="text-xs text-muted-foreground">{p.teacher_name.split(' ')[0]}</Text> : null}
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
        <Section title={t.home.examsTitle} action={{ label: t.seeAll, testID: 'see-all-exams', onPress: () => router.push('/exams') }}>
          {summary === null ? (student.class_id === 0 ? <ClassLoading /> : <Loading />) : (
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
                      <Text className="text-[11px] text-muted-foreground">{t.home.latestResult}</Text>
                      <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{latest.exam_name}</Text>
                      <Text className="text-[11px] text-muted-foreground">{latest.parent_acknowledged ? t.acknowledged : t.home.tapToViewMarkSheet}</Text>
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
                    <Text className="text-[11px] text-muted-foreground">{t.examType[e.exam_type] ?? e.exam_type} · {t.home.subjectsCount(e.total_subjects)}</Text>
                  </View>
                  <Chip tone="blue">{day(e.exam_date)}</Chip>
                </Panel>
              ))}
              {!latest && summary.upcoming_exams.length === 0 && <Empty icon={CalendarDays} title={t.home.noExamsYet} />}
            </View>
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
        <Section title={t.home.comingUp}>
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

      {openNotice && <NoticeModal notice={openNotice} onClose={() => setOpenId(null)} />}
    </Screen>
  )
}
