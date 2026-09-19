import { useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import { Link } from 'expo-router'
import { CalendarDays, ChevronRight, GraduationCap } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { EXAM_TYPE, day, longDay, type Summary, type MarkSheet } from '@/lib/api'
import { useApi } from '@/lib/use-api'
import { Screen, Loading, Panel, Empty, Chip, Alert, Ring } from '@/components/ui'

function daysUntil(d: string) {
  const n = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  return n <= 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`
}

export default function ExamsScreen() {
  const { student } = useSession()
  const q = student ? `school_id=${student.school_id}&student_id=${student.id}&class_id=${student.class_id}` : null
  const summaryApi = useApi<Summary>(q ? `/api/parent/child-summary?${q}` : null)
  const sheetsApi = useApi<MarkSheet[]>(student && q ? `/api/students/${student.id}/exams?${q}` : null)
  const [tab, setTab] = useState<string | null>(null)

  const loading = summaryApi.loading || sheetsApi.loading
  const error = summaryApi.error || sheetsApi.error
  const refreshing = summaryApi.refreshing || sheetsApi.refreshing
  const onRefresh = () => { summaryApi.refresh(); sheetsApi.refresh() }

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
            Upcoming
          </Text>
        </Pressable>
        <Pressable
          testID="exams-tab-results"
          accessibilityRole="tab"
          onPress={() => setTab('results')}
          className={`flex-1 flex-row items-center justify-center p-3 border-b-2 gap-1 ${activeTab === 'results' ? 'border-primary' : 'border-transparent'}`}
        >
          <Text className={`text-sm font-semibold ${activeTab === 'results' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Results
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
          summary?.upcoming_exams.length === 0 ? (
            <Empty icon={CalendarDays} title="No exams scheduled" hint="Upcoming exams for the next two months appear here." />
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
                    <Text className="text-[11px] text-muted-foreground">{EXAM_TYPE[e.exam_type] ?? e.exam_type} · starts {longDay(e.exam_date)}</Text>
                  </View>
                  <Chip tone="blue">{daysUntil(e.exam_date)}</Chip>
                </View>
                <View className="mt-3 flex-row flex-wrap gap-1.5">
                  {e.subjects.map(s => <Chip key={s}>{s}</Chip>)}
                </View>
              </Panel>
            ))
          )
        ) : (
          sheets?.length === 0 ? (
            <Empty icon={GraduationCap} title="No results released yet" />
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
                        {EXAM_TYPE[r.exam_type] ?? r.exam_type} · {day(r.exam_date)}
                        {r.total_obtained !== null ? ` · ${r.total_obtained}/${r.total_max}` : ''}
                      </Text>
                      <View className="mt-1 flex-row flex-wrap gap-1.5">
                        {r.grade && <Chip tone={r.pass === false ? 'red' : 'teal'}>Grade {r.grade}</Chip>}
                        {r.parent_acknowledged ? <Chip tone="green">Acknowledged</Chip> : <Chip tone="amber">Sign-off needed</Chip>}
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