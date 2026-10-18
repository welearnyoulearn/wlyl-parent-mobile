import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { CalendarCheck } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { type Attendance, day } from '@/lib/api'
import { Screen, Loading, Ring, Section, Panel, Empty, Row, Chip, Alert, type Tone, Divider } from '@/components/ui'
import { useT, type Strings } from '@/lib/i18n'

const TONE: Record<string, { chip: Tone; dot: string; label: (t: Strings) => string }> = {
  present: { chip: 'green', dot: 'bg-emerald-500', label: t => t.present },
  absent: { chip: 'red', dot: 'bg-rose-500', label: t => t.absent },
  late: { chip: 'amber', dot: 'bg-amber-400', label: t => t.late },
  half: { chip: 'amber', dot: 'bg-orange-400', label: t => t.attendance.half },
  holiday: { chip: 'blue', dot: 'bg-sky-200', label: t => t.attendance.holiday },
  weekly_off: { chip: 'muted', dot: 'bg-transparent', label: t => t.attendance.weeklyOff },
  future: { chip: 'muted', dot: 'bg-transparent', label: t => t.attendance.upcoming },
  before_joining: { chip: 'muted', dot: 'bg-transparent', label: t => t.attendance.beforeJoining },
}

export default function AttendanceScreen() {
  const { student } = useSession()
  const t = useT()
  const { data, error, loading, refreshing, refresh } = useApi<Attendance>(
    student ? `/api/parent/attendance?school_id=${student.school_id}&student_id=${student.id}` : null
  )

  const monthName = (m: string) => {
    // e.g. "2024-09" -> "Sep 24"
    const d = new Date(`${m}-01T00:00:00Z`)
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
  }

  const { cells, byDate } = useMemo(() => {
    if (!data) return { cells: [], byDate: new Map<string, string>() }
    const bd = new Map(data.month.days.map(d => [d.date, d.status]))
    const [year, month] = data.month.month.split('-').map(Number)
    const end = new Date(year, month, 0)
    const start = new Date(year, month - 1, 1)
    start.setDate(start.getDate() - (start.getDay() + 6) % 7)

    const cs: (Date | null)[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      cs.push(new Date(d))
    }
    while (cs.length % 7 !== 0) cs.push(null)
    return { cells: cs, byDate: bd }
  }, [data])

  const weekChunks = useMemo(() => {
    const chunks = []
    for (let i = 0; i < cells.length; i += 7) {
      chunks.push(cells.slice(i, i + 7))
    }
    return chunks
  }, [cells])

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
  const absences = [...data.month.days].reverse().filter(d => ['absent', 'late', 'half'].includes(d.status))

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} testID="attendance-screen">
      <Panel className="flex-row items-center gap-4 p-4">
        <Ring pct={s.pct} size={92} stroke={9}>
          <Text className="text-xl font-bold text-foreground" testID="attendance-pct">
            {s.pct === null ? '—' : `${s.pct}%`}
          </Text>
        </Ring>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">{monthName(data.month.month)}</Text>
          <Text className="text-xs text-muted-foreground">{t.attendance.markedSessions(s.marked)}</Text>
          <View className="mt-2 flex-row gap-2">
            <View className="flex-1 items-center rounded-xl bg-emerald-50 py-1.5">
              <Text className="text-base font-bold text-emerald-700">{s.present}</Text>
              <Text className="text-[10px] text-emerald-700/80">{t.present}</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-rose-50 py-1.5">
              <Text className="text-base font-bold text-rose-700">{s.absent}</Text>
              <Text className="text-[10px] text-rose-700/80">{t.absent}</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-amber-50 py-1.5">
              <Text className="text-base font-bold text-amber-700">{s.late}</Text>
              <Text className="text-[10px] text-amber-700/80">{t.late}</Text>
            </View>
          </View>
        </View>
      </Panel>

      {s.marked === 0 ? (
        <Empty icon={CalendarCheck} title={t.attendance.emptyTitle} hint={t.attendance.emptyHint} />
      ) : (
        <>
          <Section title={t.thisMonth}>
            <Panel className="p-4">
              <View className="gap-1.5">
                <View className="flex-row justify-between">
                  {t.attendance.weekdayLetters.map((d, i) => (
                    <Text key={i} className="w-8 text-center text-[10px] text-muted-foreground">{d}</Text>
                  ))}
                </View>
                {weekChunks.map((week, i) => (
                  <View key={i} className="flex-row justify-between">
                    {week.map((d, j) => {
                      if (!d) return <View key={j} className="h-7 w-8" />
                      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                      const st = byDate.get(iso)
                      const dow = d.getDay()
                      const bg = st ? TONE[st]?.dot ?? 'bg-muted' : (dow === 0 || dow === 6 ? 'bg-transparent' : 'bg-muted')
                      return (
                        <View key={iso} className="w-8 items-center justify-center">
                          <View className={`h-7 w-7 rounded-md ${bg}`} />
                        </View>
                      )
                    })}
                  </View>
                ))}
              </View>
              <View className="mt-4 flex-row flex-wrap gap-4">
                {(['present', 'absent', 'late', 'half', 'holiday'] as const).map(k => (
                  <View key={k} className="flex-row items-center gap-1.5">
                    <View className={`h-3 w-3 rounded-sm ${TONE[k].dot}`} />
                    <Text className="text-xs text-muted-foreground">{TONE[k].label(t)}</Text>
                  </View>
                ))}
              </View>
            </Panel>
          </Section>

          <Section title={t.attendance.byMonth}>
            <Panel className="gap-4 p-4">
              {[...data.trend].reverse().map(({ month, summary: m }) => {
                const pct = m.pct ?? 0
                const fill = pct >= 90 ? 'bg-emerald-500' : pct >= 75 ? 'bg-teal-500' : 'bg-amber-500'
                return (
                  <View key={month} className="gap-1.5">
                    <View className="flex-row items-end justify-between">
                      <Text className="text-sm font-medium text-foreground">{monthName(month)}</Text>
                      <Text className="text-xs text-muted-foreground">{t.attendance.sessionsLine(m.attended, m.marked, m.pct === null ? '—' : `${m.pct}%`)}</Text>
                    </View>
                    <View className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <View className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
                    </View>
                  </View>
                )
              })}
            </Panel>
          </Section>

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
        </>
      )}
    </Screen>
  )
}
