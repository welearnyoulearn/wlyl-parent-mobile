import { View } from 'react-native'
import { router, type Href } from 'expo-router'
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import {
  BadgeIndianRupee, BellRing, BookOpenCheck, CalendarDays, ChevronRight, CircleUserRound, ClipboardCheck, LibraryBig, Megaphone, Settings2,
  type LucideIcon,
} from 'lucide-react-native'
import { CHILD_LINKS, SCHOOL_LINKS } from '@/components/quick-links'
import { useNotices } from '@/components/notices'

import { useSession } from '@/stores/session'
import { Screen, Section, Avatar, CountBadge, PressableScale, Text, useColors } from '@/components/ui'
import { useT } from '@/lib/i18n'

// Each feature gets its own bright gradient, like an app icon on a phone's home screen,
// so a parent finds it by colour and picture before reading. The same in light and dark:
// white icons on these saturated colours stay readable in both.
const LOOK: Record<string, { icon: LucideIcon; from: string; to: string }> = {
  'pay-online': { icon: BadgeIndianRupee, from: '#34d399', to: '#059669' },
  'daily-report': { icon: ClipboardCheck, from: '#a78bfa', to: '#7c3aed' },
  calendar: { icon: CalendarDays, from: '#60a5fa', to: '#2563eb' },
  syllabus: { icon: BookOpenCheck, from: '#c084fc', to: '#9333ea' },
  library: { icon: LibraryBig, from: '#fbbf24', to: '#ea580c' },
  notices: { icon: Megaphone, from: '#fb7185', to: '#e11d48' },
  profile: { icon: CircleUserRound, from: '#38bdf8', to: '#0284c7' },
  notifications: { icon: BellRing, from: '#fcd34d', to: '#f59e0b' },
  settings: { icon: Settings2, from: '#2dd4bf', to: '#0d7d76' },
}

type GridItem = { id: string; label: string; route: Href; feature?: string; badge?: number }

const ICON_BOX = 60

// The app-icon tile: diagonal gradient, a soft shine in the top corner, and a two-tone white icon.
function AppIcon({ id }: { id: string }) {
  const look = LOOK[id] ?? LOOK.settings
  const Icon = look.icon
  return (
    <View style={{ width: ICON_BOX, height: ICON_BOX, borderRadius: 18, overflow: 'hidden', boxShadow: `0 6px 14px ${look.to}55` }}
      className="items-center justify-center">
      <Svg width={ICON_BOX} height={ICON_BOX} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={look.from} />
            <Stop offset="1" stopColor={look.to} />
          </LinearGradient>
        </Defs>
        <Rect width={ICON_BOX} height={ICON_BOX} fill={`url(#g-${id})`} />
        <Circle cx={ICON_BOX * 0.85} cy={ICON_BOX * 0.1} r={ICON_BOX * 0.42} fill="#ffffff" fillOpacity={0.16} />
        <Circle cx={ICON_BOX * 0.1} cy={ICON_BOX * 0.95} r={ICON_BOX * 0.28} fill="#000000" fillOpacity={0.07} />
      </Svg>
      {/* Its own View, so it stacks above the absolutely placed gradient on web too. */}
      <View><Icon size={30} color="#ffffff" fill="rgba(255,255,255,0.22)" strokeWidth={2.1} /></View>
    </View>
  )
}

// One feature: the app icon, its name, and a short line saying what's inside.
function FeatureTile({ item, hint }: { item: GridItem; hint?: string }) {
  const t = useT()
  const label = [item.label, hint, item.badge ? t.notices.isNew : null].filter(Boolean).join(', ')
  return (
    <PressableScale containerClassName="w-1/3 p-1.5" onPress={() => router.push(item.route)} testID={`more-${item.id}-link`}
      accessibilityRole="button" accessibilityLabel={item.badge ? `${label} (${item.badge})` : label}
      className="min-h-[148px] items-center gap-2 rounded-3xl border border-border bg-card px-1.5 pb-3 pt-4 active:bg-muted">
      <View>
        <AppIcon id={item.id} />
        {/* Unread count, as on the web's Announcements tab. */}
        {item.badge ? <CountBadge count={item.badge} className="absolute -right-2 -top-2 border-2 border-card" /> : null}
      </View>
      <View className="items-center gap-0.5">
        <Text numberOfLines={1} adjustsFontSizeToFit className="text-center text-[13px] font-bold text-foreground">{item.label}</Text>
        {hint ? <Text numberOfLines={2} className="text-center text-[11px] leading-[14px] text-muted-foreground">{hint}</Text> : null}
      </View>
    </PressableScale>
  )
}

// Three tiles to a row; features the school has switched off are left out.
function FeatureGrid({ items }: { items: GridItem[] }) {
  const has = useSession(s => s.has)
  const t = useT()
  const visible = items.filter(it => !it.feature || has(it.feature))
  if (visible.length === 0) return null
  return (
    <View className="-mx-1.5 flex-row flex-wrap">
      {visible.map(it => <FeatureTile key={it.id} item={it} hint={t.more.desc[it.id]} />)}
    </View>
  )
}

export default function MoreScreen() {
  const student = useSession(s => s.student)
  const me = useSession(s => s.me)
  const t = useT()
  const c = useColors()
  // Same request as Home, so it comes from the cache; drives the unread badge on School notices.
  const notices = useNotices(student ? `/api/announcements?school_id=${student.school_id}` : null)
  const unread = notices.items?.filter(n => !n.seen).length ?? 0

  const childItems: GridItem[] = CHILD_LINKS.map(l => ({ ...l, label: l.label(t) }))
  const schoolItems: GridItem[] = [
    ...SCHOOL_LINKS.map(l => ({ ...l, label: l.label(t) })),
    { id: 'notices', label: t.screenTitles.notices, route: '/notices', badge: unread },
  ]
  const accountItems: GridItem[] = [
    { id: 'profile', label: t.screenTitles.profile, route: '/profile' },
    { id: 'notifications', label: t.screenTitles.notifications, route: '/notifications' },
    { id: 'settings', label: t.more.settings, route: '/settings' },
  ]

  return (
    <Screen testID="more-screen">
      {/* Who is signed in; opens Settings, where account, theme, language and sign-out live. */}
      {me && (
        <PressableScale onPress={() => router.push('/settings')} testID="more-profile-card" accessibilityRole="button"
          accessibilityLabel={`${me.name ?? ''}, ${t.more.settings}`}
          className="flex-row items-center gap-4 rounded-3xl border border-border bg-card p-4 active:bg-muted">
          <Avatar name={me.name ?? '?'} className="size-14 bg-primary" textClassName="text-lg text-primary-foreground" />
          <View className="flex-1 gap-0.5">
            <Text className="text-lg font-extrabold tracking-tight text-foreground" numberOfLines={1}>{me.name}</Text>
            <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>{me.school_name ?? me.email ?? me.phone}</Text>
            <Text className="text-xs font-semibold text-primary" numberOfLines={1}>{t.more.settingsHint}</Text>
          </View>
          <ChevronRight size={20} color={c.subtle} />
        </PressableScale>
      )}

      {student && (
        <Section title={student.name.split(' ')[0]}>
          <FeatureGrid items={childItems} />
        </Section>
      )}

      <Section title={t.more.school}>
        <FeatureGrid items={schoolItems} />
      </Section>

      <Section title={t.more.account}>
        <FeatureGrid items={accountItems} />
      </Section>
    </Screen>
  )
}
