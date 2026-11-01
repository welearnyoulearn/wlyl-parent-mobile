import { ClassLoading } from '@/components/class-loading'
import { Fragment, useState } from 'react'
import { View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { CheckCircle2, FileQuestion, MessageSquareQuote } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { api, longDay, type MarkSheet } from '@/lib/api'
import { useApi } from '@/lib/use-api'
import { Screen, Panel, Chip, Alert, Ring, Button, Bar, Divider, Empty, ErrorState, ScreenSkeleton, IconTile, scoreBarClass, haptic, useColors, Text } from '@/components/ui'
import { useT } from '@/lib/i18n'

export default function MarkSheetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { student, me } = useSession()
  const t = useT()
  const c = useColors()
  const [busy, setBusy] = useState(false)
  const [ackError, setAckError] = useState('')
  const [confirming, setConfirming] = useState(false)

  const q = student && student.class_id > 0 ? `school_id=${student.school_id}&student_id=${student.id}&class_id=${student.class_id}` : null
  const { data: sheets, loading, error, refresh, refreshing } = useApi<MarkSheet[]>(student && q ? `/api/students/${student.id}/exams?${q}` : null)

  const sheet = sheets?.find(s => s.exam_id === Number(id))
  const title = <Stack.Screen options={{ title: t.examDetail.title }} />

  async function acknowledge() {
    if (!student || !sheet || busy) return
    setBusy(true)
    setAckError('')
    try {
      await api(`/api/exams/${id}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({ student_id: student.id, school_id: student.school_id })
      })
      haptic.success()
      setConfirming(false)
      refresh()
    } catch (e) {
      setAckError(e instanceof Error ? e.message : t.examDetail.ackError)
    } finally {
      setBusy(false)
    }
  }

  if (student && student.class_id === 0) return <>{title}<Screen><ClassLoading /></Screen></>

  if (error && !sheets) return <>{title}<Screen refreshing={refreshing} onRefresh={refresh}><ErrorState message={error} onRetry={refresh} busy={refreshing} /></Screen></>
  if (loading || !student) return <>{title}<Screen><ScreenSkeleton rows={5} /></Screen></>
  if (!sheet) return <>{title}<Screen><Empty icon={FileQuestion} title={t.examDetail.notAvailable} /></Screen></>

  const pct = sheet.percentage === null ? null : Math.round(sheet.percentage)

  return (
    <>
      {title}
      <Screen refreshing={refreshing} onRefresh={refresh} testID="marksheet-screen">
        <Panel className="gap-4 p-5">
          <View className="flex-row items-center gap-5">
            <Ring pct={pct} size={104} stroke={10} failed={sheet.pass === false}>
              <View className="items-center justify-center">
                <Text className="text-2xl font-bold tracking-tight text-foreground">{pct === null ? '—' : `${pct}%`}</Text>
                {sheet.grade && <Text className="text-xs font-medium text-muted-foreground">{t.exams.gradeChip(sheet.grade)}</Text>}
              </View>
            </Ring>
            <View className="flex-1 gap-1">
              <Text accessibilityRole="header" className="text-lg font-bold leading-6 tracking-tight text-foreground">{sheet.exam_name}</Text>
              <Text className="text-xs text-muted-foreground">{t.examType[sheet.exam_type] ?? sheet.exam_type} · {longDay(sheet.exam_date)}</Text>
              <Text className="mt-1 text-sm text-foreground">
                {sheet.total_obtained !== null ? <Text><Text className="font-bold">{sheet.total_obtained}</Text> / {sheet.total_max} {t.examDetail.marksWord}</Text> : t.examDetail.someMarksNotEntered}
              </Text>
            </View>
          </View>
          <View className="flex-row flex-wrap gap-1.5">
            {sheet.pass !== null && (sheet.pass ? <Chip tone="green">{t.examDetail.passed}</Chip> : <Chip tone="red">{t.examDetail.belowPassMark}</Chip>)}
            <Chip>{t.examDetail.passMark(sheet.passing_pct)}</Chip>
          </View>
        </Panel>

        <Panel className="overflow-hidden">
          {sheet.subjects.map((s, i) => {
            const p = s.percentage === null ? null : Math.round(s.percentage)
            return (
              <Fragment key={s.subject_name}>
                {i > 0 && <Divider />}
                <View className="gap-2 px-4 py-3.5" testID={`subject-${s.subject_name.replace(/\W/g, '')}`}>
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="flex-1 text-[15px] font-medium text-foreground">{s.subject_name}</Text>
                    <View className="flex-row items-center gap-2">
                      {s.is_absent ? (
                        <Chip tone="muted">{t.absent}</Chip>
                      ) : (
                        <Text className="text-[15px] text-foreground">
                          <Text className="font-bold">{s.marks_obtained ?? '—'}</Text>
                          <Text className="text-muted-foreground"> / {s.max_marks}</Text>
                        </Text>
                      )}
                      {s.grade && <Chip tone={s.pass === false ? 'red' : 'teal'}>{s.grade}</Chip>}
                      {s.pass !== null && <Chip tone={s.pass ? 'green' : 'red'}>{s.pass ? t.examDetail.pass : t.examDetail.fail}</Chip>}
                    </View>
                  </View>
                  <Bar pct={p ?? 0} className={scoreBarClass(p, s.pass === false)} label={s.subject_name} />
                </View>
              </Fragment>
            )
          })}
        </Panel>

        {sheet.remarks && (sheet.remarks.class_teacher_remark || sheet.remarks.attendance_remark || sheet.remarks.next_term_advice) && (
          <Panel className="gap-3 p-4" testID="marksheet-remarks">
            <View className="flex-row items-center gap-3">
              <IconTile icon={MessageSquareQuote} tone="violet" size="sm" />
              <Text className="flex-1 text-[15px] font-semibold text-foreground">{t.examDetail.teacherRemarksTitle}</Text>
              {sheet.remarks.conduct && <Chip tone="teal">{t.examDetail.conductChip(sheet.remarks.conduct)}</Chip>}
            </View>
            {sheet.remarks.class_teacher_remark && (
              <View className="rounded-2xl border-l-4 border-accent bg-accent-soft px-4 py-3">
                <Text className="text-sm italic leading-5 text-foreground">&ldquo;{sheet.remarks.class_teacher_remark}&rdquo;</Text>
              </View>
            )}
            {sheet.remarks.attendance_remark && (
              <Text className="text-sm leading-5 text-foreground"><Text className="font-semibold">{t.examDetail.attendanceLabel}</Text><Text className="text-muted-foreground">{sheet.remarks.attendance_remark}</Text></Text>
            )}
            {sheet.remarks.next_term_advice && (
              <Text className="text-sm leading-5 text-foreground"><Text className="font-semibold">{t.examDetail.nextTermLabel}</Text><Text className="text-muted-foreground">{sheet.remarks.next_term_advice}</Text></Text>
            )}
          </Panel>
        )}

        <Panel className={`p-4 ${sheet.parent_acknowledged ? '' : 'border-warning-border bg-warning-soft'}`}>
          {ackError ? <View className="mb-3"><Alert>{ackError}</Alert></View> : null}
          {sheet.parent_acknowledged ? (
            <View className="flex-row items-center gap-3" accessibilityLiveRegion="polite">
              <View className="size-10 items-center justify-center rounded-full bg-success-soft">
                <CheckCircle2 size={22} color={c.success} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-foreground">{t.acknowledged}</Text>
                <Text className="text-xs text-muted-foreground">
                  {t.examDetail.byName(sheet.parent_ack_name ?? me?.name ?? t.examDetail.you)}
                  {sheet.parent_ack_at ? t.examDetail.onDate(longDay(sheet.parent_ack_at)) : ''}
                </Text>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              <View className="gap-1">
                <Text className="text-[15px] font-semibold text-foreground">{t.examDetail.pleaseAcknowledge}</Text>
                <Text className="text-sm leading-5 text-muted-foreground">
                  {t.examDetail.tellsTeacher(student.name.split(' ')[0])}
                </Text>
              </View>
              {/* Confirm before signing off: it notifies the class teacher and cannot be undone. */}
              {confirming ? (
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button label={busy ? t.saving : t.examDetail.confirm} icon={CheckCircle2} onPress={acknowledge} loading={busy}
                      testID={`acknowledge-confirm-${sheet.exam_id}`} />
                  </View>
                  <Button label={t.cancel} variant="outline" onPress={() => { setConfirming(false); setAckError('') }} disabled={busy}
                    testID={`acknowledge-cancel-${sheet.exam_id}`} />
                </View>
              ) : (
                <Button label={t.examDetail.iHaveSeen} icon={CheckCircle2} onPress={() => { haptic.tap(); setConfirming(true) }} testID={`acknowledge-${sheet.exam_id}`} />
              )}
            </View>
          )}
        </Panel>
      </Screen>
    </>
  )
}
