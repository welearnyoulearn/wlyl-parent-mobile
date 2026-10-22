import { Pressable, Text, View } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import { CalendarDays, BookOpenCheck, Library, CreditCard, LayoutGrid, type LucideIcon } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { CARD_SHADOW, IconBadge, Section, type Tint } from '@/components/ui'
import { useT, type Strings } from '@/lib/i18n'

// Labels resolve against the current language's strings.
export type AppLink = { id: string; label: (t: Strings) => string; icon: LucideIcon; tint: Tint; route: Href; feature?: string }

// Shared by Home's Quick Links and the More tab.
export const CHILD_LINKS: AppLink[] = [
  { id: 'pay-online', label: t => t.quickLinks.payFees, icon: CreditCard, tint: 'green', route: '/fees', feature: 'online-payments' },
]

export const SCHOOL_LINKS: AppLink[] = [
  { id: 'calendar', label: t => t.screenTitles.calendar, icon: CalendarDays, tint: 'blue', route: '/calendar', feature: 'calendar' },
  { id: 'syllabus', label: t => t.screenTitles.syllabus, icon: BookOpenCheck, tint: 'violet', route: '/syllabus', feature: 'curriculum' },
  { id: 'library', label: t => t.screenTitles.library, icon: Library, tint: 'amber', route: '/library', feature: 'library' },
]

function Tile({ id, label, icon, tint, onPress }: {
  id: string; label: string; icon: LucideIcon; tint: Tint; onPress?: () => void
}) {
  const t = useT()
  // No onPress = the school has switched this feature off.
  const off = !onPress
  return (
    <View className="w-1/4 p-1">
      <Pressable
        onPress={onPress}
        disabled={off}
        testID={`quick-${id}`}
        accessibilityRole="button"
        accessibilityLabel={off ? t.quickLinks.accessibilityOff(label) : label}
        accessibilityState={{ disabled: off }}
        style={CARD_SHADOW}
        className={`items-center gap-2 rounded-2xl bg-card px-1 pb-3 pt-3.5 ${off ? 'opacity-50' : 'active:bg-muted'}`}
      >
        <IconBadge icon={icon} tint={off ? 'muted' : tint} size={48} />
        <Text numberOfLines={1} className="text-xs font-semibold text-foreground">{label}</Text>
        {off && (
          <View className="absolute right-1.5 top-1.5 rounded-full bg-muted px-1.5">
            <Text className="text-[9px] font-semibold uppercase text-muted-foreground">{t.quickLinks.offBadge}</Text>
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
    <Section title={t.quickLinks.title} icon={LayoutGrid}>
      <View className="-m-1 flex-row flex-wrap">
        {[...CHILD_LINKS, ...SCHOOL_LINKS].map(l => {
          const on = !l.feature || has(l.feature)
          return <Tile key={l.id} id={l.id} label={l.label(t)} icon={l.icon} tint={l.tint} onPress={on ? () => router.push(l.route) : undefined} />
        })}
      </View>
    </Section>
  )
}
