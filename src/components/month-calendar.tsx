import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { Panel } from '@/components/ui'

// Shared month grid for the School Calendar and Exam Calendar screens, ported
// from the web app's SchoolCalendarView/TestCalendar month grids.

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const CELL_WIDTH = `${100 / 7}%`

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// First and last day of the month, as YYYY-MM-DD, for from/to query params.
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` }
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

export function monthDays(month: string): string[] {
  const { to } = monthRange(month)
  const count = Number(to.slice(8))
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}

export function MonthCalendar({
  month, onPrev, onNext, selected, onSelectDay, testIDPrefix,
  dayBg, dayMarkers, accessibilityLabelFor,
}: {
  month: string
  onPrev: () => void
  onNext: () => void
  selected: string | null
  onSelectDay: (date: string) => void
  testIDPrefix: string
  dayBg?: (date: string) => string
  dayMarkers?: (date: string) => ReactNode
  accessibilityLabelFor?: (date: string) => string
}) {
  const today = todayISO()
  const [y, m] = month.split('-').map(Number)
  const lead = new Date(y, m - 1, 1).getDay()
  const days = monthDays(month)

  return (
    <Panel className="p-3">
      <View className="flex-row items-center justify-between pb-2">
        <Pressable
          testID={`${testIDPrefix}-prev`} onPress={onPrev} hitSlop={8}
          accessibilityRole="button" accessibilityLabel="Previous month"
          className="h-9 w-9 items-center justify-center rounded-full active:bg-muted"
        >
          <ChevronLeft size={18} color="#6b7280" />
        </Pressable>
        <Text testID={`${testIDPrefix}-month-label`} className="text-sm font-semibold text-foreground">
          {monthLabel(month)}
        </Text>
        <Pressable
          testID={`${testIDPrefix}-next`} onPress={onNext} hitSlop={8}
          accessibilityRole="button" accessibilityLabel="Next month"
          className="h-9 w-9 items-center justify-center rounded-full active:bg-muted"
        >
          <ChevronRight size={18} color="#6b7280" />
        </Pressable>
      </View>

      <View className="flex-row">
        {WEEKDAY_SHORT.map(d => (
          <Text key={d} style={{ width: CELL_WIDTH }} className="text-center text-[10px] text-muted-foreground">{d}</Text>
        ))}
      </View>

      <View className="mt-1 flex-row flex-wrap">
        {Array.from({ length: lead }, (_, i) => <View key={`lead-${i}`} style={{ width: CELL_WIDTH }} className="h-12" />)}
        {days.map(d => {
          const isToday = d === today
          const isSelected = d === selected
          return (
            <Pressable
              key={d}
              testID={`${testIDPrefix}-day-${d}`}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabelFor?.(d) ?? d}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectDay(d)}
              style={{ width: CELL_WIDTH }}
              className="h-12 items-center gap-0.5 pt-0.5"
            >
              <View
                className={`h-7 w-7 items-center justify-center rounded-full ${
                  isToday ? 'bg-primary' : isSelected ? 'border border-foreground' : dayBg?.(d) ?? ''
                }`}
              >
                <Text className={`text-xs font-medium ${isToday ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {Number(d.slice(8))}
                </Text>
              </View>
              {dayMarkers?.(d)}
            </Pressable>
          )
        })}
      </View>
    </Panel>
  )
}
