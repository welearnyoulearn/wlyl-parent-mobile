import { View } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import { CalendarDays, BookOpenCheck, ClipboardList, Library, CreditCard, type LucideIcon } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { IconBadge, PressableScale, Text, type Tint } from '@/components/ui'
import { useT, type Strings } from '@/lib/i18n'

// Labels resolve against the current language's strings.
// `hideWhenOff`: features still before launch (seeded off everywhere) are left out rather than shown as Off.
export type AppLink = { id: string; label: (t: Strings) => string; icon: LucideIcon; tint: Tint; route: Href; feature?: string; hideWhenOff?: boolean }

// Shared by Home's Quick Links and the More tab.
export const CHILD_LINKS: AppLink[] = [
  { id: 'pay-online', label: t => t.quickLinks.payFees, icon: CreditCard, tint: 'green', route: '/fees', feature: 'online-payments' },
  { id: 'daily-report', label: t => t.quickLinks.dailyReport, icon: ClipboardList, tint: 'violet', route: '/daily-report', feature: 'daily-quiz', hideWhenOff: true },
]

export const SCHOOL_LINKS: AppLink[] = [
  { id: 'calendar', label: t => t.screenTitles.calendar, icon: CalendarDays, tint: 'blue', route: '/calendar', feature: 'calendar' },
  { id: 'syllabus', label: t => t.screenTitles.syllabus, icon: BookOpenCheck, tint: 'violet', route: '/syllabus', feature: 'curriculum' },
  { id: 'library', label: t => t.screenTitles.library, icon: Library, tint: 'amber', route: '/library', feature: 'library' },
]

// A shortcut: the feature's icon on a tile in its own colour, and its name. No onPress = the
// school has switched this feature off; it stays visible, dimmed, marked Off.
function Tile({ id, label, icon, tint, onPress }: {
  id: string; label: string; icon: LucideIcon; tint: Tint; onPress?: () => void
}) {
  const t = useT()
  const off = !onPress
  return (
    <PressableScale containerClassName="w-1/4" onPress={onPress} disabled={off} testID={`quick-${id}`}
      accessibilityRole="button" accessibilityLabel={off ? t.quickLinks.accessibilityOff(label) : label} accessibilityState={{ disabled: off }}
      className={`items-center gap-1.5 rounded-xl px-1 py-2.5 active:bg-muted ${off ? 'opacity-40' : ''}`}>
      <IconBadge icon={icon} tint={off ? 'muted' : tint} size={48} className="rounded-2xl" />
      <Text numberOfLines={2} className="text-center text-xs leading-4 text-foreground">{label}</Text>
      {off && <Text className="text-[10px] font-medium text-muted-foreground">{t.quickLinks.offBadge}</Text>}
    </PressableScale>
  )
}

// Home's shortcuts, as one plain row inside a single surface.
export function QuickLinks() {
  const router = useRouter()
  const has = useSession(s => s.has)
  const t = useT()
  return (
    <View className="flex-row flex-wrap rounded-2xl bg-card px-1 py-1.5 dark:border dark:border-border" accessibilityLabel={t.quickLinks.title}>
      {[...CHILD_LINKS, ...SCHOOL_LINKS].filter(l => !l.hideWhenOff || !l.feature || has(l.feature)).map(l => {
        const on = !l.feature || has(l.feature)
        return <Tile key={l.id} id={l.id} label={l.label(t)} icon={l.icon} tint={l.tint} onPress={on ? () => router.push(l.route) : undefined} />
      })}
    </View>
  )
}
