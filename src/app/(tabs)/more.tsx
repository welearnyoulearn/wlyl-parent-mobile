import { Linking, Text, View } from 'react-native'
import { router, type Href } from 'expo-router'
import Constants from 'expo-constants'
import { Bell, User, Shield, LogOut, ChevronRight, type LucideIcon } from 'lucide-react-native'
import { CHILD_LINKS, SCHOOL_LINKS } from '@/components/quick-links'

import { PRIVACY_URL } from '@/lib/api'
import { useSession } from '@/stores/session'
import { Screen, Section, Panel, Row, Divider } from '@/components/ui'

type MenuItem = {
  id: string
  label: string
  icon: LucideIcon
  route?: Href
  feature?: string
  color?: string
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
            <it.icon size={18} color={it.color || "#6b7280"} />
            <Text className={`flex-1 text-sm ${it.color ? 'text-rose-600' : 'text-foreground'}`}>
              {it.label}
            </Text>
            {!it.color && <ChevronRight size={18} color="#6b7280" />}
          </Row>
        </View>
      ))}
    </Panel>
  )
}

export default function MoreScreen() {
  const student = useSession(s => s.student)

  const handleLogout = async () => {
    await useSession.getState().logout()
    router.replace('/login')
  }

  const childItems: MenuItem[] = CHILD_LINKS
  const schoolItems: MenuItem[] = SCHOOL_LINKS

  const accountItems: MenuItem[] = [
    { id: 'notifications', label: 'Notifications', icon: Bell, route: '/notifications' },
    { id: 'profile', label: 'Profile', icon: User, route: '/profile' },
    { id: 'privacy', label: 'Privacy policy', icon: Shield, onPress: () => Linking.openURL(PRIVACY_URL) },
  ]

  return (
    <Screen testID="more-screen">
      {student && (
        <Section title={student.name.split(' ')[0]}>
          <MenuPanel items={childItems} />
        </Section>
      )}

      <Section title="School">
        <MenuPanel items={schoolItems} />
      </Section>

      <Section title="Account">
        <MenuPanel items={accountItems} />
      </Section>

      <View className="mt-2">
        <Panel className="overflow-hidden">
          <Row onPress={handleLogout} testID="logout-btn">
            <LogOut size={18} color="#e11d48" />
            <Text className="flex-1 text-sm text-rose-600">Sign out</Text>
          </Row>
        </Panel>
      </View>

      {Constants.expoConfig?.version && (
        <Text className="mt-2 text-center text-[11px] text-muted-foreground">
          WLYL Parent · v{Constants.expoConfig.version}
        </Text>
      )}
    </Screen>
  )
}
