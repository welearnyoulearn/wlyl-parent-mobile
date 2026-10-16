import { ClassLoading } from '@/components/class-loading'
import { useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import { Stack } from 'expo-router'
import { BookOpenCheck, CheckCircle2, Circle, ChevronDown } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { type Syllabus, day } from '@/lib/api'
import { useApi } from '@/lib/use-api'
import { Screen, Loading, Alert, Empty, Panel, Divider } from '@/components/ui'

export default function SyllabusScreen() {
  const { student, has } = useSession()
  const enabled = has('curriculum')
  const [open, setOpen] = useState<string | null>(null)

  const { data, error, loading, refreshing, refresh, status } = useApi<Syllabus>(
    student && student.class_id > 0 && enabled ? `/api/syllabus?school_id=${student.school_id}&class_id=${student.class_id}` : null
  )

  if (!enabled) {
    return (
      <>
        <Stack.Screen options={{ title: 'Syllabus' }} />
        <Screen><Alert>Syllabus tracking is not enabled for your school.</Alert></Screen>
      </>
    )
  }

  if (student && student.class_id === 0) return <Screen><ClassLoading /></Screen>

  if (status === 404 || status === 405) {
    return (
      <>
        <Stack.Screen options={{ title: 'Syllabus' }} />
        <Screen refreshing={refreshing} onRefresh={refresh}>
          <Empty icon={BookOpenCheck} title="Not available yet" hint="Your school's server doesn't have this feature yet." />
        </Screen>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Syllabus' }} />
        <Screen refreshing={refreshing} onRefresh={refresh}>
          <Alert>{error}</Alert>
        </Screen>
      </>
    )
  }

  if (loading || !data || !student) {
    return (
      <>
        <Stack.Screen options={{ title: 'Syllabus' }} />
        <Screen><Loading /></Screen>
      </>
    )
  }

  // subjects with topics first; API order (by name) is kept within each group
  const subjects = [...data.subjects].sort((a, b) => Number(b.total > 0) - Number(a.total > 0))

  return (
    <>
      <Stack.Screen options={{ title: 'Syllabus' }} />
      <Screen refreshing={refreshing} onRefresh={refresh} testID="syllabus-screen">
        {subjects.every(s => s.total === 0) ? (
          <Empty icon={BookOpenCheck} title="Syllabus not added yet" hint={`Topics appear here as ${student.name.split(' ')[0]}'s teachers mark them taught.`} />
        ) : (
          <View className="gap-4">
            {subjects.map(s => {
              const isOpen = open === s.subject
              return (
                <Panel key={s.subject} className="overflow-hidden">
                  <Pressable
                    onPress={() => setOpen(isOpen ? null : s.subject)}
                    disabled={s.total === 0}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen, disabled: s.total === 0 }}
                    testID={`syllabus-subject-${s.subject.replace(/\W/g, '')}`}
                    className={`p-3.5 ${s.total === 0 ? 'opacity-60' : ''}`}
                  >
                    <View className="flex-row items-center gap-2">
                      <Text className="flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>{s.subject}</Text>
                      {s.total > 0 && <Text className="text-xs font-semibold text-teal-700">{s.completion_pct}%</Text>}
                      {s.total > 0 && (
                        <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
                          <ChevronDown size={16} color="#6b7280" />
                        </View>
                      )}
                    </View>
                    <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <View className="h-full rounded-full bg-teal-500" style={{ width: `${s.completion_pct}%` }} />
                    </View>
                    <Text className="mt-1.5 text-[11px] text-muted-foreground">
                      {s.total > 0 ? `${s.covered} of ${s.total} topics taught` : 'Syllabus not added yet'}
                    </Text>
                  </Pressable>

                  {isOpen && (
                    <View className="border-t border-border">
                      {s.chapters.map((c, i) => (
                        <View key={c.school_chapter_id}>
                          {i > 0 && <Divider />}
                          <View className="px-4 py-3" testID={`syllabus-chapter-${c.school_chapter_id}`}>
                            <View className="flex-row items-baseline justify-between gap-2">
                              <Text className="flex-1 text-sm font-medium text-foreground">{c.chapter_name}</Text>
                              <Text className="text-[11px] text-muted-foreground">{c.covered}/{c.total}</Text>
                            </View>
                            <View className="mt-2 gap-1.5">
                              {c.topics.map(t => t.status === 'covered' ? (
                                <View key={t.id} className="flex-row items-start gap-2">
                                  <CheckCircle2 size={14} color="#10b981" style={{ marginTop: 2 }} />
                                  <Text className="flex-1 text-xs text-foreground">{t.topic_name}</Text>
                                  <Text className="text-[11px] text-muted-foreground">{t.covered_date ? day(t.covered_date) : 'Taught'}</Text>
                                </View>
                              ) : (
                                <View key={t.id} className="flex-row items-start gap-2">
                                  <Circle size={14} color="#9ca3af" style={{ opacity: 0.4, marginTop: 2 }} />
                                  <Text className="flex-1 text-xs text-muted-foreground">{t.topic_name}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </Panel>
              )
            })}
          </View>
        )}
      </Screen>
    </>
  )
}
