import { useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context'
import { withUniwind } from 'uniwind'
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native'
import { initials } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { useSession, type Lang } from '@/stores/session'

// Shared building blocks, ported from wlyl-parent-app/components/app/bits.tsx.
// Every screen is built from these so the app looks consistent.

// Uniwind only maps className on React Native's core components; third-party
// ones must be wrapped, or classes like flex-1 are silently dropped on native
// (the login screen rendered zero-height on Android).
export const SafeAreaView = withUniwind(RNSafeAreaView)

export const COLORS = { primary: '#0d7d76', muted: '#e5e7eb', green: '#10b981', amber: '#f59e0b', red: '#dc2626' }

// Scrollable page body with pull-to-refresh.
export function Screen({ children, refreshing = false, onRefresh, testID }: {
  children: ReactNode; refreshing?: boolean; onRefresh?: () => void; testID?: string
}) {
  return (
    <ScrollView
      testID={testID}
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 px-4 pb-10 pt-5"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} /> : undefined}>
      {children}
    </ScrollView>
  )
}

export function Loading({ label }: { label?: string }) {
  const t = useT()
  return (
    <View className="items-center py-12" accessibilityLabel={label ?? t.ui.loading}>
      <ActivityIndicator color={COLORS.primary} />
    </View>
  )
}

// Soft lift for cards; boxShadow renders on both iOS and Android (new architecture) and on web.
export const CARD_SHADOW = { boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04), 0 3px 10px rgba(16, 24, 40, 0.06)' }

export function Panel({ children, className = '', testID }: { children: ReactNode; className?: string; testID?: string }) {
  return <View testID={testID} style={CARD_SHADOW} className={`rounded-2xl bg-card ${className}`}>{children}</View>
}

// Pastel tile behind an icon: Quick Links, menu rows, stat cards, empty states.
const TINTS = {
  teal: ['bg-teal-50', '#0f766e'], green: ['bg-emerald-50', '#047857'], blue: ['bg-sky-50', '#0369a1'],
  violet: ['bg-violet-50', '#6d28d9'], amber: ['bg-amber-50', '#b45309'], rose: ['bg-rose-50', '#be123c'],
  muted: ['bg-muted', '#6b7280'],
} as const
export type Tint = keyof typeof TINTS

// `onTint` puts it on white, for use inside an already tinted card.
export function IconBadge({ icon: Icon, tint = 'teal', size = 36, round = false, onTint = false, className = '' }: {
  icon: LucideIcon; tint?: Tint; size?: number; round?: boolean; onTint?: boolean; className?: string
}) {
  const [tinted, fg] = TINTS[tint]
  const bg = onTint ? 'bg-white' : tinted
  return (
    <View style={{ width: size, height: size }} className={`shrink-0 items-center justify-center ${round ? 'rounded-full' : 'rounded-xl'} ${bg} ${className}`}>
      <Icon size={Math.round(size * 0.48)} color={fg} />
    </View>
  )
}

// Month / day block for exams, events and holidays.
const DATE_TINTS = { violet: 'bg-violet-50 text-violet-700', teal: 'bg-teal-50 text-teal-700', green: 'bg-emerald-50 text-emerald-700', rose: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-700', blue: 'bg-sky-50 text-sky-700' } as const

export function DateBadge({ date, tint = 'teal' }: { date: string; tint?: keyof typeof DATE_TINTS }) {
  const [bg, fg] = DATE_TINTS[tint].split(' ')
  const d = new Date(date)
  return (
    <View className={`size-12 shrink-0 items-center justify-center rounded-xl ${bg}`}>
      <Text className={`text-[10px] font-semibold uppercase ${fg}`}>{d.toLocaleString('en-IN', { month: 'short' })}</Text>
      <Text className={`text-lg font-bold leading-5 ${fg}`}>{d.getDate()}</Text>
    </View>
  )
}

export function Section({ title, icon: Icon, action, children }: {
  title: string; icon?: LucideIcon; action?: { label: string; onPress: () => void; testID: string }; children: ReactNode
}) {
  return (
    <View className="gap-2.5">
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-1.5">
          {Icon && <Icon size={16} color={COLORS.primary} />}
          <Text accessibilityRole="header" className="text-base font-bold text-foreground">{title}</Text>
        </View>
        {action && (
          <Pressable onPress={action.onPress} testID={action.testID} accessibilityRole="button" hitSlop={12}>
            <Text className="text-xs font-semibold text-primary">{action.label} ›</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  )
}

export function Row({ children, className = '', onPress, testID }: {
  children: ReactNode; className?: string; onPress?: () => void; testID?: string
}) {
  const cls = `flex-row items-center gap-3 px-4 py-3 ${className}`
  return onPress
    ? <Pressable onPress={onPress} testID={testID} accessibilityRole="button" className={`${cls} active:bg-muted`}>{children}</Pressable>
    : <View testID={testID} className={cls}>{children}</View>
}

// Thin divider between rows inside a Panel.
export function Divider() {
  return <View className="h-px bg-border" />
}

const TONES = {
  muted: 'bg-muted text-muted-foreground', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700',
  red: 'bg-rose-50 text-rose-700', teal: 'bg-teal-50 text-teal-700', blue: 'bg-sky-50 text-sky-700',
} as const
export type Tone = keyof typeof TONES

export function Chip({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  const [bg, fg] = TONES[tone].split(' ')
  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${bg}`}>
      <Text className={`text-[11px] font-medium ${fg}`}>{children}</Text>
    </View>
  )
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <View accessibilityRole="alert" testID="error-alert" className="rounded-xl bg-rose-50 px-4 py-3">
      <Text className="text-sm text-rose-700">{children}</Text>
    </View>
  )
}

export function Empty({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <Panel className="items-center gap-1.5 px-6 py-8">
      <IconBadge icon={Icon} size={52} round className="mb-1.5" />
      <Text className="text-center text-sm font-semibold text-foreground">{title}</Text>
      {hint && <Text className="text-center text-xs text-muted-foreground">{hint}</Text>}
    </Panel>
  )
}

// Circular progress, e.g. attendance %. Green ≥ 90, teal ≥ 75, amber below; grey when unknown.
export function Ring({ pct, size = 72, stroke = 7, children }: { pct: number | null; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, pct ?? 0))
  const tone = pct === null ? COLORS.muted : v >= 90 ? COLORS.green : v >= 75 ? COLORS.primary : COLORS.amber
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.muted} strokeWidth={stroke} />
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c}`} strokeDashoffset={c - (v / 100) * c} />
      </Svg>
      {children}
    </View>
  )
}

export function Avatar({ name, color, className = 'size-10 bg-teal-600', textClassName = 'text-sm text-white' }: {
  name: string; color?: string; className?: string; textClassName?: string
}) {
  return (
    <View style={color ? { backgroundColor: color } : undefined} className={`items-center justify-center rounded-full ${className}`}>
      <Text className={`font-bold ${textClassName}`}>{initials(name)}</Text>
    </View>
  )
}

export function Button({ label, onPress, loading = false, disabled = false, variant = 'primary', testID }: {
  label: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'outline'; testID: string
}) {
  const off = disabled || loading
  const base = variant === 'primary' ? 'bg-primary active:opacity-90' : 'border border-border bg-card active:bg-muted'
  return (
    <Pressable onPress={onPress} disabled={off} testID={testID} accessibilityRole="button" accessibilityState={{ disabled: off, busy: loading }}
      className={`h-12 flex-row items-center justify-center rounded-xl px-4 ${base} ${off ? 'opacity-60' : ''}`}>
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? '#fff' : COLORS.primary} />
        : <Text className={`text-base font-semibold ${variant === 'primary' ? 'text-primary-foreground' : 'text-foreground'}`}>{label}</Text>}
    </Pressable>
  )
}

// EN / తెలుగు segmented control (More tab and login).
export function LangToggle() {
  const { lang, setLang } = useSession()
  const t = useT()
  const options: { value: Lang; text: string; label: string }[] = [
    { value: 'en', text: 'EN', label: t.more.langEnglish },
    { value: 'te', text: t.more.langTelugu, label: t.more.langTelugu },
  ]
  return (
    <View className="flex-row rounded-lg bg-muted p-0.5">
      {options.map(o => {
        const selected = (lang ?? 'en') === o.value
        return (
          <Pressable key={o.value} onPress={() => setLang(o.value)} testID={`lang-${o.value}`}
            accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={o.label}
            className={`rounded-md px-3 py-1 ${selected ? 'bg-card' : ''}`}>
            <Text className={`text-xs font-semibold ${selected ? 'text-primary' : 'text-muted-foreground'}`}>{o.text}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// Labelled text input. `password` adds a show/hide toggle (same as the web app, #5).
export function Field({ label, password = false, testID, ...input }: TextInputProps & { label: string; password?: boolean; testID: string }) {
  const [shown, setShown] = useState(false)
  const t = useT()
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <View className="h-12 flex-row items-center rounded-xl border border-border bg-card px-3">
        <TextInput
          {...input}
          testID={testID}
          accessibilityLabel={label}
          secureTextEntry={password && !shown}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#9ca3af"
          className="flex-1 text-base text-foreground"
        />
        {password && (
          <Pressable onPress={() => setShown(s => !s)} testID={`${testID}-toggle`} hitSlop={10}
            accessibilityRole="button" accessibilityLabel={shown ? t.ui.hidePassword : t.ui.showPassword}>
            {shown ? <EyeOff size={20} color="#6b7280" /> : <Eye size={20} color="#6b7280" />}
          </Pressable>
        )}
      </View>
    </View>
  )
}
