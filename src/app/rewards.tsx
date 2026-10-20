import { Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { Award, Flame, Star, Trophy } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { day, titleCase, type Rewards } from '@/lib/api'
import { Screen, Loading, Alert, Empty, Panel, Section, Row } from '@/components/ui'

export default function RewardsPage() {
  const { student } = useSession()
  const { data, error, loading, refreshing, refresh, status } = useApi<Rewards>(
    student ? `/api/parent/rewards?student_id=${student.id}` : null
  )

  if (loading) return <Loading />
  if (status === 404 || status === 405) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Rewards' }} />
        <Empty icon={Award} title="Not available yet" hint="Your school's server doesn't have this feature yet." />
      </Screen>
    )
  }
  if (error) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Rewards' }} />
        <Alert>{String(error)}</Alert>
      </Screen>
    )
  }
  if (!data || !student) return <Loading />

  const first = student.name.split(' ')[0]

  return (
    <Screen testID="rewards-screen" refreshing={refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: 'Rewards' }} />
      <View className="space-y-5">
        <View className="flex-row gap-3">
          <Panel className="flex-1 bg-amber-50 p-4">
            <Star size={20} color="#f59e0b" />
            <Text className="mt-1 text-3xl font-bold tracking-tight text-foreground" testID="rewards-total">
              {data.total_points}
            </Text>
            <Text className="text-[11px] text-muted-foreground">
              points · {data.points_this_month} this month
            </Text>
          </Panel>
          <Panel className="flex-1 bg-orange-50 p-4">
            <Flame size={20} color="#f97316" />
            <Text className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              {data.streak.current_streak}
            </Text>
            <Text className="text-[11px] text-muted-foreground">
              day streak · best {data.streak.longest_streak}
            </Text>
          </Panel>
        </View>

        <Section title="Badges">
          {data.badges.length === 0 ? (
            <Empty
              icon={Award}
              title="No badges yet"
              hint={`${first} earns badges for steady work and good results.`}
            />
          ) : (
            <View className="flex-row flex-wrap gap-2.5">
              {data.badges.map(b => (
                <Panel key={`${b.badge_type}-${b.earned_at}`} className="w-[31%] flex-col items-center gap-1 p-3 text-center">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-violet-50">
                    <Trophy size={20} color="#6d28d9" />
                  </View>
                  <Text className="text-[11px] font-medium leading-tight text-foreground text-center">
                    {titleCase(b.badge_type)}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground text-center">
                    {day(b.earned_at)}
                  </Text>
                </Panel>
              ))}
            </View>
          )}
        </Section>

        <Section title="Recent points">
          {data.recent.length === 0 ? (
            <Empty icon={Star} title="No points yet" />
          ) : (
            <Panel className="divide-y divide-border">
              {data.recent.map((r, i) => (
                <Row key={i}>
                  <Text className="flex-1 text-sm text-foreground">{titleCase(r.action_type)}</Text>
                  <Text className="text-xs text-muted-foreground">{day(r.earned_at)}</Text>
                  <Text className="w-10 text-right text-sm font-semibold text-emerald-700">
                    +{r.points}
                  </Text>
                </Row>
              ))}
            </Panel>
          )}
        </Section>
      </View>
    </Screen>
  )
}
