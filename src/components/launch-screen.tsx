import { useEffect, useState } from 'react'
import { Image, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Animated, {
  Easing, FadeIn, FadeInDown, FadeOutUp, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence,
  withSpring, withTiming, runOnJS,
} from 'react-native-reanimated'
import { BadgeIndianRupee, CalendarCheck, GraduationCap, Megaphone, type LucideIcon } from 'lucide-react-native'
import { Text } from '@/components/ui'
import { useT } from '@/lib/i18n'

// The first thing a parent sees after the native splash: the same rose and logo, which then come
// alive. A row of icons shows what the app does, one line at a time, while a yellow bar fills as the
// account loads. The colours are fixed (not theme tokens) so the hand-off from the native splash,
// which is always #B5365A, never flashes in dark mode.
const ROSE = '#B5365A'
const TEAL = '#0d7d76'
const SUN = '#F5A623'
const LOGO = require('../../assets/images/splash-icon.png')

const TIPS: { icon: LucideIcon; color: string }[] = [
  { icon: BadgeIndianRupee, color: TEAL },
  { icon: CalendarCheck, color: '#c77d0a' },
  { icon: GraduationCap, color: ROSE },
  { icon: Megaphone, color: TEAL },
]
const TIP_MS = 1000
export const LAUNCH_MIN_MS = 2800
const LAUNCH_MAX_MS = 8000

// A soft coloured disc that drifts slowly behind everything.
function Drift({ size, color, opacity, x, y, dx, dy, ms }: { size: number; color: string; opacity: number; x: number; y: number; dx: number; dy: number; ms: number }) {
  const still = useReducedMotion()
  const t = useSharedValue(0)
  useEffect(() => {
    if (still) return
    t.set(withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true))
    return () => cancelAnimation(t)
  }, [still, ms, t])
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: dx * t.get() }, { translateY: dy * t.get() }, { scale: 1 + 0.08 * t.get() }] }))
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity }, style]} />
}

// One icon in a white bubble. The active one pops up with a yellow ring.
function TipBadge({ icon: Icon, color, active, index }: { icon: LucideIcon; color: string; active: boolean; index: number }) {
  const still = useReducedMotion()
  const on = useSharedValue(0)
  const enter = useSharedValue(still ? 1 : 0)
  useEffect(() => { if (!still) enter.set(withDelay(500 + index * 130, withSpring(1, { damping: 11, stiffness: 160 }))) }, [still, index, enter])
  useEffect(() => { on.set(still ? (active ? 1 : 0) : withSpring(active ? 1 : 0, { damping: 12, stiffness: 190 })) }, [active, still, on])
  const style = useAnimatedStyle(() => ({
    opacity: enter.get() * (0.55 + 0.45 * on.get()),
    transform: [{ scale: enter.get() * (1 + 0.14 * on.get()) }, { translateY: -6 * on.get() }],
  }))
  return (
    <Animated.View style={[{ width: 58, height: 58, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: active ? SUN : 'transparent' }, style]}>
      <Icon size={28} color={color} strokeWidth={2.2} />
    </Animated.View>
  )
}

// Yellow progress that creeps toward 90% while loading and snaps to full when ready.
function LoadBar({ ready }: { ready: boolean }) {
  const still = useReducedMotion()
  const p = useSharedValue(still ? 0.4 : 0.04)
  useEffect(() => {
    if (ready) p.set(withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }))
    else if (!still) p.set(withTiming(0.9, { duration: LAUNCH_MIN_MS, easing: Easing.out(Easing.quad) }))
  }, [ready, still, p])
  const fill = useAnimatedStyle(() => ({ width: `${p.get() * 100}%` }))
  return (
    <View style={{ width: 220, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' }}>
      <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: SUN }, fill]} />
    </View>
  )
}

export function LaunchScreen({ ready = false }: { ready?: boolean }) {
  const t = useT()
  const still = useReducedMotion()
  const [tip, setTip] = useState(0)
  useEffect(() => {
    if (still) return
    const id = setInterval(() => setTip(i => (i + 1) % TIPS.length), TIP_MS)
    return () => clearInterval(id)
  }, [still])

  // Logo springs in, then floats gently.
  const logoIn = useSharedValue(still ? 1 : 0)
  const float = useSharedValue(0)
  useEffect(() => {
    if (still) return
    logoIn.set(withSpring(1, { damping: 10, stiffness: 120 }))
    float.set(withDelay(700, withRepeat(withSequence(withTiming(-7, { duration: 1300, easing: Easing.inOut(Easing.sin) }), withTiming(7, { duration: 1300, easing: Easing.inOut(Easing.sin) })), -1, true)))
    return () => { cancelAnimation(float) }
  }, [still, logoIn, float])
  const logoStyle = useAnimatedStyle(() => ({ opacity: logoIn.get(), transform: [{ scale: 0.55 + 0.45 * logoIn.get() }, { translateY: float.get() }] }))

  return (
    <View style={{ flex: 1, backgroundColor: ROSE, overflow: 'hidden' }} testID="launch-animation"
      accessible accessibilityLabel={t.layout.loadingAccount} accessibilityRole="progressbar">
      {/* White status-bar icons over the rose, in light and dark mode. */}
      <StatusBar style="light" />
      <Drift size={250} color={TEAL} opacity={1} x={-100} y={-90} dx={26} dy={22} ms={5200} />
      <Drift size={240} color={SUN} opacity={0.3} x={230} y={430} dx={-30} dy={-40} ms={4600} />
      <Drift size={170} color="#ffffff" opacity={0.1} x={-40} y={620} dx={30} dy={-20} ms={6000} />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 26 }}>
        <Animated.View style={logoStyle}>
          <Image source={LOGO} style={{ width: 180, height: 180 }} resizeMode="contain" />
        </Animated.View>

        <Animated.View entering={still ? undefined : FadeInDown.duration(500).delay(350)} style={{ alignItems: 'center', gap: 6 }}>
          <Text className="text-center text-xl font-extrabold tracking-tight" style={{ color: '#ffffff' }}>{t.launch.tagline}</Text>
        </Animated.View>

        <View style={{ alignItems: 'center', gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 20, height: 76, alignItems: 'flex-end' }}>
            {TIPS.map((x, i) => <TipBadge key={i} icon={x.icon} color={x.color} active={i === tip} index={i} />)}
          </View>
          <View style={{ height: 24, justifyContent: 'center' }}>
            <Animated.View key={tip} entering={still ? undefined : FadeInDown.duration(260)} exiting={still ? undefined : FadeOutUp.duration(180)}>
              <Text className="text-center text-[15px] font-semibold" style={{ color: '#ffffff' }}>{t.launch.tips[tip]}</Text>
            </Animated.View>
          </View>
        </View>

        <LoadBar ready={ready} />
      </View>

      <Animated.View entering={still ? undefined : FadeIn.duration(600).delay(900)} style={{ alignItems: 'center', paddingBottom: 38, gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' }} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TEAL }} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: SUN }} />
        </View>
        <Text className="text-[13px] font-extrabold" style={{ color: '#ffffff', letterSpacing: 3 }}>{t.launch.brand}</Text>
        <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>{t.launch.brandLine}</Text>
      </Animated.View>
    </View>
  )
}

// Covers the app from the moment the native splash lifts until the account has loaded and the
// animation has had its moment (`minMs`), then fades away. A hard cap means a very slow network
// never traps the parent here: the app's own loading and retry states take over.
export function LaunchOverlay({ ready }: { ready: boolean }) {
  const still = useReducedMotion()
  const [minDone, setMinDone] = useState(false)
  const [capped, setCapped] = useState(false)
  const [gone, setGone] = useState(false)
  const fade = useSharedValue(1)

  useEffect(() => {
    const a = setTimeout(() => setMinDone(true), still ? 600 : LAUNCH_MIN_MS)
    const b = setTimeout(() => setCapped(true), LAUNCH_MAX_MS)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [still])

  const leaving = (ready && minDone) || capped
  useEffect(() => {
    if (!leaving) return
    // Let the bar reach 100% before the curtain lifts.
    fade.set(withDelay(still ? 0 : 280, withTiming(0, { duration: still ? 120 : 380 }, done => { if (done) runOnJS(setGone)(true) })))
  }, [leaving, still, fade])
  const style = useAnimatedStyle(() => ({ opacity: fade.get() }))

  if (gone) return null
  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }, style]} pointerEvents={leaving ? 'none' : 'auto'}>
      <LaunchScreen ready={ready} />
    </Animated.View>
  )
}
