import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { CalendarCheck } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { type Attendance, day } from '@/lib/api'
import { Screen, Loading, Ring, Section, Panel, Empty, Row, Chip, Alert, type Tone, Divider } from '@/components/ui'

const TONE: Record<string, { chip: Tone; dot: string; label: string }> = {
  present: { chip: 'green', dot: 'bg-emerald-500', label: 'Present' },
  absent: { chip: 'red', dot: 'bg-rose-500', label: 'Absent' },
  late: { chip: 'amber', dot: 'bg-amber-400', label: 'Late' },
  leave: { chip: 'blue', dot: 'bg-sky-400', label: 'Leave' },
}

export default function AttendanceScreen() {
  const { student } = useSession()
  const { data, error, loading, refreshing, refresh } = useApi<Attendance>(
    student ? `/api/parent/attendance?school_id=${student.school_id}&student_id=${student.id}&months=3` : null
  )

  const monthName = (m: string) => {
    // e.g. "2024-09" -> "Sep 24"
    const d = new Date(`${m}-01T00:00:00Z`)
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
  }

  const { cells, byDate } = useMemo(() => {
    if (!data) return { cells: [], byDate: new Map<string, string>() }
    const bd = new Map(data.days.map(d => [d.date, d.morning as string]))
    const end = new Date()
    end.setHours(0, 0, 0, 0)
    const start = new Date(end)
    start.setDate(end.getDate() - end.getDay() - 7 * 7 + 1)

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
        <Alert>{error || 'Failed to load attendance'}</Alert>
      </Screen>
    )
  }

  if (loading && !data) {
    return (
      <Screen testID="attendance-screen">
        <Loading label="Loading attendance..." />
      </Screen>
    )
  }

  if (!data) return null

  const s = data.summary
  const absences = [...data.days].reverse().filter(d => d.morning && d.morning !== 'present')

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} testID="attendance-screen">
      <Panel className="flex-row items-center gap-4 p-4">
        <Ring pct={s.pct} size={92} stroke={9}>
          <Text className="text-xl font-bold text-foreground" testID="attendance-pct">
            {s.pct === null ? '—' : `${s.pct}%`}
          </Text>
        </Ring>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">Last 3 months</Text>
          <Text className="text-xs text-muted-foreground">{s.totalDays} school days</Text>
          <View className="mt-2 flex-row gap-2">
            <View className="flex-1 items-center rounded-xl bg-emerald-50 py-1.5">
              <Text className="text-base font-bold text-emerald-700">{s.presentDays}</Text>
              <Text className="text-[10px] text-emerald-700/80">Present</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-rose-50 py-1.5">
              <Text className="text-base font-bold text-rose-700">{s.absentDays}</Text>
              <Text className="text-[10px] text-rose-700/80">Absent</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-amber-50 py-1.5">
              <Text className="text-base font-bold text-amber-700">{s.lateDays}</Text>
              <Text className="text-[10px] text-amber-700/80">Late</Text>
            </View>
          </View>
        </View>
      </Panel>

      {data.days.length === 0 ? (
        <Empty icon={CalendarCheck} title="No attendance marked yet" hint="Your child's daily attendance will appear here." />
      ) : (
        <>
          <Section title="Last 8 weeks">
            <Panel className="p-4">
              <View className="gap-1.5">
                <View className="flex-row justify-between">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
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
                {(['present', 'absent', 'late'] as const).map(k => (
                  <View key={k} className="flex-row items-center gap-1.5">
                    <View className={`h-3 w-3 rounded-sm ${TONE[k].dot}`} />
                    <Text className="text-xs text-muted-foreground">{TONE[k].label}</Text>
                  </View>
                ))}
              </View>
            </Panel>
          </Section>

          <Section title="By month">
            <Panel className="gap-4 p-4">
              {data.monthly.map(m => {
                const fill = m.pct >= 90 ? 'bg-emerald-500' : m.pct >= 75 ? 'bg-teal-500' : 'bg-amber-500'
                return (
                  <View key={m.month} className="gap-1.5">
                    <View className="flex-row items-end justify-between">
                      <Text className="text-sm font-medium text-foreground">{monthName(m.month)}</Text>
                      <Text className="text-xs text-muted-foreground">{m.present}/{m.total} days · {m.pct}%</Text>
                    </View>
                    <View className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <View className={`h-full rounded-full ${fill}`} style={{ width: `${m.pct}%` }} />
                    </View>
                  </View>
                )
              })}
            </Panel>
          </Section>

          <Section title="Absences and late arrivals">
            {absences.length === 0 ? (
              <Empty icon={CalendarCheck} title="Full attendance" hint="No absences in the last 3 months." />
            ) : (
              <Panel className="overflow-hidden">
                {absences.map((d, index) => (
                  <View key={d.date}>
                    {index > 0 && <Divider />}
                    <Row testID={`absence-row-${d.date}`}>
                      <Text className="flex-1 text-sm text-foreground">{day(d.date)}</Text>
                      <Chip tone={TONE[d.morning!]?.chip ?? 'muted'}>{TONE[d.morning!]?.label ?? d.morning}</Chip>
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
