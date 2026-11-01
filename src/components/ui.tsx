import { useEffect, useState, type ReactNode, type Ref } from 'react'
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text as RNText, TextInput, View,
  type PressableProps, type TextInputProps, type TextProps,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Animated, {
  Easing, FadeIn, FadeInDown, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context'
import { useCSSVariable, withUniwind } from 'uniwind'
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Eye, EyeOff, Info, WifiOff, X, type LucideIcon } from 'lucide-react-native'
import { initials } from '@/lib/api'
import { useT, type Strings } from '@/lib/i18n'
import { useSession, type Lang, type ThemePref } from '@/stores/session'

// Shared building blocks. Every screen is built from these so the app looks and
// behaves the same everywhere; colours come only from the tokens in global.css.

// Uniwind only maps className on React Native's core components; third-party
// ones must be wrapped, or classes like flex-1 are silently dropped on native
// (the login screen rendered zero-height on Android).
export const SafeAreaView = withUniwind(RNSafeAreaView)
const AnimatedView = withUniwind(Animated.View)
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// Motion: short, eased, and skipped when the phone asks for reduced motion.
export const MOTION = { fast: 150, base: 220, slow: 300 } as const
const EASE = Easing.out(Easing.cubic)

// ---------------------------------------------------------------- type

// Plus Jakarta Sans ships one file per weight, so the weight class picks the file.
// fontWeight is reset so Android doesn't fake-bold an already bold file.
export const FONTS = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const
function fontFile(className: string) {
  if (/\bfont-(black|extrabold)\b/.test(className)) return FONTS.extrabold
  if (/\bfont-bold\b/.test(className)) return FONTS.bold
  if (/\bfont-semibold\b/.test(className)) return FONTS.semibold
  if (/\bfont-medium\b/.test(className)) return FONTS.medium
  return FONTS.regular
}
// Phones keep the splash up until the font is loaded; a browser draws at once, so give it a sans-serif fallback.
export const fontFor = (className = '') => Platform.OS === 'web' ? `${fontFile(className)}, system-ui, sans-serif` : fontFile(className)

// Drop-in replacement for React Native's Text that applies the app typeface.
export function Text({ className = '', style, ...rest }: TextProps) {
  return <RNText {...rest} className={className} style={[{ fontFamily: fontFor(className), fontWeight: 'normal' }, style]} />
}

// ---------------------------------------------------------------- haptics

// Light, meaningful taps only: selection changes, primary actions, success.
const canBuzz = Platform.OS === 'ios' || Platform.OS === 'android'
export const haptic = {
  select: () => { if (canBuzz) Haptics.selectionAsync().catch(() => {}) },
  tap: () => { if (canBuzz) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) },
  success: () => { if (canBuzz) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) },
  warn: () => { if (canBuzz) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}) },
}

// ---------------------------------------------------------------- colours

// JS name → CSS token and its light-theme value (used until the stylesheet answers).
const PALETTE = {
  primary: ['--color-primary', '#0d7d76'], primaryForeground: ['--color-primary-foreground', '#ffffff'],
  primarySoft: ['--color-primary-soft', '#e3f3f1'], brand: ['--color-brand', '#0d7d76'], brandDeep: ['--color-brand-deep', '#08524d'],
  onBrand: ['--color-on-brand', '#ffffff'], ink: ['--color-ink', '#13233a'], inkDeep: ['--color-ink-deep', '#0a1424'],
  onInk: ['--color-on-ink', '#f4f7fb'], accent: ['--color-accent', '#6544d6'], background: ['--color-background', '#f4f6f9'],
  card: ['--color-card', '#ffffff'], foreground: ['--color-foreground', '#0e1726'], muted: ['--color-muted', '#eceff3'],
  mutedForeground: ['--color-muted-foreground', '#556070'], subtle: ['--color-subtle-foreground', '#949daa'],
  border: ['--color-border', '#e4e8ed'], success: ['--color-success', '#0d7a4c'], successGraphic: ['--color-success-graphic', '#18a66b'],
  warning: ['--color-warning', '#8a5000'], warningGraphic: ['--color-warning-graphic', '#f2a227'], danger: ['--color-danger', '#be2537'],
  dangerGraphic: ['--color-danger-graphic', '#e4485b'], info: ['--color-info', '#1b64ab'], infoGraphic: ['--color-info-graphic', '#3a88d6'],
} as const
type ColorName = keyof typeof PALETTE
const NAMES = Object.keys(PALETTE) as ColorName[]
const VARS = NAMES.map(n => PALETTE[n][0])

// Theme colours as hex strings, for props that can't take a className
// (icons, SVG, navigation options). Re-renders when the theme changes.
export function useColors(): Record<ColorName, string> {
  const values = useCSSVariable(VARS)
  return Object.fromEntries(NAMES.map((n, i) => [n, typeof values[i] === 'string' && values[i] ? values[i] : PALETTE[n][1]])) as Record<ColorName, string>
}
export type Colors = ReturnType<typeof useColors>

const TONES = {
  muted: { bg: 'bg-muted', fg: 'text-muted-foreground', color: 'mutedForeground' },
  green: { bg: 'bg-success-soft', fg: 'text-success', color: 'success' },
  amber: { bg: 'bg-warning-soft', fg: 'text-warning', color: 'warning' },
  red: { bg: 'bg-danger-soft', fg: 'text-danger', color: 'danger' },
  teal: { bg: 'bg-primary-soft', fg: 'text-primary', color: 'primary' },
  blue: { bg: 'bg-info-soft', fg: 'text-info', color: 'info' },
  violet: { bg: 'bg-accent-soft', fg: 'text-accent', color: 'accent' },
} as const satisfies Record<string, { bg: string; fg: string; color: keyof Colors }>
export type Tone = keyof typeof TONES
export const toneClasses = (tone: Tone) => TONES[tone]

// Older names some screens use for the same tints (#10): 'rose' is the danger tone.
export type Tint = 'teal' | 'green' | 'blue' | 'violet' | 'amber' | 'rose' | 'muted'
const TINT_TONE: Record<Tint, Tone> = { teal: 'teal', green: 'green', blue: 'blue', violet: 'violet', amber: 'amber', rose: 'red', muted: 'muted' }

// Static brand values for code that runs outside React; inside components prefer useColors().
export const COLORS = { primary: '#0d7d76', muted: '#e4e8ed', green: '#18a66b', amber: '#f2a227', red: '#be2537' }
// Soft lift for one-off cards built from a View; Panel and the shadow-card class do the same.
export const CARD_SHADOW = { boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 14px rgba(16, 24, 40, 0.05)' }

// Ring/bar colour for a percentage: green ≥ 90, teal ≥ 75, amber below; muted when unknown.
export function scoreColor(c: Colors, pct: number | null, failed = false) {
  if (failed) return c.dangerGraphic
  if (pct === null) return c.border
  return pct >= 90 ? c.successGraphic : pct >= 75 ? c.primary : c.warningGraphic
}
export const scoreBarClass = (pct: number | null, failed = false) =>
  failed ? 'bg-danger-graphic' : pct === null ? 'bg-border' : pct >= 90 ? 'bg-success-graphic' : pct >= 75 ? 'bg-primary' : 'bg-warning-graphic'

// "Network request failed" is what a phone with no signal gets; say that in the parent's language.
export function friendlyError(message: string, t: Strings) {
  if (/network request failed|failed to fetch|network error|load failed/i.test(message)) return t.ui.offline
  if (/request failed \(5\d\d\)/i.test(message)) return t.ui.serverError
  return message
}

// ---------------------------------------------------------------- brand

// The app icon's bold white W on teal, drawn in code so it stays sharp at any size.
export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3 }}
      className="items-center justify-center border border-white/25 bg-white/15" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={{ fontSize: size * 0.54, lineHeight: size * 0.68 }} className="font-extrabold tracking-tighter text-on-brand">W</Text>
    </View>
  )
}

// The brand surface behind the sign-in screens and the launch screen: one flat colour.
// 'ink' is the deep blue kept for money. No gradient, no decoration.
export function BrandBackdrop({ tone = 'brand' }: { tone?: 'brand' | 'ink' }) {
  return <View className={`absolute inset-0 ${tone === 'ink' ? 'bg-ink' : 'bg-brand'}`} style={{ pointerEvents: 'none' }} />
}

// ---------------------------------------------------------------- layout

// Scrollable page body with pull-to-refresh. Content is capped at a readable
// width and centred, so tablets and the web build don't stretch rows edge to edge.
export function Screen({ children, refreshing = false, onRefresh, testID }: {
  children: ReactNode; refreshing?: boolean; onRefresh?: () => void; testID?: string
}) {
  const c = useColors()
  return (
    <ScrollView
      testID={testID}
      className="flex-1 bg-background"
      contentContainerClassName="w-full max-w-2xl self-center gap-6 px-4 pb-10 pt-2"
      keyboardShouldPersistTaps="handled"
      // Lets iOS large titles tuck into the bar as the page scrolls.
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh
        ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} progressBackgroundColor={c.card} />
        : undefined}>
      {children}
    </ScrollView>
  )
}

// A grouped surface: the card colour on the page colour, nothing more. Dark mode adds a
// hairline because tone alone is subtle there. No shadows: separation comes from tone.
export function Panel({ children, className = '', testID }: { children: ReactNode; className?: string; testID?: string }) {
  return <View testID={testID} className={`rounded-2xl bg-card dark:border dark:border-border ${className}`}>{children}</View>
}

// Fades and lifts its content in once; `index` staggers a list so it cascades.
export function FadeInView({ children, className = '', index }: { children: ReactNode; className?: string; index?: number }) {
  const reduce = useReducedMotion()
  const entering = reduce ? undefined : index !== undefined
    ? FadeInDown.duration(MOTION.slow).delay(Math.min(index, 8) * 45).easing(EASE)
    : FadeIn.duration(MOTION.base)
  return <AnimatedView entering={entering} className={className}>{children}</AnimatedView>
}

// A titled group. The title is a plain label, not a decorated header; `icon` is accepted
// for older callers and deliberately not drawn.
export function Section({ title, action, children }: {
  title: string; icon?: LucideIcon; action?: { label: string; onPress: () => void; testID: string }; children: ReactNode
}) {
  return (
    <View className="gap-2">
      <View className="min-h-6 flex-row items-end justify-between px-1">
        <Text accessibilityRole="header" className="shrink text-[15px] font-semibold text-foreground">{title}</Text>
        {action && (
          <Pressable onPress={action.onPress} testID={action.testID} accessibilityRole="button" hitSlop={12} className="active:opacity-60">
            <Text className="text-sm font-medium text-primary">{action.label}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  )
}

export function Row({ children, className = '', onPress, testID, accessibilityLabel }: {
  children: ReactNode; className?: string; onPress?: () => void; testID?: string; accessibilityLabel?: string
}) {
  const cls = `min-h-14 flex-row items-center gap-3 px-4 py-3 ${className}`
  return onPress
    ? <Pressable onPress={onPress} testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel} className={`${cls} active:bg-muted`}>{children}</Pressable>
    : <View testID={testID} className={cls}>{children}</View>
}

// Thin divider between rows inside a Panel, indented past a leading icon when asked.
export function Divider({ inset = false }: { inset?: boolean }) {
  return <View className={`h-px bg-border ${inset ? 'ml-[66px]' : 'ml-4'}`} />
}

// Icons sit on a soft tile in their feature's colour, so each part of the app is recognisable
// at a glance (fees green, quiz violet, calendar blue ...). Tiles are flat: no shadow, no gradient.
const ICON_COLOR: Record<Tone, ColorName> = {
  muted: 'mutedForeground', blue: 'info', violet: 'accent', teal: 'primary', green: 'success', amber: 'warning', red: 'danger',
}
export function IconTile({ icon: Icon, tone = 'muted', size = 'md' }: { icon: LucideIcon; tone?: Tone; size?: 'sm' | 'md' | 'lg' }) {
  const c = useColors()
  const box = size === 'sm' ? 32 : size === 'lg' ? 56 : 38
  return (
    <View style={{ width: box, height: box }} className={`shrink-0 items-center justify-center ${size === 'lg' ? 'rounded-2xl' : 'rounded-xl'} ${toneClasses(tone).bg}`}>
      <Icon size={Math.round(box * 0.52)} color={c[ICON_COLOR[tone]]} strokeWidth={2} />
    </View>
  )
}

// The same tile for older callers that size by pixels.
export function IconBadge({ icon: Icon, tint = 'muted', size = 36, round = false, className = '' }: {
  icon: LucideIcon; tint?: Tint; size?: number; round?: boolean; onTint?: boolean; className?: string
}) {
  const c = useColors()
  const tone = TINT_TONE[tint]
  return (
    <View style={{ width: size, height: size }} className={`shrink-0 items-center justify-center ${round ? 'rounded-full' : 'rounded-xl'} ${toneClasses(tone).bg} ${className}`}>
      <Icon size={Math.round(size * 0.52)} color={c[ICON_COLOR[tone]]} strokeWidth={2} />
    </View>
  )
}

// A date set as type: the day large, the month small above. `tint` is accepted for older callers.
export function DateBadge({ date }: { date: string; tint?: Exclude<Tint, 'muted'> }) {
  const d = new Date(date)
  return (
    <View className="w-10 shrink-0 items-center">
      <Text className="text-[11px] font-medium text-muted-foreground">{d.toLocaleString('en-IN', { month: 'short' })}</Text>
      <Text className="text-xl font-bold leading-6 text-foreground">{d.getDate()}</Text>
    </View>
  )
}

// Standard list row: icon tile, title and subtitle, a trailing slot, and a chevron when it navigates.
export function ListItem({ icon, tone, title, subtitle, trailing, onPress, testID, danger = false }: {
  icon?: LucideIcon; tone?: Tone; title: string; subtitle?: string; trailing?: ReactNode; onPress?: () => void; testID?: string; danger?: boolean
}) {
  const c = useColors()
  return (
    <Row onPress={onPress} testID={testID} accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}>
      {icon && <IconTile icon={icon} tone={danger ? 'red' : tone ?? 'muted'} size="sm" />}
      <View className="flex-1">
        <Text className={`text-base ${danger ? 'text-danger' : 'text-foreground'}`} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-[13px] text-muted-foreground" numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {trailing}
      {onPress && !danger && <ChevronRight size={18} color={c.subtle} />}
    </Row>
  )
}

// ---------------------------------------------------------------- feedback

export function Loading({ label }: { label?: string }) {
  const t = useT()
  const c = useColors()
  return (
    <View className="items-center gap-3 py-12" accessible accessibilityRole="progressbar" accessibilityLabel={label ?? t.ui.loading}>
      <ActivityIndicator color={c.primary} />
      {label ? <Text className="text-sm text-muted-foreground">{label}</Text> : null}
    </View>
  )
}

// Pulsing placeholder block, shown while a screen's first data loads.
export function Skeleton({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion()
  const o = useSharedValue(1)
  useEffect(() => {
    if (!reduce) o.set(withRepeat(withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true))
  }, [reduce, o])
  const style = useAnimatedStyle(() => ({ opacity: o.get() }))
  return <AnimatedView style={style} className={`rounded-xl bg-muted ${className}`} />
}

// A screen-shaped skeleton: a summary card and a few rows.
export function ScreenSkeleton({ rows = 4 }: { rows?: number }) {
  const t = useT()
  return (
    <View className="gap-5" accessible accessibilityRole="progressbar" accessibilityLabel={t.ui.loading} testID="screen-skeleton">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Panel className="overflow-hidden">
        {Array.from({ length: rows }, (_, i) => (
          <View key={i}>
            {i > 0 && <Divider />}
            <View className="flex-row items-center gap-3.5 px-4 py-4">
              <Skeleton className="size-6 rounded-md" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </View>
            </View>
          </View>
        ))}
      </Panel>
    </View>
  )
}

export function Chip({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <View className={`self-start rounded-md px-1.5 py-0.5 ${TONES[tone].bg}`}>
      <Text className={`text-xs font-semibold ${TONES[tone].fg}`}>{children}</Text>
    </View>
  )
}

const ALERT = {
  danger: { cls: 'bg-danger-soft', fg: 'text-danger', icon: AlertCircle, color: 'danger' },
  warning: { cls: 'bg-warning-soft', fg: 'text-warning', icon: AlertTriangle, color: 'warning' },
  info: { cls: 'bg-info-soft', fg: 'text-info', icon: Info, color: 'info' },
  success: { cls: 'bg-success-soft', fg: 'text-success', icon: CheckCircle2, color: 'success' },
} as const

// Inline message. Errors are announced to screen readers; an action gives a way out (retry).
export function Alert({ children, tone = 'danger', action }: {
  children: ReactNode; tone?: keyof typeof ALERT; action?: { label: string; onPress: () => void; testID?: string }
}) {
  const t = useT()
  const c = useColors()
  const a = ALERT[tone]
  const text = typeof children === 'string' ? friendlyError(children, t) : children
  const Icon = typeof children === 'string' && text === t.ui.offline ? WifiOff : a.icon
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" testID={tone === 'danger' ? 'error-alert' : `alert-${tone}`}
      className={`flex-row items-start gap-3 rounded-xl px-4 py-3 ${a.cls}`}>
      <View className="pt-0.5"><Icon size={18} color={c[a.color]} /></View>
      <View className="flex-1 gap-2">
        <Text className={`text-sm leading-5 ${a.fg}`}>{text}</Text>
        {action && (
          <Pressable onPress={action.onPress} testID={action.testID} accessibilityRole="button" hitSlop={8} className="self-start">
            <Text className={`text-sm font-bold underline ${a.fg}`}>{action.label}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

// Full-panel error with a retry button, for when a screen has nothing else to show.
export function ErrorState({ message, onRetry, busy = false }: { message: string; onRetry?: () => void; busy?: boolean }) {
  const t = useT()
  const text = friendlyError(message, t)
  const offline = text === t.ui.offline
  return (
    <Panel className="items-center gap-3 px-6 py-10" testID="error-alert">
      <IconTile icon={offline ? WifiOff : AlertCircle} tone={offline ? 'muted' : 'red'} size="lg" />
      <Text accessibilityRole="alert" className="text-center text-base font-semibold text-foreground">{offline ? t.ui.offlineTitle : t.ui.errorTitle}</Text>
      <Text className="text-center text-sm leading-5 text-muted-foreground">{text}</Text>
      {onRetry && <View className="mt-2 w-full max-w-60"><Button label={t.tryAgain} onPress={onRetry} loading={busy} variant="secondary" testID="retry-btn" /></View>}
    </Panel>
  )
}

export function Empty({ icon: Icon, title, hint, action }: {
  icon: LucideIcon; title: string; hint?: string; action?: { label: string; onPress: () => void; testID: string }
}) {
  return (
    <Panel className="items-center gap-1.5 px-6 py-8">
      <View className="mb-1"><IconTile icon={Icon} size="lg" /></View>
      <Text className="text-center text-base font-semibold text-foreground">{title}</Text>
      {hint && <Text className="text-center text-sm leading-5 text-muted-foreground">{hint}</Text>}
      {action && <View className="mt-3 w-full max-w-60"><Button label={action.label} onPress={action.onPress} variant="secondary" testID={action.testID} /></View>}
    </Panel>
  )
}

// Circular progress that sweeps in once. Colour follows scoreColor(); grey track when unknown.
// `track`/`color` override the colours for rings drawn on a gradient hero.
export function Ring({ pct, size = 72, stroke = 7, failed = false, track, color, children }: {
  pct: number | null; size?: number; stroke?: number; failed?: boolean; track?: string; color?: string; children?: ReactNode
}) {
  const c = useColors()
  const reduce = useReducedMotion()
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, pct ?? 0))
  const progress = useSharedValue(reduce ? v : 0)
  useEffect(() => {
    progress.set(reduce ? v : withTiming(v, { duration: 900, easing: EASE }))
  }, [v, reduce, progress])
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circ - (progress.get() / 100) * circ }))
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? c.muted} strokeWidth={stroke} />
        {pct !== null && (
          <AnimatedCircle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color ?? scoreColor(c, v, failed)} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${circ}`} animatedProps={animatedProps} />
        )}
      </Svg>
      {children}
    </View>
  )
}

// Thin horizontal progress bar that grows in once.
export function Bar({ pct, className = 'bg-primary', label, track = 'bg-muted' }: { pct: number; className?: string; label?: string; track?: string }) {
  const reduce = useReducedMotion()
  const v = Math.max(0, Math.min(100, pct))
  const w = useSharedValue(reduce ? v : 0)
  useEffect(() => { w.set(reduce ? v : withTiming(v, { duration: 800, easing: EASE })) }, [v, reduce, w])
  const style = useAnimatedStyle(() => ({ width: `${w.get()}%` }))
  return (
    <View className={`h-2 w-full overflow-hidden rounded-full ${track}`} accessibilityRole="progressbar" accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v) }}>
      <AnimatedView className={`h-full rounded-full ${className}`} style={style} />
    </View>
  )
}

export function Avatar({ name, color, className = 'size-10 bg-primary-soft', textClassName = 'text-sm text-primary' }: {
  name: string; color?: string; className?: string; textClassName?: string
}) {
  return (
    <View style={color ? { backgroundColor: color } : undefined} className={`items-center justify-center rounded-full ${className}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text className={`font-bold ${textClassName}`}>{initials(name)}</Text>
    </View>
  )
}

// Small count bubble, e.g. unread notifications.
export function CountBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <View className={`min-w-[18px] items-center justify-center rounded-full bg-danger-graphic px-1 py-px ${className}`}>
      <Text className="text-[10px] font-bold text-white">{count > 99 ? '99+' : count}</Text>
    </View>
  )
}

// ---------------------------------------------------------------- controls

// Pressable that dips slightly while held. The scale is skipped under reduced motion.
export function PressableScale({ children, className = '', containerClassName = '', onPressIn, onPressOut, ...rest }: PressableProps & {
  children: ReactNode; className?: string; containerClassName?: string
}) {
  const reduce = useReducedMotion()
  const s = useSharedValue(1)
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }))
  return (
    <AnimatedView style={style} className={containerClassName}>
      <Pressable
        {...rest}
        onPressIn={e => { if (!reduce) s.set(withTiming(0.97, { duration: 90, easing: EASE })); onPressIn?.(e) }}
        onPressOut={e => { s.set(withTiming(1, { duration: MOTION.fast, easing: EASE })); onPressOut?.(e) }}
        className={className}>
        {children}
      </Pressable>
    </AnimatedView>
  )
}

const BUTTON = {
  primary: { box: 'bg-primary', text: 'text-primary-foreground', spinner: 'primaryForeground' },
  secondary: { box: 'bg-primary-soft', text: 'text-primary', spinner: 'primary' },
  outline: { box: 'border-[1.5px] border-input bg-card', text: 'text-foreground', spinner: 'primary' },
  ghost: { box: 'bg-transparent', text: 'text-primary', spinner: 'primary' },
  danger: { box: 'bg-danger-soft', text: 'text-danger', spinner: 'danger' },
} as const satisfies Record<string, { box: string; text: string; spinner: keyof Colors }>

// Loading keeps the label next to the spinner so the button still says what it is doing,
// and a busy or disabled button can't be pressed twice.
export function Button({ label, onPress, loading = false, disabled = false, variant = 'primary', size = 'md', icon: Icon, testID }: {
  label: string; onPress: () => void; loading?: boolean; disabled?: boolean
  variant?: keyof typeof BUTTON; size?: 'md' | 'sm'; icon?: LucideIcon; testID: string
}) {
  const c = useColors()
  const off = disabled || loading
  const v = BUTTON[variant]
  return (
    <PressableScale onPress={() => { if (variant === 'primary') haptic.tap(); onPress() }} disabled={off} testID={testID} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy: loading }}
      className={`${size === 'sm' ? 'h-10 rounded-lg px-3.5' : 'h-[50px] rounded-xl px-5'} flex-row items-center justify-center gap-2 ${v.box} ${off && !loading ? 'opacity-45' : ''}`}>
      {loading ? <ActivityIndicator size="small" color={c[v.spinner]} /> : Icon ? <Icon size={19} color={c[v.spinner]} strokeWidth={2.2} /> : null}
      <Text numberOfLines={1} className={`${size === 'sm' ? 'text-sm' : 'text-base'} font-bold ${v.text}`}>{label}</Text>
    </PressableScale>
  )
}

export type SegmentOption<T extends string> = { value: T; label: string; testID: string; badge?: number; accessibilityLabel?: string }

// Segmented control used for in-screen tabs and small settings (language, theme).
export function Segmented<T extends string>({ options, value, onChange, size = 'md', role = 'tab', className = '' }: {
  options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; size?: 'md' | 'sm'; role?: 'tab' | 'button'; className?: string
}) {
  return (
    <View className={`flex-row rounded-xl bg-muted p-0.5 ${className}`} accessibilityRole={role === 'tab' ? 'tablist' : undefined}>
      {options.map(o => {
        const selected = o.value === value
        return (
          <Pressable key={o.value} onPress={() => { if (!selected) haptic.select(); onChange(o.value) }} testID={o.testID}
            accessibilityRole={role} accessibilityState={{ selected }} accessibilityLabel={o.accessibilityLabel ?? o.label}
            className={`${size === 'sm' ? 'min-h-8 px-3' : 'min-h-11 flex-1 px-2'} flex-row items-center justify-center gap-1.5 rounded-[10px] ${selected ? 'bg-card dark:bg-elevated' : 'active:opacity-70'}`}>
            <Text numberOfLines={1} className={`${size === 'sm' ? 'text-xs' : 'text-sm'} font-semibold ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>{o.label}</Text>
            {o.badge ? (
              <View className="min-w-[18px] items-center rounded-full bg-warning-graphic px-1">
                <Text className="text-[10px] font-bold text-black">{o.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )
}

// EN / తెలుగు switch (More tab and login).
export function LangToggle({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { lang, setLang } = useSession()
  const t = useT()
  return (
    <Segmented<Lang> size={size} role="button" value={lang ?? 'en'} onChange={setLang} options={[
      { value: 'en', label: 'English', testID: 'lang-en', accessibilityLabel: t.more.langEnglish },
      { value: 'te', label: t.more.langTelugu, testID: 'lang-te', accessibilityLabel: t.more.langTelugu },
    ]} />
  )
}

// System / Light / Dark switch (More tab).
export function ThemeToggle() {
  const { theme, setTheme } = useSession()
  const t = useT()
  return (
    <Segmented<ThemePref> role="button" value={theme ?? 'system'} onChange={setTheme} options={[
      { value: 'system', label: t.more.themeSystem, testID: 'theme-system' },
      { value: 'light', label: t.more.themeLight, testID: 'theme-light' },
      { value: 'dark', label: t.more.themeDark, testID: 'theme-dark' },
    ]} />
  )
}

// Labelled text input with focus ring, hint and inline error.
// `password` adds a show/hide toggle (same as the web app, #5).
export function Field({ label, password = false, required = false, hint, error, icon: Icon, inputRef, testID, onFocus, onBlur, ...input }: TextInputProps & {
  label: string; password?: boolean; required?: boolean; hint?: string; error?: string; icon?: LucideIcon; inputRef?: Ref<TextInput>; testID: string
}) {
  const [shown, setShown] = useState(false)
  const [focused, setFocused] = useState(false)
  const t = useT()
  const c = useColors()
  const border = error ? 'border-danger bg-danger-soft/40' : focused ? 'border-primary bg-card' : 'border-transparent bg-muted'
  return (
    <View className="gap-2">
      <Text className="text-[13px] font-semibold text-foreground">
        {label}{required ? <Text className="text-danger" accessibilityLabel={t.ui.required}> *</Text> : null}
      </Text>
      <View className={`h-[50px] flex-row items-center gap-3 rounded-xl border-[1.5px] px-4 ${border}`}>
        {Icon && <Icon size={19} color={error ? c.danger : focused ? c.primary : c.mutedForeground} />}
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          {...input}
          ref={inputRef}
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          aria-invalid={!!error}
          secureTextEntry={password && !shown}
          placeholderTextColor={c.subtle}
          selectionColor={c.primary}
          cursorColor={c.primary}
          onFocus={e => { setFocused(true); onFocus?.(e) }}
          onBlur={e => { setFocused(false); onBlur?.(e) }}
          className="h-full flex-1 text-base text-foreground"
          style={{ fontFamily: FONTS.medium, outlineStyle: 'none' } as object}
        />
        {password && (
          <Pressable onPress={() => setShown(s => !s)} testID={`${testID}-toggle`} hitSlop={12}
            accessibilityRole="button" accessibilityLabel={shown ? t.ui.hidePassword : t.ui.showPassword}
            className="size-9 items-center justify-center rounded-full active:bg-muted">
            {shown ? <EyeOff size={20} color={c.mutedForeground} /> : <Eye size={20} color={c.mutedForeground} />}
          </Pressable>
        )}
      </View>
      {error
        ? <Text className="text-xs font-semibold text-danger" accessibilityLiveRegion="polite">{error}</Text>
        : hint ? <Text className="text-xs text-muted-foreground">{hint}</Text> : null}
    </View>
  )
}

// ---------------------------------------------------------------- overlays

// Bottom sheet: dims the screen, slides up, closes on the backdrop, the X or Android back.
export function Sheet({ title, subtitle, onClose, children, testID }: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode; testID?: string
}) {
  const t = useT()
  const c = useColors()
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-overlay" onPress={onClose} accessibilityRole="button" accessibilityLabel={t.close} testID={testID ? `${testID}-backdrop` : undefined} />
        <SafeAreaView edges={['bottom']} className="w-full max-w-2xl self-center rounded-t-3xl bg-background" testID={testID} accessibilityViewIsModal>
          <View className="items-center pt-3"><View className="h-1.5 w-11 rounded-full bg-input" /></View>
          <View className="gap-5 px-6 pb-6 pt-4">
            <View className="flex-row items-start gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-xl font-bold tracking-tight text-foreground" accessibilityRole="header">{title}</Text>
                {subtitle ? <Text className="text-sm leading-5 text-muted-foreground">{subtitle}</Text> : null}
              </View>
              <Pressable onPress={onClose} hitSlop={10} testID={testID ? `${testID}-close` : 'sheet-close'} accessibilityRole="button" accessibilityLabel={t.close}
                className="size-9 items-center justify-center rounded-full bg-muted active:opacity-70">
                <X size={18} color={c.mutedForeground} />
              </Pressable>
            </View>
            {children}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// Centred confirmation for destructive actions. Cancel is first and the safe default.
export function ConfirmDialog({ visible, title, message, confirmLabel, onConfirm, onCancel, destructive = true, busy = false, testID }: {
  visible: boolean; title: string; message?: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void
  destructive?: boolean; busy?: boolean; testID: string
}) {
  const t = useT()
  useEffect(() => { if (visible && destructive) haptic.warn() }, [visible, destructive])
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent navigationBarTranslucent>
      <View className="flex-1 items-center justify-center px-6">
        <Pressable className="absolute inset-0 bg-overlay" onPress={onCancel} accessibilityRole="button" accessibilityLabel={t.cancel} />
        <View className="w-full max-w-sm gap-5 rounded-2xl bg-elevated p-5" testID={testID} accessibilityViewIsModal>
          <View className="gap-2">
            <Text className="text-xl font-bold tracking-tight text-foreground" accessibilityRole="header">{title}</Text>
            {message ? <Text className="text-sm leading-5 text-muted-foreground">{message}</Text> : null}
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1"><Button label={t.cancel} onPress={onCancel} variant="outline" testID={`${testID}-cancel`} /></View>
            <View className="flex-1"><Button label={confirmLabel} onPress={onConfirm} variant={destructive ? 'danger' : 'primary'} loading={busy} testID={`${testID}-confirm`} /></View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
