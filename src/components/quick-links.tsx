import { Pressable, Text, View } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import {
  NotebookPen, CalendarX2, Bus, Trophy, Activity, Clock, CalendarDays, BookOpenCheck, Library,
  CreditCard, ReceiptText, FileText, Images, MapPinned, type LucideIcon,
} from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { Section } from '@/components/ui'
import { useT, type Strings } from '@/lib/i18n'

// Labels resolve against the current language's strings.
export type AppLink = { id: string; label: (t: Strings) => string; icon: LucideIcon; route: Href; feature?: string }

// Shared by Home's Quick Links and the More tab.
export const CHILD_LINKS: AppLink[] = [
  { id: 'pay-online', label: t => t.quickLinks.payFees, icon: CreditCard, route: '/fees', feature: 'online-payments' },
]

export const SCHOOL_LINKS: AppLink[] = [
  { id: 'calendar', label: t => t.screenTitles.calendar, icon: CalendarDays, route: '/calendar', feature: 'calendar' },
  { id: 'syllabus', label: t => t.screenTitles.syllabus, icon: BookOpenCheck, route: '/syllabus', feature: 'curriculum' },
  { id: 'library', label: t => t.screenTitles.library, icon: Library, route: '/library', feature: 'library' },
]

// Not built in the app yet. Shown disabled so everyone can see what's left:
// homework, leave, transport, rewards, activity and timetable wait on the platform backend (#129).
const COMING_SOON: { id: string; label: (t: Strings) => string; icon: LucideIcon }[] = [
  { id: 'homework', label: t => t.quickLinks.homework, icon: NotebookPen },
  { id: 'leave', label: t => t.quickLinks.leave, icon: CalendarX2 },
  { id: 'transport', label: t => t.quickLinks.bus, icon: Bus },
  { id: 'rewards', label: t => t.quickLinks.rewards, icon: Trophy },
  { id: 'activity', label: t => t.quickLinks.activity, icon: Activity },
  { id: 'timetable', label: t => t.quickLinks.timetable, icon: Clock },
  { id: 'receipts', label: t => t.quickLinks.receipts, icon: ReceiptText },
  { id: 'report-card', label: t => t.quickLinks.reportCard, icon: FileText },
  { id: 'photos', label: t => t.quickLinks.photos, icon: Images },
  { id: 'bus-tracking', label: t => t.quickLinks.busLive, icon: MapPinned },
]

function Tile({ id, label, icon: Icon, badge, onPress }: {
  id: string; label: string; icon: LucideIcon; badge?: 'soon' | 'off'; onPress?: () => void
}) {
  const t = useT()
  const off = !onPress
  return (
    <View className="w-1/4 p-1">
      <Pressable
        onPress={onPress}
        disabled={off}
        testID={`quick-${id}`}
        accessibilityRole="button"
        accessibilityLabel={badge === 'soon' ? t.quickLinks.accessibilityComingSoon(label) : badge === 'off' ? t.quickLinks.accessibilityOff(label) : label}
        accessibilityState={{ disabled: off }}
        className={`items-center gap-1.5 rounded-2xl border border-border bg-card py-3 ${off ? 'opacity-50' : 'active:bg-muted'}`}
      >
        <View className={`h-9 w-9 items-center justify-center rounded-xl ${off ? 'bg-muted' : 'bg-teal-50'}`}>
          <Icon size={16} color={off ? '#9ca3af' : '#0f766e'} />
        </View>
        <Text numberOfLines={1} className="text-[11px] font-medium text-foreground">{label}</Text>
        {badge && (
          <View className="absolute right-1.5 top-1.5 rounded-full bg-muted px-1.5">
            <Text className="text-[9px] font-semibold uppercase text-muted-foreground">{badge === 'soon' ? t.quickLinks.soonBadge : t.quickLinks.offBadge}</Text>
          </View>
        )}
      </Pressable>
    </View>
  )
}

export function QuickLinks() {
  const router = useRouter()
  const has = useSession(s => s.has)
  const t = useT()
  return (
    <Section title={t.quickLinks.title}>
      <View className="-m-1 flex-row flex-wrap">
        {[...CHILD_LINKS, ...SCHOOL_LINKS].map(l => {
          const on = !l.feature || has(l.feature)
          return <Tile key={l.id} id={l.id} label={l.label(t)} icon={l.icon} badge={on ? undefined : 'off'} onPress={on ? () => router.push(l.route) : undefined} />
        })}
        {COMING_SOON.map(l => <Tile key={l.id} id={l.id} label={l.label(t)} icon={l.icon} badge="soon" />)}
      </View>
    </Section>
  )
}
