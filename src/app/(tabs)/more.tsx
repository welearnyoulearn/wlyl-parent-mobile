import { View } from 'react-native'
import { router, type Href } from 'expo-router'
import { Bell, ChevronRight, Megaphone, Settings, UserRound, type LucideIcon } from 'lucide-react-native'
import { CHILD_LINKS, SCHOOL_LINKS } from '@/components/quick-links'

import { useSession } from '@/stores/session'
import { Screen, Section, Avatar, PressableScale, Text, toneClasses, useColors, type Tint, type Tone } from '@/components/ui'
import { useT } from '@/lib/i18n'

type GridItem = {
  id: string
  label: string
  icon: LucideIcon
  tint: Tint
  route: Href
  feature?: string
}

const TONE_OF: Record<Tint, Tone> = { teal: 'teal', green: 'green', blue: 'blue', violet: 'violet', amber: 'amber', rose: 'red', muted: 'muted' }
const ICON_COLOR = { muted: 'mutedForeground', blue: 'info', violet: 'accent', teal: 'primary', green: 'success', amber: 'warning', red: 'danger' } as const

// One feature: a big rounded tile in the feature's own colour, its name underneath.
function FeatureTile({ item }: { item: GridItem }) {
  const c = useColors()
  const tone = TONE_OF[item.tint]
  return (
    <PressableScale containerClassName="w-1/3 p-1.5" onPress={() => router.push(item.route)} testID={`more-${item.id}-link`}
      accessibilityRole="button" accessibilityLabel={item.label}
      className="min-h-[112px] items-center justify-center gap-2.5 rounded-2xl border border-border bg-card px-2 py-4 active:bg-muted">
      <View className={`size-14 items-center justify-center rounded-2xl ${toneClasses(tone).bg}`}>
        <item.icon size={28} color={c[ICON_COLOR[tone]]} strokeWidth={2} />
      </View>
      <Text numberOfLines={2} className="text-center text-[13px] font-semibold leading-4 text-foreground">{item.label}</Text>
    </PressableScale>
  )
}

// Three tiles to a row; features the school has switched off are left out.
function FeatureGrid({ items }: { items: GridItem[] }) {
  const has = useSession(s => s.has)
  const visible = items.filter(it => !it.feature || has(it.feature))
  if (visible.length === 0) return null
  return (
    <View className="-mx-1.5 flex-row flex-wrap">
      {visible.map(it => <FeatureTile key={it.id} item={it} />)}
    </View>
  )
}

export default function MoreScreen() {
  const student = useSession(s => s.student)
  const me = useSession(s => s.me)
  const t = useT()
  const c = useColors()

  const childItems: GridItem[] = CHILD_LINKS.map(l => ({ ...l, label: l.label(t) }))
  const schoolItems: GridItem[] = [
    ...SCHOOL_LINKS.map(l => ({ ...l, label: l.label(t) })),
    { id: 'notices', label: t.screenTitles.notices, icon: Megaphone, tint: 'rose', route: '/notices' },
  ]
  const accountItems: GridItem[] = [
    { id: 'profile', label: t.screenTitles.profile, icon: UserRound, tint: 'blue', route: '/profile' },
    { id: 'notifications', label: t.screenTitles.notifications, icon: Bell, tint: 'amber', route: '/notifications' },
    { id: 'settings', label: t.more.settings, icon: Settings, tint: 'teal', route: '/settings' },
  ]

  return (
    <Screen testID="more-screen">
      {/* Who is signed in; opens Settings, where account, theme, language and sign-out live. */}
      {me && (
        <PressableScale onPress={() => router.push('/settings')} testID="more-profile-card" accessibilityRole="button"
          accessibilityLabel={`${me.name ?? ''}, ${t.more.settings}`}
          className="flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4 active:bg-muted">
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
