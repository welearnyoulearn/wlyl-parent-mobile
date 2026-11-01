import type { ReactNode } from 'react'
import { KeyboardAvoidingView, ScrollView, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated'
import type { LucideIcon } from 'lucide-react-native'
import { BrandBackdrop, BrandMark, LangToggle, SafeAreaView, Text } from '@/components/ui'
import { useT } from '@/lib/i18n'

// The frame for every sign-in screen (sign in, forgot password, first-login password, birthday):
// the teal band with the screen's mark, title and one line of help, and a sheet below that rises
// into place holding the form. `step` shows where the parent is in the first-login flow.
export function AuthShell({ icon: Icon, brand = false, title, subtitle, step, children, testID }: {
  icon?: LucideIcon; brand?: boolean; title: string; subtitle?: string; step?: { n: number; of: number }; children: ReactNode; testID?: string
}) {
  const t = useT()
  const still = useReducedMotion()
  const hero = still ? undefined : FadeIn.duration(450)
  const sheet = still ? undefined : FadeInDown.duration(500).delay(80).springify().damping(18)

  return (
    <View className="flex-1 bg-background" testID={testID}>
      <StatusBar style="light" />
      {/* Android 15+ draws edge-to-edge and no longer resizes for the keyboard, so pad on both platforms. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled" bounces={false}>
          <SafeAreaView edges={['top']}>
            <BrandBackdrop />
            {/* Two large quiet rings give the band depth without a gradient. */}
            <View pointerEvents="none" className="absolute -right-24 -top-16 size-72 rounded-full border-[28px] border-white/5" />
            <View pointerEvents="none" className="absolute -left-20 top-40 size-44 rounded-full border-[18px] border-white/5" />

            <View className="w-full max-w-md self-center px-6 pb-14">
              <View className="h-11 flex-row items-center justify-between">
                {step ? (
                  <View className="flex-row items-center gap-2" accessible accessibilityLabel={t.auth.stepOf(step.n, step.of)}>
                    {Array.from({ length: step.of }, (_, i) => (
                      <View key={i} className={`h-1.5 rounded-full ${i < step.n ? 'w-6 bg-white' : 'w-3 bg-white/35'}`} />
                    ))}
                    <Text className="ml-1 text-xs font-semibold text-on-brand/85">{t.auth.stepOf(step.n, step.of)}</Text>
                  </View>
                ) : <View />}
                <LangToggle />
              </View>

              <Animated.View entering={hero} className="items-center gap-3 pt-6">
                {brand ? <BrandMark size={72} /> : Icon ? (
                  <View className="size-[72px] items-center justify-center rounded-[22px] bg-white/15">
                    <Icon size={34} color="#ffffff" strokeWidth={1.8} />
                  </View>
                ) : null}
                <Text accessibilityRole="header" className="text-center text-[26px] font-bold leading-8 tracking-tight text-on-brand">{title}</Text>
                {subtitle ? <Text className="max-w-xs text-center text-[15px] leading-[21px] text-on-brand/85">{subtitle}</Text> : null}
              </Animated.View>
            </View>
          </SafeAreaView>

          <Animated.View entering={sheet} className="-mt-8 flex-1 rounded-t-[28px] bg-background">
            <SafeAreaView edges={['bottom']} className="flex-1">
              <View className="w-full max-w-md flex-1 gap-4 self-center px-6 pb-6 pt-8">{children}</View>
            </SafeAreaView>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
