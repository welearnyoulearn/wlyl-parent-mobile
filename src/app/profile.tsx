import { Text, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { ChevronRight, KeyRound } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { Screen, Panel, Section, Row, Avatar, Divider } from '@/components/ui'
import { BirthdayField } from '@/components/birthday-field'
import { useT } from '@/lib/i18n'

// Read-only like the web profile: the platform has no endpoint for a parent to
// change their own name, email or phone (the school keeps those). Only the
// birthday and the password are the parent's to change.
export default function ProfileScreen() {
  const { me, children } = useSession()
  const router = useRouter()
  const t = useT()

  if (!me) return null

  const info = [
    { label: t.profile.nameLabel, value: me.name },
    { label: t.profile.emailLabel, value: me.email },
    { label: t.profile.mobileLabel, value: me.phone },
    { label: t.profile.schoolLabel, value: me.school_name },
  ]

  return (
    <>
      <Stack.Screen options={{ title: t.screenTitles.profile }} />
      <Screen testID="profile-screen">
        <Panel>
          <Row className="py-4">
            <Avatar name={me.name ?? '?'} className="size-12 bg-teal-50" textClassName="text-lg text-teal-800" />
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">{me.name ?? t.profile.none}</Text>
              <Text className="text-xs text-muted-foreground">{me.school_name ?? t.profile.schoolFallback}</Text>
            </View>
          </Row>
        </Panel>

        <Section title={t.profile.accountInfo}>
          <Panel testID="profile-account-info">
            {info.map((row, i) => (
              <View key={row.label}>
                {i > 0 && <Divider />}
                <Row>
                  <View className="flex-1">
                    <Text className="text-[11px] text-muted-foreground">{row.label}</Text>
                    <Text className="text-sm font-medium text-foreground">{row.value || t.profile.none}</Text>
                  </View>
                </Row>
              </View>
            ))}
            <Divider />
            <BirthdayField value={me.date_of_birth ?? null} />
          </Panel>
        </Section>

        <Panel>
          <Row onPress={() => router.push('/change-password')} testID="profile-change-password-btn">
            <KeyRound size={18} color="#6b7280" />
            <Text className="flex-1 text-sm font-medium text-foreground">{t.profile.changePassword}</Text>
            <ChevronRight size={18} color="#6b7280" />
          </Row>
        </Panel>

        <Section title={children.length > 1 ? t.profile.linkedChildren : t.profile.linkedChild}>
          <Panel className="divide-y divide-black/5">
            {children.map((c, i) => (
              <View key={c.id}>
                {i > 0 && <Divider />}
                <Row className="items-center">
                  <Avatar name={c.name} className="size-10 bg-teal-50" textClassName="text-sm text-teal-800" />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">{c.name}</Text>
                    <Text className="text-[11px] text-muted-foreground">
                      {t.classRoll(c.grade, c.section, c.roll_number.split('-').pop() ?? '')}
                    </Text>
                  </View>
                </Row>
              </View>
            ))}
          </Panel>
        </Section>
      </Screen>
    </>
  )
}
