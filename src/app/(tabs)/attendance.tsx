import { useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { CalendarCheck, Flame } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { type Attendance, type AttendanceDay, attendanceStreak, day, longDay } from '@/lib/api'
import { Screen, Loading, Section, Panel, Empty, Row, Chip, Alert, type Tone, Divider, COLORS } from '@/components/ui'
import { MonthCalendar, shiftMonth, todayISO } from '@/components/month-calendar'
import { useT, type Strings } from '@/lib/i18n'

// Day colours follow the web AttendanceCalendar: green present, amber late, red absent, slate holiday/weekly off.
const TONE: Record<string, { chip: Tone; cell: string; label: (t: Strings) => string }> = {
  present: { chip: 'green', cell: 'bg-emerald-200', label: t => t.present },
  late: { chip: 'amber', cell: 'bg-amber-200', label: t => t.late },
  absent: { chip: 'red', cell: 'bg-rose-200', label: t => t.absent },
  half: { chip: 'amber', cell: 'bg-orange-200', label: t => t.attendance.half },
  holiday: { chip: 'blue', cell: 'bg-slate-300', label: t => t.attendance.holiday },
  weekly_off: { chip: 'muted', cell: 'bg-slate-100', label: t => t.attendance.weeklyOff },
  not_marked: { chip: 'muted', cell: 'border border-dashed border-gray-300', label: t => t.attendance.notMarked },
  future: { chip: 'muted', cell: '', label: t => t.attendance.upcoming },
  before_joining: { chip: 'muted', cell: 'bg-gray-100', label: t => t.attendance.beforeJoining },
}
const LEGEND = ['present', 'late', 'absent', 'half', 'holiday', 'weekly_off', 'not_marked']

// Bands from guide §14.1: good ≥ 90, watch 75–89, low < 75, none when nothing is marked.
function band(pct: number | null, t: Strings) {
  if (pct === null) return { text: t.attendance.bandNone, bg: 'bg-muted', fg: 'text-muted-foreground', value: 'text-foreground' }
  if (pct >= 90) return { text: t.attendance.bandGood, bg: 'bg-emerald-50', fg: 'text-emerald-700', value: 'text-emerald-600' }
  if (pct >= 75) return { text: t.attendance.bandWatch, bg: 'bg-amber-50', fg: 'text-amber-700', value: 'text-amber-600' }
  return { text: t.attendance.bandLow, bg: 'bg-rose-50', fg: 'text-rose-700', value: 'text-rose-600' }
}

function dayDetail(d: AttendanceDay, t: Strings) {
  const session = (s: string | null) => (s ? TONE[s]?.label(t) ?? s : t.attendance.notMarked)
  switch (d.status) {
    case 'holiday': return t.attendance.holidayDetail(d.title ?? '')
    case 'weekly_off': return t.attendance.weeklyOffDetail
    case 'future': return t.attendance.futureDetail
    case 'before_joining': return t.attendance.beforeJoiningDetail
    case 'not_marked': return t.attendance.notMarkedDetail
    default:
      return `${t.attendance.morning}: ${session(d.morning)}${d.afternoon ? ` · ${t.attendance.afternoon}: ${session(d.afternoon)}` : ''}`
  }
}

function Stat({ value, label, hint, valueClass = 'text-foreground', icon, testID }: {
  value: string | number; label: string; hint?: string; valueClass?: string; icon?: ReactNode; testID: string
}) {
  return (
    <Panel className="flex-1 items-center p-3">
      <View className="flex-row items-center gap-1">
        {icon}
        <Text testID={testID} className={`text-2xl font-bold ${valueClass}`}>{value}</Text>
      </View>
      <Text className="text-xs text-muted-foreground">{label}</Text>
      {hint ? <Text className="text-center text-[11px] text-muted-foreground">{hint}</Text> : null}
    </Panel>
  )
}

export default function AttendanceScreen() {
  const { student } = useSession()
  const t = useT()
  const currentMonth = todayISO().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [selected, setSelected] = useState<string | null>(null)
  const { data, error, loading, refreshing, refresh } = useApi<Attendance>(
    student ? `/api/parent/attendance?school_id=${student.school_id}&student_id=${student.id}&month=${month}` : null
  )

  const monthName = (m: string) => {
    // e.g. "2024-09" -> "Sep 24"
    const d = new Date(`${m}-01T00:00:00Z`)
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
  }

  function go(delta: number) {
    setMonth(m => (delta > 0 && m >= currentMonth ? m : shiftMonth(m, delta)))
    setSelected(null)
  }

  if (error) {
    return (
      <Screen refreshing={refreshing} onRefresh={refresh} testID="attendance-screen">
        <Alert>{error || t.attendance.loadError}</Alert>
      </Screen>
    )
  }

  if (loading && !data) {
    return (
      <Screen testID="attendance-screen">
        <Loading label={t.attendance.loading} />
      </Screen>
    )
  }

  if (!data) return null

  const s = data.month.summary
  const b = band(s.pct, t)
  const streak = attendanceStreak(data.month.days)
  const byDate = new Map(data.month.days.map(d => [d.date, d]))
  const selectedDay = selected ? byDate.get(selected) : undefined
  const absences = [...data.month.days].reverse().filter(d => ['absent', 'late', 'half'].includes(d.status))

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} testID="attendance-screen">
      <View className="gap-3">
        <View className="flex-row gap-3">
          <Stat testID="att-summary-month-pct" value={s.pct === null ? '—' : `${s.pct}%`} valueClass={b.value}
            label={t.thisMonth} hint={t.attendance.attendedOf(s.attended, s.marked)} />
          <Stat testID="att-summary-year-pct" value={data.yearToDate.summary.pct === null ? '—' : `${data.yearToDate.summary.pct}%`}
            valueClass={band(data.yearToDate.summary.pct, t).value}
            label={t.attendance.thisYear} hint={t.attendance.since(day(data.yearToDate.from))} />
        </View>
        <View className="flex-row gap-3">
          <Stat testID="att-summary-absent-days" value={data.month.absentDays} valueClass={data.month.absentDays > 0 ? 'text-rose-600' : 'text-foreground'}
            label={t.attendance.daysAbsent} hint={data.month.halfDays > 0 ? t.attendance.plusHalfDays(data.month.halfDays) : undefined} />
          <Stat testID="att-summary-streak"
            value={streak} icon={streak >= 5 ? <Flame size={18} color={COLORS.green} /> : undefined}
            valueClass={streak >= 5 ? 'text-emerald-700' : 'text-foreground'}
            label={t.attendance.streakTitle} hint={s.late > 0 ? t.attendance.lateThisMonth(s.late) : t.attendance.noLate} />
        </View>
      </View>

      <View testID="att-summary-message" accessibilityRole="text" className={`rounded-xl px-4 py-3 ${b.bg}`}>
        <Text className={`text-sm ${b.fg}`}>{b.text}</Text>
      </View>

      <View className="gap-3">
        <MonthCalendar
          month={month}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          nextDisabled={month >= currentMonth}
          selected={selected}
          onSelectDay={d => setSelected(sel => (sel === d ? null : d))}
          testIDPrefix="att-cal"
          dayBg={d => TONE[byDate.get(d)?.status ?? '']?.cell ?? ''}
          accessibilityLabelFor={d => {
            const st = byDate.get(d)
            return st ? `${longDay(d)}: ${st.title ?? TONE[st.status]?.label(t) ?? st.status}` : longDay(d)
          }}
        />
        <Panel className="p-4" testID="att-cal-detail">
          {selectedDay ? (
            <Text className="text-sm text-foreground">
              <Text className="font-semibold">{longDay(selectedDay.date)}</Text> · {dayDetail(selectedDay, t)}
            </Text>
          ) : (
            <Text className="text-sm text-muted-foreground">{t.attendance.tapDayHint}</Text>
          )}
        </Panel>
        <View className="flex-row flex-wrap gap-x-4 gap-y-1.5 px-1">
          {LEGEND.map(k => (
            <View key={k} className="flex-row items-center gap-1.5">
              <View className={`h-3 w-3 rounded-sm ${TONE[k].cell}`} />
              <Text className="text-xs text-muted-foreground">{TONE[k].label(t)}</Text>
            </View>
          ))}
        </View>
      </View>

      {data.trend.length >= 2 && (
        <Section title={t.attendance.byMonth}>
          <Panel className="gap-4 p-4" testID="att-trend">
            <Text className="text-xs text-muted-foreground">{t.attendance.trendHint}</Text>
            {[...data.trend].reverse().map(({ month: m, summary: ms }) => {
              const pct = ms.pct ?? 0
              const fill = pct >= 90 ? 'bg-emerald-500' : pct >= 75 ? 'bg-teal-500' : 'bg-amber-500'
              return (
                <View key={m} className="gap-1.5">
                  <View className="flex-row items-end justify-between">
                    <Text className="text-sm font-medium text-foreground">{monthName(m)}</Text>
                    <Text className="text-xs text-muted-foreground">{t.attendance.sessionsLine(ms.attended, ms.marked, ms.pct === null ? '—' : `${ms.pct}%`)}</Text>
                  </View>
                  <View className="relative h-2 w-full rounded-full bg-muted">
                    <View className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
                    <View className="absolute -top-0.5 h-3 w-px bg-rose-500" style={{ left: '75%' }} />
                    <View className="absolute -top-0.5 h-3 w-px bg-emerald-600" style={{ left: '90%' }} />
                  </View>
                </View>
              )
            })}
          </Panel>
        </Section>
      )}

      {data.upcomingHolidays.length > 0 && (
        <Section title={t.attendance.upcomingHolidays}>
          <Panel className="overflow-hidden" testID="att-upcoming-holidays">
            {data.upcomingHolidays.slice(0, 5).map((h, index) => (
              <View key={`${h.title}-${h.event_date}`}>
                {index > 0 && <Divider />}
                <Row>
                  <Text className="flex-1 text-sm text-foreground">{h.title}</Text>
                  <Text className="text-xs text-muted-foreground">{day(h.event_date)}{h.end_date ? ` – ${day(h.end_date)}` : ''}</Text>
                </Row>
              </View>
            ))}
          </Panel>
        </Section>
      )}

      {s.marked === 0 ? (
        <Empty icon={CalendarCheck} title={t.attendance.emptyTitle} hint={t.attendance.emptyHint} />
      ) : (
        <Section title={t.attendance.absencesTitle}>
          {absences.length === 0 ? (
            <Empty icon={CalendarCheck} title={t.attendance.fullAttendanceTitle} hint={t.attendance.fullAttendanceHint} />
          ) : (
            <Panel className="overflow-hidden">
              {absences.map((d, index) => (
                <View key={d.date}>
                  {index > 0 && <Divider />}
                  <Row testID={`absence-row-${d.date}`}>
                    <Text className="flex-1 text-sm text-foreground">{day(d.date)}</Text>
                    <Chip tone={TONE[d.status]?.chip ?? 'muted'}>{TONE[d.status]?.label(t) ?? d.status}</Chip>
                  </Row>
                </View>
              ))}
            </Panel>
          )}
        </Section>
      )}
    </Screen>
  )
}
