import { Fragment, useState } from 'react'
import { Linking, Pressable, View } from 'react-native'
import { router, type Href } from 'expo-router'
import Constants from 'expo-constants'
import { Bell, ChevronRight, User, Shield, LogOut, Languages, Palette, ExternalLink, type LucideIcon } from 'lucide-react-native'
import { CHILD_LINKS, SCHOOL_LINKS } from '@/components/quick-links'

import { PRIVACY_URL } from '@/lib/api'
import { useSession } from '@/stores/session'
import { Screen, Section, Panel, Divider, LangToggle, ThemeToggle, ListItem, IconTile, ConfirmDialog, type Tint, type Tone, useColors, Avatar, Text } from '@/components/ui'
import { useT } from '@/lib/i18n'

type MenuItem = {
  id: string
  label: string
  icon: LucideIcon
  tint: Tint
  route?: Href
  feature?: string
  external?: boolean
  onPress?: () => void
}

const TONE_OF: Record<Tint, Tone> = { teal: 'teal', green: 'green', blue: 'blue', violet: 'violet', amber: 'amber', rose: 'red', muted: 'muted' }

function MenuPanel({ items }: { items: MenuItem[] }) {
  const has = useSession(s => s.has)
  const c = useColors()
  const visible = items.filter(it => !it.feature || has(it.feature))

  if (visible.length === 0) return null

  return (
    <Panel className="overflow-hidden">
      {visible.map((it, i) => (
        <Fragment key={it.id}>
          {i > 0 && <Divider inset />}
          <ListItem
            icon={it.icon}
            tone={TONE_OF[it.tint]}
            title={it.label}
            onPress={it.onPress || (it.route ? () => { if (it.route) router.push(it.route) } : undefined)}
            trailing={it.external ? <ExternalLink size={16} color={c.subtle} /> : undefined}
            testID={`more-${it.id}-link`}
          />
        </Fragment>
      ))}
    </Panel>
  )
}

export default function MoreScreen() {
  const student = useSession(s => s.student)
  const me = useSession(s => s.me)
  const t = useT()
  const c = useColors()
  const [confirming, setConfirming] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const handleLogout = async () => {
    setLeaving(true)
    await useSession.getState().logout()
    setConfirming(false)
    router.replace('/login')
  }

  const childItems: MenuItem[] = CHILD_LINKS.map(l => ({ ...l, label: l.label(t) }))
  const schoolItems: MenuItem[] = SCHOOL_LINKS.map(l => ({ ...l, label: l.label(t) }))

  const accountItems: MenuItem[] = [
    { id: 'notifications', label: t.screenTitles.notifications, icon: Bell, tint: 'amber', route: '/notifications' },
    { id: 'profile', label: t.screenTitles.profile, icon: User, tint: 'blue', route: '/profile' },
    { id: 'privacy', label: t.privacyPolicy, icon: Shield, tint: 'green', external: true, onPress: () => Linking.openURL(PRIVACY_URL) },
  ]

  return (
    <Screen testID="more-screen">
      {/* Who is signed in, and the way into their profile. */}
      {me && (
        <Pressable onPress={() => router.push('/profile')} testID="more-profile-card" accessibilityRole="button"
          accessibilityLabel={`${me.name ?? ''}, ${t.screenTitles.profile}`}
          className="flex-row items-center gap-4 rounded-2xl border border-transparent bg-card p-4 active:opacity-80 dark:border-border">
          <Avatar name={me.name ?? '?'} className="size-14 bg-primary" textClassName="text-lg text-primary-foreground" />
          <View className="flex-1 gap-0.5">
            <Text className="text-lg font-extrabold tracking-tight text-foreground" numberOfLines={1}>{me.name}</Text>
            <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>{me.school_name ?? me.email ?? me.phone}</Text>
          </View>
          <ChevronRight size={20} color={c.subtle} />
        </Pressable>
      )}

      {student && (
        <Section title={student.name.split(' ')[0]}>
          <MenuPanel items={childItems} />
        </Section>
      )}

      <Section title={t.more.school}>
        <MenuPanel items={schoolItems} />
      </Section>

      <Section title={t.more.account}>
        <MenuPanel items={accountItems} />
        {/* Label above a full-width switch, so the options never crowd the label on a small phone. */}
        <Panel className="overflow-hidden">
          <View className="gap-3 p-4">
            <View className="flex-row items-center gap-3">
              <IconTile icon={Languages} tone="muted" size="sm" />
              <Text className="text-[15px] font-medium text-foreground">{t.language}</Text>
            </View>
            <LangToggle size="md" />
          </View>
          <Divider />
          <View className="gap-3 p-4">
            <View className="flex-row items-center gap-3">
              <IconTile icon={Palette} tone="muted" size="sm" />
              <Text className="text-[15px] font-medium text-foreground">{t.more.appearance}</Text>
            </View>
            <ThemeToggle />
          </View>
        </Panel>
      </Section>

      <Panel className="overflow-hidden">
        <ListItem icon={LogOut} title={t.more.signOut} danger onPress={() => setConfirming(true)} testID="logout-btn" />
      </Panel>

      {Constants.expoConfig?.version && (
        <Text className="text-center text-xs text-muted-foreground">
          {t.appName} · v{Constants.expoConfig.version}
        </Text>
      )}

      <ConfirmDialog
        visible={confirming}
        title={t.more.signOutTitle}
        message={t.more.signOutMessage}
        confirmLabel={t.more.signOut}
        onConfirm={() => void handleLogout()}
        onCancel={() => setConfirming(false)}
        busy={leaving}
        testID="logout-confirm"
      />
    </Screen>
  )
}
