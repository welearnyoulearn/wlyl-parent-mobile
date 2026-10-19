import { Text, View, KeyboardAvoidingView, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { BirthdayField } from '@/components/birthday-field'
import { Panel, SafeAreaView } from '@/components/ui'
import { useT } from '@/lib/i18n'

// Shown once, right after the first-login password change, when /me has no
// date_of_birth (change-password.tsx decides). Optional: Skip goes straight home.
export default function BirthdayScreen() {
  const router = useRouter()
  const t = useT()
  const home = () => router.replace('/')

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView contentContainerClassName="flex-grow justify-center p-6 gap-6" keyboardShouldPersistTaps="handled">
          <View className="mb-2">
            <Text accessibilityRole="header" className="text-2xl font-bold text-foreground text-center">{t.birthday.title}</Text>
            <Text className="text-muted-foreground mt-2 text-center text-sm">{t.birthday.subtitle}</Text>
          </View>
          <Panel testID="birthday-screen">
            <BirthdayField value={null} onSaved={home} onSkip={home} />
          </Panel>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
