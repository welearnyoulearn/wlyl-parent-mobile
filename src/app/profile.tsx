import { Fragment } from 'react'
import { View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { AtSign, KeyRound, Phone, School, UserRound, type LucideIcon } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { childColor } from '@/lib/child-colors'
import { Screen, Panel, Section, Row, Avatar, Divider, IconTile, ListItem, FadeInView, Text } from '@/components/ui'
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

  const info: { label: string; value: string | null; icon: LucideIcon }[] = [
    { label: t.profile.nameLabel, value: me.name, icon: UserRound },
    { label: t.profile.emailLabel, value: me.email, icon: AtSign },
    { label: t.profile.mobileLabel, value: me.phone, icon: Phone },
    { label: t.profile.schoolLabel, value: me.school_name, icon: School },
  ]

  return (
    <>
      <Stack.Screen options={{ title: t.screenTitles.profile }} />
      <Screen testID="profile-screen">
        <FadeInView>
          <Panel className="items-center gap-2 px-5 py-7">
            <Avatar name={me.name ?? '?'} className="size-20 bg-primary" textClassName="text-2xl text-primary-foreground" />
            <Text className="mt-1 text-center text-xl font-extrabold tracking-tight text-foreground" numberOfLines={2}>{me.name ?? t.profile.none}</Text>
            <Text className="text-center text-sm text-muted-foreground" numberOfLines={1}>{me.school_name ?? t.profile.schoolFallback}</Text>
          </Panel>
        </FadeInView>

        <Section title={t.profile.accountInfo}>
          <Panel testID="profile-account-info" className="overflow-hidden">
            {info.map((row, i) => (
              <Fragment key={row.label}>
                {i > 0 && <Divider inset />}
                <Row>
                  <IconTile icon={row.icon} tone="muted" size="sm" />
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-muted-foreground">{row.label}</Text>
                    <Text className="text-[15px] font-semibold text-foreground" selectable>{row.value || t.profile.none}</Text>
                  </View>
                </Row>
              </Fragment>
            ))}
            <Divider inset />
            <BirthdayField value={me.date_of_birth ?? null} />
          </Panel>
        </Section>

        <Panel className="overflow-hidden">
          <ListItem icon={KeyRound} tone="teal" title={t.profile.changePassword} onPress={() => router.push('/change-password')} testID="profile-change-password-btn" />
        </Panel>

        <Section title={children.length > 1 ? t.profile.linkedChildren : t.profile.linkedChild}>
          <Panel className="overflow-hidden">
            {children.map((c, i) => (
              <Fragment key={c.id}>
                {i > 0 && <Divider inset />}
                <Row>
                  <Avatar name={c.name} color={childColor(children, c.id).solid} className="size-10" textClassName="text-sm text-white" />
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-foreground">{c.name}</Text>
                    <Text className="text-[13px] text-muted-foreground">
                      {t.classRoll(c.grade, c.section, c.roll_number.split('-').pop() ?? '')}
                    </Text>
                  </View>
                </Row>
              </Fragment>
            ))}
          </Panel>
        </Section>
      </Screen>
    </>
  )
}
