import { ClassLoading } from '@/components/class-loading'
import { useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import { Link, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { api, longDay, type MarkSheet } from '@/lib/api'
import { useApi } from '@/lib/use-api'
import { Screen, Loading, Panel, Chip, Alert, Ring, Button } from '@/components/ui'
import { useT } from '@/lib/i18n'

export default function MarkSheetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { student, me } = useSession()
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [ackError, setAckError] = useState('')

  const q = student && student.class_id > 0 ? `school_id=${student.school_id}&student_id=${student.id}&class_id=${student.class_id}` : null
  const { data: sheets, loading, error, refresh, refreshing } = useApi<MarkSheet[]>(student && q ? `/api/students/${student.id}/exams?${q}` : null)

  const sheet = sheets?.find(s => s.exam_id === Number(id))

  async function acknowledge() {
    if (!student || !sheet) return
    setBusy(true)
    setAckError('')
    try {
      await api(`/api/exams/${id}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({ student_id: student.id, school_id: student.school_id })
      })
      setConfirming(false)
      refresh()
    } catch (e) {
      setAckError(e instanceof Error ? e.message : t.examDetail.ackError)
    } finally {
      setBusy(false)
    }
  }

  if (student && student.class_id === 0) return <Screen><ClassLoading /></Screen>

  if (error) return <Screen><Alert>{error}</Alert></Screen>
  if (loading || !student) return <Screen><Loading /></Screen>
  if (!sheet) return <Screen><Alert>{t.examDetail.notAvailable}</Alert></Screen>

  const pct = sheet.percentage === null ? null : Math.round(sheet.percentage)

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} testID="marksheet-screen">
      <Link href={{ pathname: '/exams', params: { tab: 'results' } }} asChild>
        <Pressable className="mb-2 flex-row items-center gap-1 self-start" testID="back-to-exams" accessibilityRole="link">
          <ArrowLeft size={16} color="#6b7280" />
          <Text className="text-sm text-muted-foreground">{t.examDetail.backToResults}</Text>
        </Pressable>
      </Link>

      <Panel className="p-4">
        <View className="flex-row items-center gap-4">
          <Ring pct={pct} size={96} stroke={9}>
            <View className="items-center justify-center">
              <Text className="text-xl font-bold text-foreground">{pct === null ? '—' : `${pct}%`}</Text>
              {sheet.grade && <Text className="text-[11px] text-muted-foreground">{t.exams.gradeChip(sheet.grade)}</Text>}
            </View>
          </Ring>
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground">{sheet.exam_name}</Text>
            <Text className="text-xs text-muted-foreground">{t.examType[sheet.exam_type] ?? sheet.exam_type} · {longDay(sheet.exam_date)}</Text>
            <Text className="mt-1 text-sm text-foreground">
              {sheet.total_obtained !== null ? <Text><Text className="font-semibold">{sheet.total_obtained}</Text> / {sheet.total_max} {t.examDetail.marksWord}</Text> : t.examDetail.someMarksNotEntered}
            </Text>
            <View className="mt-1.5 flex-row flex-wrap gap-1.5">
              {sheet.pass !== null && (sheet.pass ? <Chip tone="green">{t.examDetail.passed}</Chip> : <Chip tone="red">{t.examDetail.belowPassMark}</Chip>)}
              <Chip>{t.examDetail.passMark(sheet.passing_pct)}</Chip>
            </View>
          </View>
        </View>
      </Panel>

      <Panel className="overflow-hidden">
        {sheet.subjects.map((s, i) => {
          const p = s.percentage === null ? null : Math.round(s.percentage)
          const border = i > 0 ? 'border-t border-black/5' : ''
          return (
            <View key={s.subject_name} className={`px-4 py-3 ${border}`} testID={`subject-${s.subject_name.replace(/\W/g, '')}`}>
              <View className="flex-row items-center justify-between gap-2">
                <Text className="text-sm font-medium text-foreground">{s.subject_name}</Text>
                <View className="flex-row items-center gap-2">
                  {s.is_absent ? (
                    <Chip tone="muted">{t.absent}</Chip>
                  ) : (
                    <Text className="text-sm text-foreground">
                      <Text className="font-semibold">{s.marks_obtained ?? '—'}</Text>
                      <Text className="text-muted-foreground"> / {s.max_marks}</Text>
                    </Text>
                  )}
                  {s.grade && <Chip tone={s.pass === false ? 'red' : 'teal'}>{s.grade}</Chip>}
                  {s.pass !== null && <Chip tone={s.pass ? 'green' : 'red'}>{s.pass ? t.examDetail.pass : t.examDetail.fail}</Chip>}
                </View>
              </View>
              <View className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <View
                  className={`h-full rounded-full ${s.pass === false ? 'bg-rose-500' : (p ?? 0) >= 75 ? 'bg-emerald-500' : 'bg-teal-500'}`}
                  style={{ width: `${p ?? 0}%` }}
                />
              </View>
            </View>
          )
        })}
      </Panel>

      {sheet.remarks && (sheet.remarks.class_teacher_remark || sheet.remarks.attendance_remark || sheet.remarks.next_term_advice) && (
        <Panel className="p-4" testID="marksheet-remarks">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-foreground">{t.examDetail.teacherRemarksTitle}</Text>
            {sheet.remarks.conduct && <Chip tone="teal">{t.examDetail.conductChip(sheet.remarks.conduct)}</Chip>}
          </View>
          <View className="gap-2">
             {sheet.remarks.class_teacher_remark && (
               <View className="rounded-xl bg-muted/60 px-3 py-2">
                 <Text className="text-sm italic text-foreground">&ldquo;{sheet.remarks.class_teacher_remark}&rdquo;</Text>
               </View>
             )}
             {sheet.remarks.attendance_remark && (
               <Text className="text-xs text-foreground"><Text className="font-medium">{t.examDetail.attendanceLabel}</Text><Text className="text-muted-foreground">{sheet.remarks.attendance_remark}</Text></Text>
             )}
             {sheet.remarks.next_term_advice && (
               <Text className="text-xs text-foreground"><Text className="font-medium">{t.examDetail.nextTermLabel}</Text><Text className="text-muted-foreground">{sheet.remarks.next_term_advice}</Text></Text>
             )}
          </View>
        </Panel>
      )}

      <Panel className="p-4">
        {ackError ? <View className="mb-3"><Alert>{ackError}</Alert></View> : null}
        {sheet.parent_acknowledged ? (
          <View className="flex-row items-center gap-3">
            <CheckCircle2 size={20} color="#10b981" />
            <View>
              <Text className="text-sm font-medium text-foreground">{t.acknowledged}</Text>
              <Text className="text-xs text-muted-foreground">
                {t.examDetail.byName(sheet.parent_ack_name ?? me?.name ?? t.examDetail.you)}
                {sheet.parent_ack_at ? t.examDetail.onDate(longDay(sheet.parent_ack_at)) : ''}
              </Text>
            </View>
          </View>
        ) : (
          <View>
            <Text className="text-sm font-medium text-foreground">{t.examDetail.pleaseAcknowledge}</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">
              {t.examDetail.tellsTeacher(student.name.split(' ')[0])}
            </Text>
            {/* Confirm before signing off: it notifies the class teacher and cannot be undone. */}
            {confirming ? (
              <View className="mt-3 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label={busy ? t.saving : t.examDetail.confirm}
                    onPress={acknowledge}
                    loading={busy}
                    disabled={busy}
                    testID={`acknowledge-confirm-${sheet.exam_id}`}
                  />
                </View>
                <Button
                  label={t.cancel}
                  variant="outline"
                  onPress={() => { setConfirming(false); setAckError('') }}
                  disabled={busy}
                  testID={`acknowledge-cancel-${sheet.exam_id}`}
                />
              </View>
            ) : (
              <View className="mt-3">
                <Button
                  label={t.examDetail.iHaveSeen}
                  onPress={() => setConfirming(true)}
                  testID={`acknowledge-${sheet.exam_id}`}
                />
              </View>
            )}
          </View>
        )}
      </Panel>
    </Screen>
  )
}