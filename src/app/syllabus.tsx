import { ClassLoading } from '@/components/class-loading'
import { Fragment, useState } from 'react'
import { View, Pressable } from 'react-native'
import { Stack } from 'expo-router'
import { BookOpenCheck, CheckCircle2, Circle, ChevronDown } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { type ClassSubject, type Syllabus, day } from '@/lib/api'
import { useApi } from '@/lib/use-api'
import { Screen, Alert, Empty, Panel, Divider, Bar, ErrorState, ScreenSkeleton, FadeInView, Segmented, useColors, Text } from '@/components/ui'
import { useT } from '@/lib/i18n'

export default function SyllabusScreen() {
  const { student, has } = useSession()
  const enabled = has('curriculum')
  const t = useT()
  const c = useColors()
  const [open, setOpen] = useState<string | null>(null)
  // subject name -> semester label currently selected for that subject's own tabs.
  const [semesterBySubject, setSemesterBySubject] = useState<Record<string, string>>({})

  const { data, error, loading, refreshing, refresh, status } = useApi<Syllabus>(
    student && student.class_id > 0 && enabled ? `/api/syllabus?school_id=${student.school_id}&class_id=${student.class_id}` : null
  )
  // Separate fetch, same as the web — who teaches each subject, looked up by name when rendering.
  const { data: subjectsData } = useApi<{ subjects: ClassSubject[] }>(student && enabled ? `/api/parent/subjects?student_id=${student.id}` : null)
  const teacherOf = Object.fromEntries((subjectsData?.subjects ?? []).filter(s => s.teacher_name).map(s => [s.subject_name, s.teacher_name as string]))

  const title = <Stack.Screen options={{ title: t.screenTitles.syllabus }} />

  if (!enabled) {
    return <>{title}<Screen><Alert tone="info">{t.syllabus.notEnabled}</Alert></Screen></>
  }

  if (student && student.class_id === 0) return <>{title}<Screen><ClassLoading /></Screen></>

  if (status === 404 || status === 405) {
    return (
      <>
        {title}
        <Screen refreshing={refreshing} onRefresh={refresh}>
          <Empty icon={BookOpenCheck} title={t.notAvailableTitle} hint={t.notAvailableHint} />
        </Screen>
      </>
    )
  }

  if (error && !data) {
    return <>{title}<Screen refreshing={refreshing} onRefresh={refresh}><ErrorState message={error} onRetry={refresh} busy={refreshing} /></Screen></>
  }

  if (loading || !data || !student) {
    return <>{title}<Screen><ScreenSkeleton rows={5} /></Screen></>
  }

  const subjects = data.subjects

  return (
    <>
      {title}
      <Screen refreshing={refreshing} onRefresh={refresh} testID="syllabus-screen">
        {subjects.every(s => s.total === 0) ? (
          <Empty icon={BookOpenCheck} title={t.syllabus.emptyTitle} hint={t.syllabus.emptyHint(student.name.split(' ')[0])} />
        ) : (
          <View className="gap-3">
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
                    accessibilityLabel={`${s.subject}, ${s.total > 0 ? `${s.completion_pct}%, ${t.syllabus.topicsTaught(s.covered, s.total)}` : t.syllabus.emptyTitle}`}
                    testID={`syllabus-subject-${slug}`}
                    className={`gap-2 p-4 ${s.total === 0 ? 'opacity-60' : 'active:bg-muted'}`}
                  >
                    <View className="flex-row items-center gap-2">
                      <Text className="flex-1 text-[15px] font-semibold text-foreground" numberOfLines={1}>{s.subject}</Text>
                      {s.total > 0 && <Text className="text-sm font-bold text-primary">{s.completion_pct}%</Text>}
                      {s.total > 0 && (
                        <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
                          <ChevronDown size={18} color={c.mutedForeground} />
                        </View>
                      )}
                    </View>
                    {teacherOf[s.subject] && (
                      <Text className="-mt-1 text-xs text-muted-foreground">{t.syllabus.taughtBy(teacherOf[s.subject])}</Text>
                    )}
                    <Bar pct={s.completion_pct} className="bg-primary" />
                    <Text className="text-xs text-muted-foreground">
                      {s.total > 0 ? t.syllabus.topicsTaught(s.covered, s.total) : t.syllabus.emptyTitle}
                    </Text>
                  </Pressable>

                  {isOpen && (
                    <FadeInView className="border-t border-border">
                      {semesterChoices.length > 0 && (
                        <View className="px-4 pt-3">
                          <Segmented size="sm" role="button" className="self-start" value={effectiveSemester}
                            onChange={label => setSemesterBySubject(prev => ({ ...prev, [s.subject]: label }))}
                            options={semesterChoices.map((label, si) => ({ value: label, label: t.syllabus.semester(si + 1), testID: `syllabus-semester-${slug}-${label.replace(/\W/g, '')}` }))} />
                        </View>
                      )}
                      {chapters.map((ch, i) => (
                        <Fragment key={ch.school_chapter_id}>
                          {i > 0 && <Divider />}
                          <View className="gap-2.5 px-4 py-3.5" testID={`syllabus-chapter-${ch.school_chapter_id}`}>
                            <View className="flex-row items-baseline justify-between gap-2">
                              <Text className="flex-1 text-sm font-semibold text-foreground">{ch.chapter_name}</Text>
                              <Text className="text-xs font-medium text-muted-foreground">{ch.covered}/{ch.total}</Text>
                            </View>
                            <View className="gap-2">
                              {ch.topics.length === 0 && (
                                <Text className="text-sm italic text-muted-foreground">{t.syllabus.noTopicsYet}</Text>
                              )}
                              {ch.topics.map(tp => tp.status === 'covered' ? (
                                <View key={tp.id} className="flex-row items-start gap-2.5" accessible accessibilityLabel={`${tp.topic_name}, ${t.syllabus.taughtWord}`}>
                                  <CheckCircle2 size={16} color={c.success} style={{ marginTop: 1 }} />
                                  <View className="flex-1">
                                    <Text className="text-sm text-foreground">{tp.topic_name}</Text>
                                    <Text className="text-xs text-muted-foreground">
                                      {tp.covered_date ? day(tp.covered_date) : t.syllabus.taughtWord}{tp.covered_by_name ? ` · ${tp.covered_by_name}` : ''}
                                    </Text>
                                  </View>
                                </View>
                              ) : (
                                <View key={tp.id} className="flex-row items-start gap-2.5">
                                  <Circle size={16} color={c.subtle} style={{ marginTop: 1 }} />
                                  <Text className="flex-1 text-sm text-muted-foreground">{tp.topic_name}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        </Fragment>
                      ))}
                    </FadeInView>
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
