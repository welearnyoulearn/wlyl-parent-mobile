import { Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LogOut } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { num, type Fees, type Summary } from '@/lib/api'
import { Avatar, useChildColor } from '@/components/ui'
import { childColor } from '@/lib/child-colors'
import { useT, type Strings } from '@/lib/i18n'

function greeting(t: Strings) {
  const h = new Date().getHours()
  return h < 12 ? t.header.goodMorning : h < 17 ? t.header.goodAfternoon : t.header.goodEvening
}

// Header on every tab, in the selected child's colour: greeting, school, logout,
// and the selected child (or chips, each in that child's colour, to switch).
// Ported from the web app's AppShell.
export function ChildHeader() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { me, children, student, year, selectChild, logout, has } = useSession()
  const firstName = me?.name?.split(' ')[0]
  const t = useT()
  const color = useChildColor()

  // Same requests as Home, Exams and Fees, so these come from the request cache.
  const q = student && student.class_id > 0 ? `school_id=${student.school_id}&student_id=${student.id}&class_id=${student.class_id}` : null
  const { data: summary } = useApi<Summary>(q && has('exam-marks') ? `/api/parent/child-summary?${q}` : null)
  const { data: fees } = useApi<Fees>(student && has('fee-management') ? `/api/parent/fees?school_id=${student.school_id}&student_id=${student.id}` : null)
  const toSign = num(summary?.unacknowledged_count)
  const overdue = num(fees?.summary.overdue_count)

  async function onLogout() {
    await logout()
    router.replace('/login')
  }

  return (
    <View style={{ paddingTop: insets.top + 12, backgroundColor: color }} className="rounded-b-[28px] px-4 pb-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xs text-white/75">{greeting(t)}{firstName ? t.header.greetingSuffix(firstName) : ''}</Text>
          <Text className="text-sm font-semibold text-white" numberOfLines={1}>{me?.school_name ?? t.appName}</Text>
          {year && (
            <View className="mt-1 self-start rounded-full bg-white/15 px-2.5 py-0.5">
              <Text testID="header-academic-year" className="text-[11px] font-semibold text-white">{t.header.ay(year)}</Text>
            </View>
          )}
        </View>
        <Pressable onPress={() => void onLogout()} testID="logout-button" accessibilityRole="button" accessibilityLabel={t.header.logOut}
          className="size-10 items-center justify-center rounded-full bg-white/15 active:bg-white/25">
          <LogOut size={18} color="#fff" />
        </Pressable>
      </View>

      {student && children.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerClassName="gap-2"
          accessibilityRole="tablist" accessibilityLabel={t.header.childrenList}>
          {children.map(k => {
            const active = k.id === student.id
            const own = childColor(children, k.id)
            return (
              <Pressable key={k.id} onPress={() => selectChild(k)} testID={`child-chip-${k.id}`}
                accessibilityRole="tab" accessibilityState={{ selected: active }}
                className={`flex-row items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 ${active ? 'bg-white' : 'bg-white/15'}`}>
                <Avatar name={k.name} color={own} className="size-7 border border-white/70" textClassName="text-xs text-white" />
                <View>
                  <Text style={active ? { color: own } : undefined} className={`text-sm font-semibold ${active ? '' : 'text-white'}`}>{k.name.split(' ')[0]}</Text>
                  <Text style={active ? { color: own } : undefined} className={`text-[10px] ${active ? '' : 'text-white/75'}`}>{t.header.classShort(k.grade, k.section)}</Text>
                </View>
              </Pressable>
            )
          })}
        </ScrollView>
      ) : student ? (
        <View className="mt-4 flex-row items-center gap-3">
          <Avatar name={student.name} className="size-11 bg-white/20" />
          <View>
            <Text testID="header-child-name" className="text-lg font-semibold text-white">{student.name}</Text>
            <Text className="text-xs text-white/80">{t.classRoll(student.grade, student.section, student.roll_number.split('-').pop() ?? '')}</Text>
          </View>
        </View>
      ) : null}

      {(toSign > 0 || overdue > 0) && (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {toSign > 0 && (
            <Pressable onPress={() => router.push('/exams')} testID="header-chip-results" accessibilityRole="button"
              className="rounded-full bg-rose-500 px-3 py-1 active:opacity-80">
              <Text className="text-xs font-semibold text-white">{t.header.resultsToSign(toSign)}</Text>
            </Pressable>
          )}
          {overdue > 0 && (
            <Pressable onPress={() => router.push('/fees')} testID="header-chip-fees" accessibilityRole="button"
              className="rounded-full bg-amber-400 px-3 py-1 active:opacity-80">
              <Text className="text-xs font-semibold text-amber-950">{t.header.feeOverdue(overdue)}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}
