import { useState } from 'react'
import { Text, View, Pressable } from 'react-native'
import { Link, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { api, EXAM_TYPE, longDay, type MarkSheet } from '@/lib/api'
import { useApi } from '@/lib/use-api'
import { Screen, Loading, Panel, Chip, Alert, Ring, Button } from '@/components/ui'

export default function MarkSheetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { student, me } = useSession()
  const [busy, setBusy] = useState(false)
  const [ackError, setAckError] = useState('')

  const q = student ? `school_id=${student.school_id}&student_id=${student.id}&class_id=${student.class_id}` : null
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
      refresh()
    } catch (e) {
      setAckError(e instanceof Error ? e.message : 'Could not acknowledge')
    } finally {
      setBusy(false)
    }
  }

  if (error) return <Screen><Alert>{error}</Alert></Screen>
  if (loading || !student) return <Screen><Loading /></Screen>
  if (!sheet) return <Screen><Alert>This result is not available.</Alert></Screen>

  const pct = sheet.percentage === null ? null : Math.round(sheet.percentage)

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} testID="marksheet-screen">
      <Link href="/exams" asChild>
        <Pressable className="mb-2 flex-row items-center gap-1 self-start" testID="back-to-exams">
          <ArrowLeft size={16} color="#6b7280" />
          <Text className="text-sm text-muted-foreground">Results</Text>
        </Pressable>
      </Link>

      <Panel className="p-4">
        <View className="flex-row items-center gap-4">
          <Ring pct={pct} size={96} stroke={9}>
            <View className="items-center justify-center">
              <Text className="text-xl font-bold text-foreground">{pct === null ? '—' : `${pct}%`}</Text>
              {sheet.grade && <Text className="text-[11px] text-muted-foreground">Grade {sheet.grade}</Text>}
            </View>
          </Ring>
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground">{sheet.exam_name}</Text>
            <Text className="text-xs text-muted-foreground">{EXAM_TYPE[sheet.exam_type] ?? sheet.exam_type} · {longDay(sheet.exam_date)}</Text>
            <Text className="mt-1 text-sm text-foreground">
              {sheet.total_obtained !== null ? <Text><Text className="font-semibold">{sheet.total_obtained}</Text> / {sheet.total_max} marks</Text> : 'Some marks not entered yet'}
            </Text>
            <View className="mt-1.5 flex-row flex-wrap gap-1.5">
              {sheet.pass !== null && (sheet.pass ? <Chip tone="green">Passed</Chip> : <Chip tone="red">Below pass mark</Chip>)}
              <Chip>Pass mark {sheet.passing_pct}%</Chip>
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
                    <Chip tone="muted">Absent</Chip>
                  ) : (
                    <Text className="text-sm text-foreground">
                      <Text className="font-semibold">{s.marks_obtained ?? '—'}</Text>
                      <Text className="text-muted-foreground"> / {s.max_marks}</Text>
                    </Text>
                  )}
                  {s.grade && <Chip tone={s.pass === false ? 'red' : 'teal'}>{s.grade}</Chip>}
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
            <Text className="text-sm font-semibold text-foreground">Class teacher&apos;s remarks</Text>
            {sheet.remarks.conduct && <Chip tone="teal">Conduct: {sheet.remarks.conduct}</Chip>}
          </View>
          <View className="gap-2">
             {sheet.remarks.class_teacher_remark && (
               <View className="rounded-xl bg-muted/60 px-3 py-2">
                 <Text className="text-sm italic text-foreground">&ldquo;{sheet.remarks.class_teacher_remark}&rdquo;</Text>
               </View>
             )}
             {sheet.remarks.attendance_remark && (
               <Text className="text-xs text-foreground"><Text className="font-medium">Attendance: </Text><Text className="text-muted-foreground">{sheet.remarks.attendance_remark}</Text></Text>
             )}
             {sheet.remarks.next_term_advice && (
               <Text className="text-xs text-foreground"><Text className="font-medium">Next term: </Text><Text className="text-muted-foreground">{sheet.remarks.next_term_advice}</Text></Text>
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
              <Text className="text-sm font-medium text-foreground">Acknowledged</Text>
              <Text className="text-xs text-muted-foreground">
                by {sheet.parent_ack_name ?? me?.name ?? 'you'}
                {sheet.parent_ack_at ? ` on ${longDay(sheet.parent_ack_at)}` : ''}
              </Text>
            </View>
          </View>
        ) : (
          <View>
            <Text className="text-sm font-medium text-foreground">Please acknowledge this result</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">
              This tells the class teacher you have seen {student.name.split(' ')[0]}&apos;s marks.
            </Text>
            <View className="mt-3">
              <Button
                label={busy ? 'Saving...' : 'I have seen this result'}
                onPress={acknowledge}
                loading={busy}
                disabled={busy}
                testID={`acknowledge-${sheet.exam_id}`}
              />
            </View>
          </View>
        )}
      </Panel>
    </Screen>
  )
}