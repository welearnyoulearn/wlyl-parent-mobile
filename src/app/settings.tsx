import { useState, type ReactNode } from 'react'
import { Linking, Pressable, View } from 'react-native'
import { Stack, router } from 'expo-router'
import Constants from 'expo-constants'
import { Bell, Check, ChevronRight, ExternalLink, Info, KeyRound, LogOut, Shield, UserRound } from 'lucide-react-native'

import { PRIVACY_URL } from '@/lib/api'
import { useSession, type Lang, type ThemePref } from '@/stores/session'
import { Avatar, ConfirmDialog, Divider, ListItem, Panel, Screen, Section, Text, haptic, useColors } from '@/components/ui'
import { useT } from '@/lib/i18n'

// Fixed preview colours: each card shows what that theme looks like, whatever theme is on now.
const PREVIEW = {
  light: { bg: '#f4f6f9', card: '#ffffff', line: '#0e1726', soft: '#d5dae1', brand: '#b5365a' },
  dark: { bg: '#0a0f15', card: '#1a232d', line: '#edf2f7', soft: '#334150', brand: '#5e1c33' },
}

function MiniPhone({ mode }: { mode: 'light' | 'dark' }) {
  const p = PREVIEW[mode]
  return (
    <View style={{ backgroundColor: p.bg }} className="flex-1 gap-1.5 p-2">
      <View style={{ backgroundColor: p.brand }} className="h-2.5 w-3/4 rounded-full" />
      <View style={{ backgroundColor: p.card }} className="gap-1 rounded-md p-1.5">
        <View style={{ backgroundColor: p.line }} className="h-1.5 w-4/5 rounded-full" />
        <View style={{ backgroundColor: p.soft }} className="h-1.5 w-1/2 rounded-full" />
      </View>
      <View style={{ backgroundColor: p.card }} className="gap-1 rounded-md p-1.5">
        <View style={{ backgroundColor: p.line }} className="h-1.5 w-2/3 rounded-full" />
        <View style={{ backgroundColor: p.soft }} className="h-1.5 w-2/5 rounded-full" />
      </View>
    </View>
  )
}

// A selectable card with a check badge when chosen.
function ChoiceCard({ selected, onPress, label, hint, testID, children }: {
  selected: boolean; onPress: () => void; label: string; hint?: string; testID: string; children: ReactNode
}) {
  const c = useColors()
  return (
    <Pressable onPress={() => { if (!selected) haptic.select(); onPress() }} testID={testID}
      accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={hint ? `${label}, ${hint}` : label}
      className={`flex-1 gap-2 rounded-2xl border-2 p-2 active:opacity-80 ${selected ? 'border-primary bg-primary-soft' : 'border-border bg-card'}`}>
      {children}
      <View className="flex-row items-center justify-between gap-1 px-0.5">
        <View className="flex-1">
          <Text numberOfLines={1} className={`text-sm font-bold ${selected ? 'text-primary' : 'text-foreground'}`}>{label}</Text>
          {hint ? <Text numberOfLines={2} className="text-[11px] leading-[14px] text-muted-foreground">{hint}</Text> : null}
        </View>
        <View className={`size-5 items-center justify-center rounded-full ${selected ? 'bg-primary' : 'border-[1.5px] border-input'}`}>
          {selected && <Check size={13} color={c.primaryForeground} strokeWidth={3} />}
        </View>
      </View>
    </Pressable>
  )
}

function ThemePicker() {
  const theme = useSession(s => s.theme) ?? 'system'
  const setTheme = useSession(s => s.setTheme)
  const t = useT()
  const options: { value: ThemePref; label: string; hint: string }[] = [
    { value: 'system', label: t.more.themeSystem, hint: t.more.themeSystemHint },
    { value: 'light', label: t.more.themeLight, hint: t.more.themeLightHint },
    { value: 'dark', label: t.more.themeDark, hint: t.more.themeDarkHint },
  ]
  return (
    <View className="flex-row gap-2.5" accessibilityRole="radiogroup" accessibilityLabel={t.more.appearance}>
      {options.map(o => (
        <ChoiceCard key={o.value} selected={theme === o.value} onPress={() => setTheme(o.value)} label={o.label} hint={o.hint} testID={`theme-${o.value}`}>
          <View className="h-24 flex-row overflow-hidden rounded-xl border border-border">
            {o.value === 'dark' ? <MiniPhone mode="dark" /> : <MiniPhone mode="light" />}
            {o.value === 'system' && <MiniPhone mode="dark" />}
          </View>
        </ChoiceCard>
      ))}
    </View>
  )
}

function LanguagePicker() {
  const lang = useSession(s => s.lang) ?? 'en'
  const setLang = useSession(s => s.setLang)
  const t = useT()
  const options: { value: Lang; label: string; glyph: string }[] = [
    { value: 'en', label: t.more.langEnglish, glyph: 'Aa' },
    { value: 'te', label: t.more.langTelugu, glyph: 'అ' },
  ]
  return (
    <View className="flex-row gap-2.5" accessibilityRole="radiogroup" accessibilityLabel={t.language}>
      {options.map(o => (
        <ChoiceCard key={o.value} selected={lang === o.value} onPress={() => setLang(o.value)} label={o.label} testID={`lang-${o.value}`}>
          <View className={`h-16 items-center justify-center rounded-xl ${lang === o.value ? 'bg-card' : 'bg-muted'}`}>
            <Text className={`text-2xl font-extrabold ${lang === o.value ? 'text-primary' : 'text-foreground'}`}>{o.glyph}</Text>
          </View>
        </ChoiceCard>
      ))}
    </View>
  )
}

// Everything about the parent's own account and the app: profile, password, alerts,
// theme, language, privacy, version, and signing out.
export default function SettingsScreen() {
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

  const version = Constants.expoConfig?.version

  return (
    <>
      <Stack.Screen options={{ title: t.more.settings }} />
      <Screen testID="settings-screen">
        {me && (
          <Pressable onPress={() => router.push('/profile')} testID="settings-profile-card" accessibilityRole="button"
            accessibilityLabel={`${me.name ?? ''}, ${t.screenTitles.profile}`}
            className="flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4 active:bg-muted">
            <Avatar name={me.name ?? '?'} className="size-14 bg-primary" textClassName="text-lg text-primary-foreground" />
            <View className="flex-1 gap-0.5">
              <Text className="text-lg font-extrabold tracking-tight text-foreground" numberOfLines={1}>{me.name}</Text>
              <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>{me.email ?? me.phone ?? me.school_name}</Text>
            </View>
            <ChevronRight size={20} color={c.subtle} />
          </Pressable>
        )}

        <Section title={t.more.account}>
          <Panel className="overflow-hidden">
            <ListItem icon={UserRound} tone="blue" title={t.screenTitles.profile} onPress={() => router.push('/profile')} testID="settings-profile-link" />
            <Divider inset />
            <ListItem icon={KeyRound} tone="teal" title={t.profile.changePassword} onPress={() => router.push('/change-password')} testID="settings-change-password-link" />
            <Divider inset />
            <ListItem icon={Bell} tone="amber" title={t.screenTitles.notifications} onPress={() => router.push('/notifications')} testID="settings-notifications-link" />
          </Panel>
        </Section>

        <Section title={t.more.appearance}>
          <ThemePicker />
        </Section>

        <Section title={t.language}>
          <LanguagePicker />
        </Section>

        <Section title={t.more.about}>
          <Panel className="overflow-hidden">
            <ListItem icon={Shield} tone="green" title={t.privacyPolicy} onPress={() => void Linking.openURL(PRIVACY_URL)}
              trailing={<ExternalLink size={16} color={c.subtle} />} testID="settings-privacy-link" />
            {version && (
              <>
                <Divider inset />
                <ListItem icon={Info} tone="muted" title={t.more.version} trailing={<Text className="text-sm font-semibold text-muted-foreground">v{version}</Text>} />
              </>
            )}
          </Panel>
        </Section>

        <Panel className="overflow-hidden">
          <ListItem icon={LogOut} title={t.more.signOut} subtitle={t.more.signOutHint} danger onPress={() => setConfirming(true)} testID="logout-btn" />
        </Panel>

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
    </>
  )
}
