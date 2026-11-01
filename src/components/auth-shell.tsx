import type { ReactNode } from 'react'
import { KeyboardAvoidingView, ScrollView, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import type { LucideIcon } from 'lucide-react-native'
import { BrandBackdrop, SafeAreaView, Text } from '@/components/ui'

// The sign-in family's frame (forgot password, birthday): a teal hero with an icon,
// title and line of help, and a rounded sheet below holding the form.
export function AuthShell({ icon: Icon, title, subtitle, children, testID }: {
  icon: LucideIcon; title: string; subtitle?: string; children: ReactNode; testID?: string
}) {
  return (
    <View className="flex-1 bg-background" testID={testID}>
      <StatusBar style="light" />
      {/* Android 15+ draws edge-to-edge and no longer resizes for the keyboard, so pad on both platforms. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled" bounces={false}>
          <SafeAreaView edges={['top']}>
            <BrandBackdrop />
            <View className="w-full max-w-md items-center gap-3 self-center px-6 pb-12 pt-8">
              <Icon size={32} color="#ffffff" />
              <Text accessibilityRole="header" className="text-center text-2xl font-extrabold tracking-tight text-on-brand">{title}</Text>
              {subtitle ? <Text className="text-center text-sm leading-5 text-on-brand/85">{subtitle}</Text> : null}
            </View>
          </SafeAreaView>
          <SafeAreaView edges={['bottom']} className="-mt-6 flex-1 rounded-t-3xl bg-background">
            <View className="w-full max-w-md gap-4 self-center px-6 pb-6 pt-7">{children}</View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
