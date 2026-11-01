import { Fragment, useState, type ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { Stack } from 'expo-router'
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { REPORT_MAX_DAYS_BACK, istDay, shiftDate, type DailyReport, type QuizDayStatus } from '@/lib/api'
import { Screen, Panel, Section, Divider, Chip, ErrorState, ScreenSkeleton, Empty, FadeInView, haptic, toneClasses, type Tone, Text, useColors } from '@/components/ui'
import { useT } from '@/lib/i18n'

// The child's school day in one place (#450), like the web's Daily Report: attendance,
// the Daily Quiz done or not (never points or rank), doubts still open, topics taught.
// Sections the school hasn't switched on come back null and are left out.

const QUIZ_TONE: Record<QuizDayStatus, Tone> = {
  completed: 'green', completed_late: 'green', in_progress: 'amber', not_started: 'amber', missed: 'red', not_open_yet: 'muted', no_quiz: 'muted',
}
const ATTENDANCE_TONE: Record<string, Tone> = { present: 'green', late: 'amber', absent: 'red', not_marked: 'muted' }

// One line of the day: what, and how it went (coloured only when it matters).
function Line({ label, value, tone, testID, children, onPress }: { label: string; value: string; tone: Tone; testID: string; children?: ReactNode; onPress?: () => void }) {
  const fg = tone === 'muted' ? 'text-foreground' : toneClasses(tone).fg
  return (
    <Pressable onPress={onPress} disabled={!onPress} testID={testID} accessibilityRole={onPress ? 'button' : 'text'}
      className="min-h-14 flex-row items-start gap-3 px-4 py-3 active:bg-muted">
      <Text className="w-28 pt-0.5 text-[15px] text-muted-foreground">{label}</Text>
      <View className="flex-1 gap-0.5">
        <Text className={`text-[15px] font-semibold ${fg}`}>{value}</Text>
        {children}
      </View>
    </Pressable>
  )
}

export default function DailyReportScreen() {
  const { student } = useSession()
  const t = useT()
  const c = useColors()
  // null = today (the platform decides "today" in India time).
  const [date, setDate] = useState<string | null>(null)
  const { data: report, error, refreshing, refresh } = useApi<DailyReport>(
    student ? `/api/parent/daily-report?student_id=${student.id}${date ? `&date=${date}` : ''}` : null
  )
  const first = student?.name.split(' ')[0] ?? ''
  const title = <Stack.Screen options={{ title: t.screenTitles.dailyReport }} />

  if (error && !report) return <>{title}<Screen refreshing={refreshing} onRefresh={refresh}><ErrorState message={error} onRetry={refresh} busy={refreshing} /></Screen></>
  if (!report) return <>{title}<Screen><ScreenSkeleton rows={3} /></Screen></>

  const shown = report.date
  const today = report.today
  const canBack = shown > shiftDate(today, -REPORT_MAX_DAYS_BACK)
  const canForward = shown < today
  const label = shown === today ? t.dailyReport.today : shown === shiftDate(today, -1) ? t.dailyReport.yesterday : istDay(shown)
  const go = (days: number) => { haptic.select(); setDate(shiftDate(shown, days)) }
  const openDoubts = report.doubts ? report.doubts.waiting + report.doubts.answered : 0
  const empty = !report.attendance && !report.quiz && !report.doubts && !report.taught

  return (
    <>
      {title}
      <Screen refreshing={refreshing} onRefresh={refresh} testID="daily-report-screen">
        <View className="gap-4">
          <Text className="text-[15px] leading-5 text-muted-foreground">{t.dailyReport.subtitle(first)}</Text>
          {/* Day stepper: back up to 30 days, never past today. */}
          <View className="flex-row items-center gap-2" accessibilityRole="adjustable"
            accessibilityLabel={label} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'increment' && canForward) go(1); if (e.nativeEvent.actionName === 'decrement' && canBack) go(-1) }}>
            <Pressable onPress={() => go(-1)} disabled={!canBack} testID="daily-report-prev" accessibilityRole="button" accessibilityLabel={t.dailyReport.prevDay}
              className={`size-11 items-center justify-center rounded-2xl ${canBack ? 'active:bg-muted' : 'opacity-30'}`}>
              <ChevronLeft size={22} color={c.foreground} />
            </Pressable>
            <Text className="flex-1 text-center text-[17px] font-semibold text-foreground" testID="daily-report-date" accessibilityLiveRegion="polite">{label}</Text>
            <Pressable onPress={() => go(1)} disabled={!canForward} testID="daily-report-next" accessibilityRole="button" accessibilityLabel={t.dailyReport.nextDay}
              className={`size-11 items-center justify-center rounded-2xl ${canForward ? 'active:bg-muted' : 'opacity-30'}`}>
              <ChevronRight size={22} color={c.foreground} />
            </Pressable>
          </View>
        </View>

        {empty ? <Empty icon={CalendarCheck} title={t.dailyReport.nothing} /> : (
          <FadeInView key={shown} className={`gap-7 ${refreshing ? 'opacity-60' : ''}`}>
            <Panel className="overflow-hidden">
              {report.attendance && (
                <Line label={t.dailyReport.attendance} value={t.dailyReport.attendanceWord[report.attendance] ?? report.attendance}
                  tone={ATTENDANCE_TONE[report.attendance] ?? 'muted'} testID="daily-report-attendance" />
              )}
              {report.quiz && (
                <>
                  {report.attendance && <Divider />}
                  <Line label={t.dailyReport.quiz} value={t.quiz.status[report.quiz.status]} tone={QUIZ_TONE[report.quiz.status]} testID="daily-report-quiz">
                    {report.quiz.status === 'missed' && <Text className="text-[13px] text-danger">{t.dailyReport.lateHint}</Text>}
                    {report.quiz.subjects.length > 0 && <Text className="text-[13px] text-muted-foreground">{report.quiz.subjects.join(' · ')}</Text>}
                  </Line>
                </>
              )}
              {report.doubts && (
                <>
                  {(report.attendance || report.quiz) && <Divider />}
                  <Line label={t.dailyReport.doubts} value={openDoubts === 0 ? t.dailyReport.doubtsNone : t.dailyReport.doubtsOpen(openDoubts)}
                    tone={openDoubts === 0 ? 'green' : 'amber'} testID="daily-report-doubts">
                    {report.doubts.waiting > 0 && <Text className="text-[13px] text-muted-foreground">{t.dailyReport.doubtsWaiting(report.doubts.waiting)}</Text>}
                    {report.doubts.answered > 0 && <Text className="text-[13px] text-muted-foreground">{t.dailyReport.doubtsAnswered(report.doubts.answered, first)}</Text>}
                  </Line>
                </>
              )}
            </Panel>

            {report.quizWeek && report.quizWeek.length > 0 && (
              <Section title={t.dailyReport.quizWeek(report.quizWeek.length)}>
                <Panel className="flex-row px-1 py-3" testID="daily-report-quiz-week">
                  {report.quizWeek.map(d => {
                    const tone = QUIZ_TONE[d.status]
                    const dot = tone === 'green' ? 'bg-success-graphic' : tone === 'amber' ? 'bg-warning-graphic' : tone === 'red' ? 'bg-danger-graphic' : 'border border-input'
                    return (
                      <View key={d.date} className="flex-1 items-center gap-1.5" testID={`daily-report-quiz-day-${d.date}`}
                        accessible accessibilityLabel={`${istDay(d.date)}: ${t.quiz.status[d.status]}`}>
                        <Text className="text-[11px] text-muted-foreground">{istDay(d.date).slice(0, 3)}</Text>
                        <Text className="text-[15px] font-semibold text-foreground">{new Date(`${d.date}T00:00:00Z`).getUTCDate()}</Text>
                        <View className={`size-2.5 rounded-full ${dot}`} />
                      </View>
                    )
                  })}
                </Panel>
              </Section>
            )}

            {report.taught && (
              <Section title={t.dailyReport.taught}>
                <Panel className="overflow-hidden" testID="daily-report-taught">
                  {report.taught.length === 0
                    ? <Text className="p-4 text-sm text-muted-foreground">{t.dailyReport.taughtNone}</Text>
                    : report.taught.map((x, i) => (
                      <Fragment key={i}>
                        {i > 0 && <Divider />}
                        <View className="gap-0.5 px-4 py-3">
                          <Text className="text-[13px] text-muted-foreground">{x.subject}</Text>
                          <Text className="text-[15px] text-foreground">{x.topic}</Text>
                        </View>
                      </Fragment>
                    ))}
                </Panel>
              </Section>
            )}

            {report.doubts && report.doubts.items.length > 0 && (
              <Section title={t.dailyReport.openDoubts(first)}>
                <Panel className="overflow-hidden" testID="daily-report-doubt-list">
                  {report.doubts.items.map((d, i) => (
                    <Fragment key={d.id}>
                      {i > 0 && <Divider />}
                      <View className="gap-1.5 px-4 py-3.5" testID={`daily-report-doubt-${d.id}`}>
                        <View className="flex-row items-center justify-between gap-2">
                          <Text className="text-[13px] text-muted-foreground">{d.subject}</Text>
                          <Chip tone={d.status === 'open' ? 'amber' : 'blue'}>{d.status === 'open' ? t.dailyReport.waitingTeacher : t.dailyReport.answered}</Chip>
                        </View>
                        <Text className="text-sm leading-5 text-foreground">{d.question}</Text>
                      </View>
                    </Fragment>
                  ))}
                </Panel>
              </Section>
            )}
          </FadeInView>
        )}
      </Screen>
    </>
  )
}
