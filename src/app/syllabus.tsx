import { ClassLoading } from '@/components/class-loading'
import { useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import { Stack } from 'expo-router'
import { BookOpenCheck, CheckCircle2, Circle, ChevronDown } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { type ClassSubject, type Syllabus, day } from '@/lib/api'
import { useApi } from '@/lib/use-api'
import { Screen, Loading, Alert, Empty, Panel, Divider } from '@/components/ui'
import { useT } from '@/lib/i18n'

export default function SyllabusScreen() {
  const { student, has } = useSession()
  const enabled = has('curriculum')
  const t = useT()
  const [open, setOpen] = useState<string | null>(null)
  // subject name -> semester label currently selected for that subject's own tabs.
  const [semesterBySubject, setSemesterBySubject] = useState<Record<string, string>>({})

  const { data, error, loading, refreshing, refresh, status } = useApi<Syllabus>(
    student && student.class_id > 0 && enabled ? `/api/syllabus?school_id=${student.school_id}&class_id=${student.class_id}` : null
  )
  // Separate fetch, same as the web — who teaches each subject, looked up by name when rendering.
  const { data: subjectsData } = useApi<{ subjects: ClassSubject[] }>(student && enabled ? `/api/parent/subjects?student_id=${student.id}` : null)
  const teacherOf = Object.fromEntries((subjectsData?.subjects ?? []).filter(s => s.teacher_name).map(s => [s.subject_name, s.teacher_name as string]))

  if (!enabled) {
    return (
      <>
        <Stack.Screen options={{ title: t.screenTitles.syllabus }} />
        <Screen><Alert>{t.syllabus.notEnabled}</Alert></Screen>
      </>
    )
  }

  if (student && student.class_id === 0) return <Screen><ClassLoading /></Screen>

  if (status === 404 || status === 405) {
    return (
      <>
        <Stack.Screen options={{ title: t.screenTitles.syllabus }} />
        <Screen refreshing={refreshing} onRefresh={refresh}>
          <Empty icon={BookOpenCheck} title={t.notAvailableTitle} hint={t.notAvailableHint} />
        </Screen>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: t.screenTitles.syllabus }} />
        <Screen refreshing={refreshing} onRefresh={refresh}>
          <Alert>{error}</Alert>
        </Screen>
      </>
    )
  }

  if (loading || !data || !student) {
    return (
      <>
        <Stack.Screen options={{ title: t.screenTitles.syllabus }} />
        <Screen><Loading /></Screen>
      </>
    )
  }

  const subjects = data.subjects

  return (
    <>
      <Stack.Screen options={{ title: t.screenTitles.syllabus }} />
      <Screen refreshing={refreshing} onRefresh={refresh} testID="syllabus-screen">
        {subjects.every(s => s.total === 0) ? (
          <Empty icon={BookOpenCheck} title={t.syllabus.emptyTitle} hint={t.syllabus.emptyHint(student.name.split(' ')[0])} />
        ) : (
          <View className="gap-4">
            {subjects.map(s => {
              const isOpen = open === s.subject
              const slug = s.subject.replace(/\W/g, '')
              // This subject's own Semester 1/2/... tabs — only shown when the teacher's
              // Setup screen actually ran in Semester Wise mode, same as the web.
              const semesterChoices = s.semester_mode && s.semester_count
                ? Array.from({ length: s.semester_count }, (_, i) => `Semester ${i + 1}`)
                : []
              const selectedSemester = semesterBySubject[s.subject]
              const effectiveSemester = selectedSemester && semesterChoices.includes(selectedSemester)
                ? selectedSemester
                : (semesterChoices[0] || '')
              const chapters = semesterChoices.length > 0
                ? s.chapters.filter(c => c.class_semester_label === effectiveSemester)
                : s.chapters
              return (
                <Panel key={s.subject} className="overflow-hidden">
                  <Pressable
                    onPress={() => setOpen(isOpen ? null : s.subject)}
                    disabled={s.total === 0}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen, disabled: s.total === 0 }}
                    testID={`syllabus-subject-${slug}`}
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
                    {teacherOf[s.subject] && (
                      <Text className="mt-1 text-[11px] text-muted-foreground">{t.syllabus.taughtBy(teacherOf[s.subject])}</Text>
                    )}
                    <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <View className="h-full rounded-full bg-teal-500" style={{ width: `${s.completion_pct}%` }} />
                    </View>
                    <Text className="mt-1.5 text-[11px] text-muted-foreground">
                      {s.total > 0 ? t.syllabus.topicsTaught(s.covered, s.total) : t.syllabus.emptyTitle}
                    </Text>
                  </Pressable>

                  {isOpen && (
                    <View className="border-t border-border">
                      {semesterChoices.length > 0 && (
                        <View className="flex-row gap-2 px-4 pt-3">
                          {semesterChoices.map((label, si) => (
                            <Pressable
                              key={label}
                              onPress={() => setSemesterBySubject(prev => ({ ...prev, [s.subject]: label }))}
                              accessibilityRole="button"
                              accessibilityState={{ selected: label === effectiveSemester }}
                              testID={`syllabus-semester-${slug}-${label.replace(/\W/g, '')}`}
                              className={`rounded-full px-3 py-1 ${label === effectiveSemester ? 'bg-primary' : 'bg-muted'}`}
                            >
                              <Text className={`text-xs font-medium ${label === effectiveSemester ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{t.syllabus.semester(si + 1)}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                      {chapters.map((c, i) => (
                        <View key={c.school_chapter_id}>
                          {i > 0 && <Divider />}
                          <View className="px-4 py-3" testID={`syllabus-chapter-${c.school_chapter_id}`}>
                            <View className="flex-row items-baseline justify-between gap-2">
                              <Text className="flex-1 text-sm font-medium text-foreground">{c.chapter_name}</Text>
                              <Text className="text-[11px] text-muted-foreground">{c.covered}/{c.total}</Text>
                            </View>
                            <View className="mt-2 gap-1.5">
                              {c.topics.length === 0 && (
                                <Text className="text-xs italic text-muted-foreground">{t.syllabus.noTopicsYet}</Text>
                              )}
                              {c.topics.map(tp => tp.status === 'covered' ? (
                                <View key={tp.id} className="flex-row items-start gap-2">
                                  <CheckCircle2 size={14} color="#10b981" style={{ marginTop: 2 }} />
                                  <Text className="flex-1 text-xs text-foreground">{tp.topic_name}</Text>
                                  <Text className="text-[11px] text-muted-foreground">
                                    {tp.covered_date ? day(tp.covered_date) : t.syllabus.taughtWord}{tp.covered_by_name ? ` · ${tp.covered_by_name}` : ''}
                                  </Text>
                                </View>
                              ) : (
                                <View key={tp.id} className="flex-row items-start gap-2">
                                  <Circle size={14} color="#9ca3af" style={{ opacity: 0.4, marginTop: 2 }} />
                                  <Text className="flex-1 text-xs text-muted-foreground">{tp.topic_name}</Text>
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
