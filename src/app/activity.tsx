import { View } from 'react-native'
import { Stack } from 'expo-router'
import { Activity, CheckCircle2, HelpCircle, LogIn, MonitorSmartphone, type LucideIcon } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { longDay, titleCase, type ActivityFeed } from '@/lib/api'
import { Screen, Loading, Alert, Empty, Panel, Section, Row, IconTile, type Tone, Text } from '@/components/ui'

const SECTION: Record<string, string> = {
  dashboard: 'Home', timetable: 'Timetable', syllabus: 'Syllabus', library: 'Digital library', tasks: 'Homework',
  doubts: 'Ask a doubt', 'class-circle': 'Class circle', 'my-marks': 'Marks', profile: 'Profile', 'ai-hub': 'AI hub',
}

const KIND: Record<string, { Icon: LucideIcon, tone: Tone, label: string }> = {
  task_submit: { Icon: CheckCircle2, tone: 'green', label: 'Submitted homework' },
  doubt: { Icon: HelpCircle, tone: 'violet', label: 'Asked a doubt' },
  login: { Icon: LogIn, tone: 'blue', label: 'Opened the student app' },
}

function duration(sec: number) {
  if (sec < 60) return `${sec}s`
  const m = Math.round(sec / 60)
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
}

export default function ActivityPage() {
  const { student } = useSession()
  const { data, error, loading, refreshing, refresh, status } = useApi<ActivityFeed>(
    student ? `/api/parent/activity?student_id=${student.id}` : null
  )

  if (loading) return <Loading />
  if (status === 404 || status === 405) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Activity' }} />
        <Empty icon={Activity} title="Not available yet" hint="Your school's server doesn't have this feature yet." />
      </Screen>
    )
  }
  if (error) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Activity' }} />
        <Alert>{String(error)}</Alert>
      </Screen>
    )
  }
  if (!data || !student) return <Loading />

  const max = Math.max(1, ...data.sections.map(s => s.visits))

  return (
    <Screen testID="activity-screen" refreshing={refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: 'Activity' }} />
      <View className="space-y-5">
        <Panel className="flex-row flex-wrap justify-between p-4">
          <View className="w-1/3 items-center">
            <Text className="text-2xl font-bold text-foreground" testID="activity-days">{data.active_days}</Text>
            <Text className="text-[11px] text-muted-foreground">active days</Text>
          </View>
          <View className="w-1/3 items-center">
            <Text className="text-2xl font-bold text-foreground">{data.sessions}</Text>
            <Text className="text-[11px] text-muted-foreground">sessions</Text>
          </View>
          <View className="w-1/3 items-center">
            <Text className="text-2xl font-bold text-foreground">{duration(data.seconds)}</Text>
            <Text className="text-[11px] text-muted-foreground">time spent</Text>
          </View>
          <View className="mt-2 w-full items-center">
            <Text className="text-[11px] text-muted-foreground">
              Last 30 days{data.last_seen ? ` · last seen ${longDay(data.last_seen)}` : ''}
            </Text>
          </View>
        </Panel>

        {data.sessions === 0 && data.timeline.length === 0 ? (
          <Empty
            icon={MonitorSmartphone}
            title="No activity in the last 30 days"
            hint={`${student.name.split(' ')[0]} hasn't used the student app recently.`}
          />
        ) : (
          <>
            {data.sections.length > 0 && (
              <Section title="Most used">
                <Panel className="space-y-3 p-4">
                  {data.sections.map(s => (
                    <View key={s.nav_key} className="text-sm">
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-foreground">
                          {SECTION[s.nav_key] ?? titleCase(s.nav_key)}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {s.visits} visit{s.visits === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <View
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round((s.visits / max) * 100)}%` }}
                        />
                      </View>
                    </View>
                  ))}
                </Panel>
              </Section>
            )}
            <Section title="Timeline">
              <Panel className="divide-y divide-border">
                {data.timeline.map((t, i) => {
                  const k = KIND[t.kind] || { Icon: Activity, tone: 'muted', label: titleCase(t.kind) }
                  return (
                    <Row key={i}>
                      <IconTile icon={k.Icon} tone={k.tone} size="sm" />
                      <View className="flex-1">
                        <Text className="text-sm text-foreground">
                          {k.label}{t.title ? `: ${t.title}` : ''}
                        </Text>
                        {t.detail ? (
                          <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                            {t.detail}
                          </Text>
                        ) : null}
                      </View>
                      <Text className="shrink-0 text-[11px] text-muted-foreground">
                        {new Date(t.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </Row>
                  )
                })}
              </Panel>
            </Section>
          </>
        )}
      </View>
    </Screen>
  )
}
