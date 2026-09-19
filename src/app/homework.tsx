import { useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import { Stack } from 'expo-router'
import { CheckCircle2, NotebookPen, Clock } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { longDay, titleCase, type Homework } from '@/lib/api'
import { useApi } from '@/lib/use-api'
import { Screen, Panel, Empty, Chip, Alert, Loading } from '@/components/ui'

const today = () => new Date().toISOString().slice(0, 10)
const done = (h: Homework) => !h.resubmission_requested && (h.submission_status === 'submitted' || h.submission_status === 'reviewed')

function DueChip({ h }: { h: Homework }) {
  if (h.resubmission_requested) return <Chip tone="amber">Redo requested</Chip>
  if (!h.due_date) return <Chip tone="muted">No due date</Chip>
  const days = Math.round((new Date(h.due_date).getTime() - new Date(today()).getTime()) / 86400000)
  if (days < 0) return <Chip tone="red">Overdue by {-days} day{days === -1 ? '' : 's'}</Chip>
  if (days === 0) return <Chip tone="amber">Due today</Chip>
  if (days === 1) return <Chip tone="amber">Due tomorrow</Chip>
  return <Chip tone="blue">Due {longDay(h.due_date)}</Chip>
}

function Card({ h }: { h: Homework }) {
  return (
    <Panel className="p-4" testID={`homework-${h.id}`}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 shrink">
          <Text className="text-[11px] font-medium uppercase tracking-wide text-teal-700">
            {h.subject} · {titleCase(h.task_type)}
          </Text>
          <Text className="text-sm font-semibold text-foreground">{h.title}</Text>
          {h.teacher_name && <Text className="text-[11px] text-muted-foreground">{h.teacher_name}</Text>}
        </View>
        <View className="shrink-0">
          {done(h)
            ? (h.submission_status === 'reviewed' && h.score !== null
              ? <Chip tone="green">{h.score}/{h.max_marks}</Chip>
              : <Chip tone="green">Submitted</Chip>)
            : <DueChip h={h} />}
        </View>
      </View>
      {h.instructions && !done(h) && (
        <Text className="mt-2 text-xs text-muted-foreground" numberOfLines={3}>{h.instructions}</Text>
      )}
      {h.feedback && (
        <View className="mt-2 rounded-xl bg-muted/60 px-3 py-2">
          <Text className="text-xs text-foreground"><Text className="font-medium">Teacher: </Text>{h.feedback}</Text>
        </View>
      )}
      {done(h) && h.submitted_at && (
        <Text className="mt-2 text-[11px] text-muted-foreground">Submitted {longDay(h.submitted_at)}</Text>
      )}
    </Panel>
  )
}

export default function HomeworkPage() {
  const { student } = useSession()
  const { data: items, loading, error, status, refreshing, refresh } = useApi<Homework[]>(student ? `/api/parent/homework?student_id=${student.id}` : null)
  const [tab, setTab] = useState<'pending' | 'done'>('pending')

  if (status === 404 || status === 405) {
    return (
      <>
        <Stack.Screen options={{ title: 'Homework' }} />
        <Screen testID="homework-screen-404">
          <Empty icon={Clock} title="Not available yet" hint="Your school's server doesn't have this feature yet." />
        </Screen>
      </>
    )
  }

  const pending = items?.filter(h => !done(h)) ?? []
  const finished = items?.filter(done) ?? []
  const overdue = pending.filter(h => h.due_date && h.due_date < today()).length

  return (
    <>
      <Stack.Screen options={{ title: 'Homework' }} />
      <Screen testID="homework-screen" refreshing={refreshing} onRefresh={refresh}>
        {error && <Alert>{error}</Alert>}

        {loading ? <Loading /> : items && student ? (
          <>
            <Panel className="flex-row p-4">
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold text-foreground">{pending.length}</Text>
                <Text className="text-[11px] text-muted-foreground">To do</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className={`text-2xl font-bold ${overdue ? 'text-rose-600' : 'text-foreground'}`}>{overdue}</Text>
                <Text className="text-[11px] text-muted-foreground">Overdue</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-2xl font-bold text-emerald-700">{finished.length}</Text>
                <Text className="text-[11px] text-muted-foreground">Done</Text>
              </View>
            </Panel>

            <View>
              <View className="flex-row border-b border-border">
                <Pressable
                  testID="homework-tab-pending"
                  accessibilityRole="tab"
                  onPress={() => setTab('pending')}
                  className={`flex-1 items-center py-3 border-b-2 ${tab === 'pending' ? 'border-primary' : 'border-transparent'}`}
                >
                  <Text className={`text-sm font-medium ${tab === 'pending' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    To do
                  </Text>
                </Pressable>
                <Pressable
                  testID="homework-tab-done"
                  accessibilityRole="tab"
                  onPress={() => setTab('done')}
                  className={`flex-1 items-center py-3 border-b-2 ${tab === 'done' ? 'border-primary' : 'border-transparent'}`}
                >
                  <Text className={`text-sm font-medium ${tab === 'done' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Done
                  </Text>
                </Pressable>
              </View>
            </View>

            <View className="mt-1 gap-2">
              {tab === 'pending' ? (
                pending.length === 0 ? (
                  <Empty icon={CheckCircle2} title="All caught up" hint={`${student.name.split(' ')[0]} has no pending homework.`} />
                ) : (
                  pending.map(h => <Card key={h.id} h={h} />)
                )
              ) : (
                finished.length === 0 ? (
                  <Empty icon={NotebookPen} title="Nothing submitted yet" />
                ) : (
                  finished.map(h => <Card key={h.id} h={h} />)
                )
              )}
            </View>
          </>
        ) : null}
      </Screen>
    </>
  )
}
