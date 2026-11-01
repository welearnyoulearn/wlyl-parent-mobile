import { useState } from 'react'
import { View } from 'react-native'
import { CalendarCheck, CalendarRange, Flame, UserX, type LucideIcon } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { type Attendance, type AttendanceDay, attendanceStreak, day, longDay } from '@/lib/api'
import { Screen, Section, Panel, Empty, Row, Chip, ErrorState, ScreenSkeleton, type Tone, type Tint, Divider, DateBadge, Text } from '@/components/ui'
import { MonthCalendar, shiftMonth, todayISO } from '@/components/month-calendar'
import { useT, type Strings } from '@/lib/i18n'

// Day colours follow the web AttendanceCalendar: green present, amber late, red absent, slate holiday/weekly off.
const TONE: Record<string, { chip: Tone; cell: string; label: (t: Strings) => string }> = {
  present: { chip: 'green', cell: 'bg-success-graphic/30', label: t => t.present },
  late: { chip: 'amber', cell: 'bg-warning-graphic/35', label: t => t.late },
  absent: { chip: 'red', cell: 'bg-danger-graphic/35', label: t => t.absent },
  half: { chip: 'amber', cell: 'bg-warning-graphic/70', label: t => t.attendance.half },
  holiday: { chip: 'blue', cell: 'bg-info-graphic/30', label: t => t.attendance.holiday },
  weekly_off: { chip: 'muted', cell: 'bg-muted', label: t => t.attendance.weeklyOff },
  not_marked: { chip: 'muted', cell: 'border border-dashed border-input', label: t => t.attendance.notMarked },
  future: { chip: 'muted', cell: '', label: t => t.attendance.upcoming },
  before_joining: { chip: 'muted', cell: 'bg-muted', label: t => t.attendance.beforeJoining },
}
const LEGEND = ['present', 'late', 'absent', 'half', 'holiday', 'weekly_off', 'not_marked']

// Bands from guide §14.1: good ≥ 90, watch 75–89, low < 75, none when nothing is marked.
function band(pct: number | null, t: Strings) {
  if (pct === null) return { text: t.attendance.bandNone, bg: 'bg-muted', fg: 'text-muted-foreground', value: 'text-foreground', tint: 'muted' as const }
  if (pct >= 90) return { text: t.attendance.bandGood, bg: 'bg-success-soft', fg: 'text-success', value: 'text-success', tint: 'green' as const }
  if (pct >= 75) return { text: t.attendance.bandWatch, bg: 'bg-warning-soft', fg: 'text-warning', value: 'text-warning', tint: 'amber' as const }
  return { text: t.attendance.bandLow, bg: 'bg-danger-soft', fg: 'text-danger', value: 'text-danger', tint: 'rose' as const }
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

// One number in the summary grid: what it is, the figure (coloured only for status), and a note.
function Stat({ value, label, hint, valueClass = 'text-foreground', testID }: {
  value: string | number; label: string; hint?: string; valueClass?: string; icon?: LucideIcon; tint?: Tint; testID: string
}) {
  return (
    <View className="flex-1 gap-0.5 px-4 py-3">
      <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>{label}</Text>
      <Text testID={testID} className={`text-2xl font-bold tracking-tight ${valueClass}`} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {hint ? <Text className="text-xs text-muted-foreground">{hint}</Text> : null}
    </View>
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

  if (error && !data) {
    return (
      <Screen refreshing={refreshing} onRefresh={refresh} testID="attendance-screen">
        <ErrorState message={error || t.attendance.loadError} onRetry={refresh} busy={refreshing} />
      </Screen>
    )
  }

  if (loading && !data) {
    return (
      <Screen testID="attendance-screen">
        <ScreenSkeleton />
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
      {/* Four numbers in one surface, split by hairlines, with the band message under them. */}
      <Panel className="overflow-hidden">
        <View className="flex-row">
          <Stat testID="att-summary-month-pct" value={s.pct === null ? '—' : `${s.pct}%`} valueClass={b.value} icon={CalendarCheck} tint={b.tint}
            label={t.thisMonth} hint={t.attendance.attendedOf(s.attended, s.marked)} />
          <Stat testID="att-summary-year-pct" value={data.yearToDate.summary.pct === null ? '—' : `${data.yearToDate.summary.pct}%`}
            valueClass="text-foreground" icon={CalendarRange} tint="teal"
            label={t.attendance.thisYear} hint={t.attendance.since(day(data.yearToDate.from))} />
        </View>
        <View className="h-px bg-border" />
        <View className="flex-row">
          <Stat testID="att-summary-absent-days" value={data.month.absentDays} valueClass={data.month.absentDays > 0 ? 'text-danger' : 'text-foreground'}
            icon={UserX} tint={data.month.absentDays > 0 ? 'rose' : 'muted'} label={t.attendance.daysAbsent} hint={data.month.halfDays > 0 ? t.attendance.plusHalfDays(data.month.halfDays) : undefined} />
          <Stat testID="att-summary-streak"
            value={streak} icon={Flame} tint={streak >= 5 ? 'amber' : 'muted'}
            valueClass={streak >= 5 ? 'text-warning' : 'text-foreground'}
            label={t.attendance.streakTitle} hint={s.late > 0 ? t.attendance.lateThisMonth(s.late) : t.attendance.noLate} />
        </View>
        <View testID="att-summary-message" accessibilityRole="text" className={`px-4 py-3 ${b.bg}`}>
          <Text className={`text-sm ${b.fg}`}>{b.text}</Text>
        </View>
      </Panel>

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
              const fill = pct >= 90 ? 'bg-success-graphic' : pct >= 75 ? 'bg-primary' : 'bg-warning-graphic'
              return (
                <View key={m} className="gap-1.5">
                  <View className="flex-row items-end justify-between">
                    <Text className="text-sm font-medium text-foreground">{monthName(m)}</Text>
                    <Text className="text-xs text-muted-foreground">{t.attendance.sessionsLine(ms.attended, ms.marked, ms.pct === null ? '—' : `${ms.pct}%`)}</Text>
                  </View>
                  <View className="relative h-2 w-full rounded-full bg-muted">
                    <View className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
                    <View className="absolute -top-0.5 h-3 w-px bg-danger-graphic" style={{ left: '75%' }} />
                    <View className="absolute -top-0.5 h-3 w-px bg-success-graphic" style={{ left: '90%' }} />
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
                  <DateBadge date={h.event_date} tint="green" />
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">{h.title}</Text>
                    <Text className="text-xs text-muted-foreground">{day(h.event_date)}{h.end_date ? ` – ${day(h.end_date)}` : ''}</Text>
                  </View>
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
                    <DateBadge date={d.date} tint={d.status === 'absent' ? 'rose' : 'amber'} />
                    <Text className="flex-1 text-sm font-medium text-foreground">{longDay(d.date)}</Text>
                    <View><Chip tone={TONE[d.status]?.chip ?? 'muted'}>{TONE[d.status]?.label(t) ?? d.status}</Chip></View>
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
