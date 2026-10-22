import { Linking, Text, View } from 'react-native'
import { router, type Href } from 'expo-router'
import Constants from 'expo-constants'
import { Bell, User, Shield, LogOut, ChevronRight, Languages, type LucideIcon } from 'lucide-react-native'
import { CHILD_LINKS, SCHOOL_LINKS } from '@/components/quick-links'

import { PRIVACY_URL } from '@/lib/api'
import { useSession } from '@/stores/session'
import { Screen, Section, Panel, Row, Divider, LangToggle, IconBadge, type Tint } from '@/components/ui'
import { useT } from '@/lib/i18n'

type MenuItem = {
  id: string
  label: string
  icon: LucideIcon
  tint: Tint
  route?: Href
  feature?: string
  onPress?: () => void
}

function MenuPanel({ items }: { items: MenuItem[] }) {
  const has = useSession(s => s.has)
  const visible = items.filter(it => !it.feature || has(it.feature))

  if (visible.length === 0) return null

  return (
    <Panel className="overflow-hidden">
      {visible.map((it, i) => (
        <View key={it.id}>
          {i > 0 && <Divider />}
          <Row
            onPress={it.onPress || (it.route ? () => { if (it.route) router.push(it.route) } : undefined)}
            testID={it.id === 'logout' ? 'logout-btn' : `more-${it.id}-link`}
          >
            <IconBadge icon={it.icon} tint={it.tint} />
            <Text className="flex-1 text-sm font-medium text-foreground">{it.label}</Text>
            <ChevronRight size={18} color="#9ca3af" />
          </Row>
        </View>
      ))}
    </Panel>
  )
}

export default function MoreScreen() {
  const student = useSession(s => s.student)
  const t = useT()

  const handleLogout = async () => {
    await useSession.getState().logout()
    router.replace('/login')
  }

  const childItems: MenuItem[] = CHILD_LINKS.map(l => ({ ...l, label: l.label(t) }))
  const schoolItems: MenuItem[] = SCHOOL_LINKS.map(l => ({ ...l, label: l.label(t) }))

  const accountItems: MenuItem[] = [
    { id: 'notifications', label: t.screenTitles.notifications, icon: Bell, tint: 'amber', route: '/notifications' },
    { id: 'profile', label: t.screenTitles.profile, icon: User, tint: 'blue', route: '/profile' },
    { id: 'privacy', label: t.privacyPolicy, icon: Shield, tint: 'green', onPress: () => Linking.openURL(PRIVACY_URL) },
  ]

  return (
    <Screen testID="more-screen">
      {student && (
        <Section title={student.name.split(' ')[0]}>
          <MenuPanel items={childItems} />
        </Section>
      )}

      <Section title={t.more.school}>
        <MenuPanel items={schoolItems} />
      </Section>

      <Section title={t.more.account}>
        <Panel className="overflow-hidden">
          <Row>
            <IconBadge icon={Languages} tint="violet" />
            <Text className="flex-1 text-sm font-medium text-foreground">{t.language}</Text>
            <LangToggle />
          </Row>
        </Panel>
        <MenuPanel items={accountItems} />
      </Section>

      <View className="mt-2">
        <Panel className="overflow-hidden">
          <Row onPress={handleLogout} testID="logout-btn">
            <IconBadge icon={LogOut} tint="rose" />
            <Text className="flex-1 text-sm font-semibold text-rose-700">{t.more.signOut}</Text>
          </Row>
        </Panel>
      </View>

      {Constants.expoConfig?.version && (
        <Text className="mt-2 text-center text-[11px] text-muted-foreground">
          {t.appName} · v{Constants.expoConfig.version}
        </Text>
      )}
    </Screen>
  )
}
