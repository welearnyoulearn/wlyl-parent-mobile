import { Pressable, Text, View } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import {
  NotebookPen, CalendarX2, Bus, Trophy, Activity, Clock, CalendarDays, BookOpenCheck, Library,
  CreditCard, ReceiptText, FileText, Images, MapPinned, type LucideIcon,
} from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { Section } from '@/components/ui'

export type AppLink = { id: string; label: string; icon: LucideIcon; route: Href; feature?: string }

// Shared by Home's Quick Links and the More tab.
export const CHILD_LINKS: AppLink[] = [
  { id: 'homework', label: 'Homework', icon: NotebookPen, route: '/homework', feature: 'homework' },
  { id: 'leave', label: 'Leave', icon: CalendarX2, route: '/leave', feature: 'attendance' },
  { id: 'transport', label: 'Bus', icon: Bus, route: '/transport', feature: 'transport' },
  { id: 'rewards', label: 'Rewards', icon: Trophy, route: '/rewards' },
  { id: 'activity', label: 'Activity', icon: Activity, route: '/activity' },
  { id: 'pay-online', label: 'Pay fees', icon: CreditCard, route: '/fees', feature: 'online-payments' },
]

export const SCHOOL_LINKS: AppLink[] = [
  { id: 'timetable', label: 'Timetable', icon: Clock, route: '/timetable', feature: 'timetable' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, route: '/calendar' },
  { id: 'syllabus', label: 'Syllabus', icon: BookOpenCheck, route: '/syllabus', feature: 'curriculum' },
  { id: 'library', label: 'Library', icon: Library, route: '/library', feature: 'library' },
]

// Not built in the app yet. Shown disabled so everyone can see what's left (#10).
const COMING_SOON: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'receipts', label: 'Receipts', icon: ReceiptText },
  { id: 'report-card', label: 'Report card', icon: FileText },
  { id: 'photos', label: 'Photos', icon: Images },
  { id: 'bus-tracking', label: 'Bus live', icon: MapPinned },
]

function Tile({ id, label, icon: Icon, badge, onPress }: {
  id: string; label: string; icon: LucideIcon; badge?: string; onPress?: () => void
}) {
  const off = !onPress
  return (
    <View className="w-1/4 p-1">
      <Pressable
        onPress={onPress}
        disabled={off}
        testID={`quick-${id}`}
        accessibilityRole="button"
        accessibilityLabel={badge ? `${label}, ${badge === 'Soon' ? 'coming soon' : 'turned off by the school'}` : label}
        accessibilityState={{ disabled: off }}
        className={`items-center gap-1.5 rounded-2xl border border-border bg-card py-3 ${off ? 'opacity-50' : 'active:bg-muted'}`}
      >
        <View className={`h-9 w-9 items-center justify-center rounded-xl ${off ? 'bg-muted' : 'bg-teal-50'}`}>
          <Icon size={16} color={off ? '#9ca3af' : '#0f766e'} />
        </View>
        <Text numberOfLines={1} className="text-[11px] font-medium text-foreground">{label}</Text>
        {badge && (
          <View className="absolute right-1.5 top-1.5 rounded-full bg-muted px-1.5">
            <Text className="text-[9px] font-semibold uppercase text-muted-foreground">{badge}</Text>
          </View>
        )}
      </Pressable>
    </View>
  )
}

export function QuickLinks() {
  const router = useRouter()
  const has = useSession(s => s.has)
  return (
    <Section title="Quick links">
      <View className="-m-1 flex-row flex-wrap">
        {[...CHILD_LINKS, ...SCHOOL_LINKS].map(l => {
          const on = !l.feature || has(l.feature)
          return <Tile key={l.id} id={l.id} label={l.label} icon={l.icon} badge={on ? undefined : 'Off'} onPress={on ? () => router.push(l.route) : undefined} />
        })}
        {COMING_SOON.map(l => <Tile key={l.id} {...l} badge="Soon" />)}
      </View>
    </Section>
  )
}
