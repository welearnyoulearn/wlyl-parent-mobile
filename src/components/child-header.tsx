import { Fragment, useCallback, useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Bell, Check, ChevronDown } from 'lucide-react-native'
import { useSession, type Student } from '@/stores/session'
import { useApi } from '@/lib/use-api'
import { onNotificationReceived } from '@/lib/push'
import { num, type Fees, type Notification, type Summary } from '@/lib/api'
import { childColor } from '@/lib/child-colors'
import { Avatar, Divider, Sheet, Text, haptic, useColors } from '@/components/ui'
import { useT, type Strings } from '@/lib/i18n'

export function greeting(t: Strings) {
  const h = new Date().getHours()
  return h < 12 ? t.header.goodMorning : h < 17 ? t.header.goodAfternoon : t.header.goodEvening
}

const rollOf = (s: Student) => s.roll_number?.split('-').pop() ?? ''

// Unread count for the bell. Refreshes when a tab comes into view (the parent may
// have just read some) and the moment a push arrives.
function useUnread() {
  const { data, refresh } = useApi<Notification[]>('/api/notifications')
  useFocusEffect(useCallback(() => { refresh() }, [refresh]))
  useEffect(() => onNotificationReceived(refresh), [refresh])
  return Array.isArray(data) ? data.filter(n => !n.is_read).length : 0
}

// Bottom sheet listing the parent's children; picking one switches every screen.
function ChildSheet({ onClose }: { onClose: () => void }) {
  const { children, student, selectChild } = useSession()
  const t = useT()
  const c = useColors()
  return (
    <Sheet title={t.header.switchChild} onClose={onClose} testID="child-sheet">
      <View className="overflow-hidden rounded-2xl bg-card">
        {children.map((k, i) => {
          const active = k.id === student?.id
          const { solid } = childColor(children, k.id)
          return (
            <Fragment key={k.id}>
              {i > 0 && <Divider inset />}
              <Pressable onPress={() => { if (!active) { haptic.select(); selectChild(k) } onClose() }} testID={`child-chip-${k.id}`}
                accessibilityRole="radio" accessibilityState={{ checked: active }}
                accessibilityLabel={`${k.name}, ${t.classRoll(k.grade, k.section, rollOf(k))}`}
                className={`min-h-[68px] flex-row items-center gap-3.5 px-4 py-3 ${active ? 'bg-primary-soft' : 'active:bg-muted'}`}>
                <Avatar name={k.name} color={solid} className={`size-11 ${active ? 'border-2 border-card' : ''}`} textClassName="text-sm text-white" />
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground" numberOfLines={1}>{k.name}</Text>
                  <Text className="text-[13px] text-muted-foreground">{t.classRoll(k.grade, k.section, rollOf(k))}</Text>
                </View>
                {active && <Check size={20} color={c.primary} strokeWidth={2.6} />}
              </Pressable>
            </Fragment>
          )
        })}
      </View>
    </Sheet>
  )
}

// Header on every tab: the school's teal band, so the app has one strong colour at the top. It leads with the child, because every number
// in the app is about one child: on Home the child's name is the title; on other tabs the
// tab is the title and the child sits under it. Either one opens the switcher when there
// are several children. The bell is the only other control.
export function TabHeader({ title, home = false }: { title: string; home?: boolean }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const c = useColors()
  const { me, children, student, has } = useSession()
  const t = useT()
  const unread = useUnread()
  const [switching, setSwitching] = useState(false)
  const focused = useIsFocused()
  const many = children.length > 1
  // Each child keeps one colour everywhere (#10), so parents can tell whose data is on screen.
  const color = childColor(children, student?.id).solid

  // Same requests as Home, Exams and Fees, so these come from the request cache.
  const q = student && student.class_id > 0 ? `school_id=${student.school_id}&student_id=${student.id}&class_id=${student.class_id}` : null
  const { data: summary } = useApi<Summary>(q && has('exam-marks') ? `/api/parent/child-summary?${q}` : null)
  const { data: fees } = useApi<Fees>(student && has('fee-management') ? `/api/parent/fees?school_id=${student.school_id}&student_id=${student.id}` : null)
  const toSign = num(summary?.unacknowledged_count)
  const overdue = num(fees?.summary.overdue_count)

  const childLine = student ? `${student.name}  ·  ${t.header.classShort(student.grade, student.section)}` : ''
  const openSwitcher = many ? () => { haptic.select(); setSwitching(true) } : undefined

  return (
    <View style={{ paddingTop: insets.top + 6 }} className="bg-brand pb-2">
      {/* Light status bar over the teal, only while this tab is on screen. */}
      {focused && <StatusBar style="light" />}
      <View className="w-full max-w-2xl flex-row items-center gap-3 self-center px-4 pb-2 pt-1">
        <Pressable onPress={openSwitcher} disabled={!many} testID="child-switcher" className="flex-1 active:opacity-60"
          accessibilityRole={many ? 'button' : 'header'} accessibilityLabel={many && student ? t.header.showingSwitch(student.name) : home ? student?.name : title}>
          {home && student ? (
            <>
              <View className="flex-row items-center gap-2">
                {many && <View style={{ backgroundColor: color }} className="size-3 rounded-full border-2 border-white" />}
                <Text className="shrink text-[28px] font-bold leading-9 tracking-tight text-on-brand" numberOfLines={1}>{student.name.split(' ')[0]}</Text>
                {many && <ChevronDown size={20} color={c.onBrand} strokeWidth={2.2} />}
              </View>
              <Text className="text-[13px] text-on-brand/80" numberOfLines={1}>
                {t.header.classShort(student.grade, student.section)}{me?.school_name ? `  ·  ${me.school_name}` : ''}
              </Text>
            </>
          ) : (
            <>
              <Text className="text-[28px] font-bold leading-9 tracking-tight text-on-brand" numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
              {student && (
                <View className="flex-row items-center gap-1.5">
                  {many && <View style={{ backgroundColor: color }} className="size-2.5 rounded-full border border-white" />}
                  <Text className="shrink text-[13px] text-on-brand/80" numberOfLines={1}>{childLine}</Text>
                  {many && <ChevronDown size={14} color={c.onBrand} />}
                </View>
              )}
            </>
          )}
        </Pressable>

        <Pressable onPress={() => router.push('/notifications')} testID="header-notifications" accessibilityRole="button"
          accessibilityLabel={unread ? t.header.unread(unread) : t.header.notifications} hitSlop={8}
          className="size-11 items-center justify-center rounded-full bg-white/15 active:bg-white/25">
          <Bell size={22} color={c.onBrand} strokeWidth={2} />
          {unread > 0 && <View className="absolute right-2 top-2 size-3 rounded-full border-2 border-brand bg-danger-graphic" />}
        </Pressable>
      </View>

      {/* Things to act on, as one quiet line on every tab but Home (Home lists them in full). */}
      {!home && (toSign > 0 || overdue > 0) && (
        <View className="w-full max-w-2xl flex-row flex-wrap gap-2 self-center px-4 pt-1">
          {toSign > 0 && (
            <Pressable onPress={() => router.push('/exams')} testID="header-chip-results" accessibilityRole="button" hitSlop={8} className="rounded-full bg-white px-3 py-1 active:opacity-80">
              <Text className="text-[13px] font-semibold text-danger">{t.header.resultsToSign(toSign)}</Text>
            </Pressable>
          )}
          {overdue > 0 && (
            <Pressable onPress={() => router.push('/fees')} testID="header-chip-fees" accessibilityRole="button" hitSlop={8} className="rounded-full bg-white px-3 py-1 active:opacity-80">
              <Text className="text-[13px] font-semibold text-warning">{t.header.feeOverdue(overdue)}</Text>
            </Pressable>
          )}
        </View>
      )}
      {switching && <ChildSheet onClose={() => setSwitching(false)} />}
    </View>
  )
}
