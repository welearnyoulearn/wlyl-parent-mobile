import { ClassLoading } from '@/components/class-loading'
import { useState, type ReactNode } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { useIsFocused, useRouter } from 'expo-router'
import { AlertTriangle, CalendarCheck, CalendarDays, ChevronRight, GraduationCap, Headset, Megaphone, Phone, School, Wallet } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { day, longDay, inr, telHref, type SchoolCalendar, type SchoolContacts, type Fees, type Summary } from '@/lib/api'
import { localised, needsPopup } from '@/lib/notices'
import { NoticeModal, NoticeRow, useNotices } from '@/components/notices'
import { QuickLinks } from '@/components/quick-links'
import { Screen, Loading, Panel, Section, Row, Divider, Chip, Alert, Empty, Ring, Avatar, IconBadge, DateBadge, CARD_SHADOW } from '@/components/ui'
import { useT } from '@/lib/i18n'

// One Contact & Support row: avatar, who, their role, and a call button when there is a number.
function Contact({ id, name, role, phone, lead }: { id: string; name: string; role: string; phone: string | null; lead: ReactNode }) {
  const t = useT()
  return (
    <Row className="py-3.5">
      {lead}
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>{name}</Text>
        <Text className="text-xs text-muted-foreground">{role}</Text>
      </View>
      {phone && (
        <Pressable onPress={() => void Linking.openURL(telHref(phone)).catch(() => null)} testID={`call-${id}`}
          accessibilityRole="button" accessibilityLabel={t.home.call(name)} hitSlop={6}
          className="size-11 items-center justify-center rounded-full bg-emerald-600 active:bg-emerald-700">
          <Phone size={18} color="#fff" />
        </Pressable>
      )}
    </Row>
  )
}

export default function HomePage() {
  const { student, has, lang } = useSession()
  const router = useRouter()
  const focused = useIsFocused()
  const t = useT()

  const q = student && student.class_id > 0 ? `school_id=${student.school_id}&student_id=${student.id}&class_id=${student.class_id}` : null

  const { data: summary, error: er1, refreshing: r1, refresh: ref1 } = useApi<Summary>(q ? `/api/parent/child-summary?${q}` : null)
  const { data: feesData, error: er2, refreshing: r2, refresh: ref2 } = useApi<Fees>(student ? `/api/parent/fees?school_id=${student.school_id}&student_id=${student.id}` : null)
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

  const refreshing = r1 || r2 || r4 || r5 || r6
  const error = er1 || er2 || er4 || er5
  const onRefresh = () => { ref1(); ref2(); ref4(); ref5(); ref6() }

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

  const attention: { key: string; text: string; hint: string; onPress?: () => void }[] = []
  if (fees && fees.overdue_count > 0) {
    attention.push({ key: 'overdue', text: t.home.feesOverdue(fees.overdue_count, inr(fees.total_outstanding)), hint: t.home.tapToPay, onPress: () => router.push('/fees') })
  }
  if (pending.length > 0) {
    attention.push({ key: 'ack', text: t.home.resultsWaiting(pending.length), hint: t.home.tapToViewMarkSheet, onPress: () => router.push('/exams') })
  }
  news.filter(n => n.priority === 'urgent').forEach(n => {
    attention.push({ key: `news-${n.id}`, text: localised(n, lang).title, hint: t.notices.title, onPress: () => setOpenId(n.id) })
  })
  const due = fees ? fees.total_outstanding > 0 : null
  const feeTone = due === null ? 'border-border bg-card' : !due ? 'border-emerald-100 bg-emerald-50' : fees!.overdue_count > 0 ? 'border-rose-100 bg-rose-50' : 'border-amber-100 bg-amber-50'
  const feeFg = due === null ? ['text-foreground', 'text-muted-foreground', '#6b7280'] : !due ? ['text-emerald-900', 'text-emerald-700', '#047857']
    : fees!.overdue_count > 0 ? ['text-rose-900', 'text-rose-700', '#be123c'] : ['text-amber-900', 'text-amber-700', '#b45309']

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
              style={CARD_SHADOW}
              className="flex-row items-center gap-3 rounded-2xl border border-amber-200 bg-card px-4 py-3.5 active:bg-muted"
            >
              <IconBadge icon={AlertTriangle} tint="amber" size={40} round />
              <View className="flex-1 gap-0.5">
                <Text className="text-sm font-semibold text-foreground">{a.text}</Text>
                <Text className="text-xs text-muted-foreground">{a.hint}</Text>
              </View>
              {a.onPress && <ChevronRight size={18} color="#9ca3af" />}
            </Pressable>
          ))}
        </View>
      )}

      <View className="flex-row gap-3">
        {has('attendance') && (
          <Pressable className="flex-1 gap-2 rounded-2xl border border-teal-100 bg-teal-50 p-4 active:opacity-90" testID="tile-attendance"
            accessibilityRole="button" onPress={() => router.push('/attendance')}>
            <View className="flex-row items-center gap-2.5">
              <Ring pct={summary ? summary.attendance_pct : null} size={40} stroke={4}>
                <CalendarCheck size={16} color="#0f766e" />
              </Ring>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-teal-900" numberOfLines={1}>{t.home.attendance}</Text>
                <Text className="text-[11px] text-teal-700" numberOfLines={1}>{t.thisMonth}</Text>
              </View>
            </View>
            <Text className="text-3xl font-extrabold tracking-tight text-teal-900">
              {summary ? (summary.attendance_pct === null ? '—' : `${Math.round(summary.attendance_pct)}%`) : '…'}
            </Text>
          </Pressable>
        )}

        {has('fee-management') && (
          <Pressable className={`flex-1 gap-2 rounded-2xl border p-4 active:opacity-90 ${feeTone}`} testID="tile-fees"
            accessibilityRole="button" onPress={() => router.push('/fees')}>
            <View className="flex-row items-center gap-2.5">
              <View className="size-10 items-center justify-center rounded-full bg-white">
                <Wallet size={18} color={feeFg[2]} />
              </View>
              <View className="flex-1">
                <Text className={`text-xs font-semibold ${feeFg[0]}`} numberOfLines={1}>{t.home.feesDue}</Text>
                <Text className={`text-[11px] ${feeFg[1]}`} numberOfLines={1}>{fees === null ? ' ' : fees.total_outstanding > 0 ? t.home.tapToPay : t.allClear}</Text>
              </View>
            </View>
            <Text className={`text-3xl font-extrabold tracking-tight ${feeFg[0]}`} numberOfLines={1} adjustsFontSizeToFit>{fees ? inr(fees.total_outstanding) : '—'}</Text>
          </Pressable>
        )}
      </View>

      <QuickLinks />

      {(contact?.class_teacher || contact?.school) && (
        <Section title={t.home.contactTitle} icon={Headset}>
          <Panel className="overflow-hidden">
            {contact.class_teacher && <Contact id="class-teacher" name={contact.class_teacher.name} role={t.home.classTeacher} phone={contact.class_teacher.phone}
              lead={<Avatar name={contact.class_teacher.name} className="size-11 bg-violet-100" textClassName="text-sm text-violet-800" />} />}
            {contact.class_teacher && contact.school && <Divider />}
            {contact.school && <Contact id="administration" name={contact.school.name} role={t.home.schoolAdmin} phone={contact.school.phone}
              lead={<IconBadge icon={School} tint="blue" size={44} round />} />}
            {contact.school?.address && <Text className="-mt-1.5 pb-3.5 pl-[72px] pr-4 text-xs text-muted-foreground">{contact.school.address}</Text>}
          </Panel>
        </Section>
      )}

      {has('exam-marks') && (
        <Section title={t.home.examsTitle} icon={GraduationCap} action={{ label: t.seeAll, testID: 'see-all-exams', onPress: () => router.push('/exams') }}>
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
                  <DateBadge date={e.exam_date} tint="violet" />
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
        <Section title={t.notices.title} icon={Megaphone} action={{ label: t.notices.viewAll(news.length), testID: 'notice-viewall', onPress: () => router.push('/notices') }}>
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
        <Section title={t.home.comingUp} icon={CalendarDays}>
          <Panel className="overflow-hidden">
            {events.map((e, i, arr) => (
              <View key={e.id}>
                <Row>
                  <DateBadge date={e.event_date} tint={e.event_type === 'holiday' ? 'green' : e.event_type === 'exam' ? 'rose' : 'blue'} />
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">{e.title}</Text>
                    <Text className="text-xs text-muted-foreground">{longDay(e.event_date)}{e.end_date ? ` – ${day(e.end_date)}` : ''}</Text>
                  </View>
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
