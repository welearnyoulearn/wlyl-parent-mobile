import { useState } from 'react'
import { Modal, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useSession } from '@/stores/session'
import { Button, Panel, SafeAreaView } from '@/components/ui'
import { useT } from '@/lib/i18n'

// Covers the whole app once the school's plan has ended (web: components/PlanNotice.tsx
// locked screen). Parents can't renew, so only Retry and Sign out. A modal also blocks
// Android back and hides the screens beneath from screen readers.
export function PlanLocked() {
  const visible = useSession(s => s.locked && s.me !== null)
  const t = useT()
  const [busy, setBusy] = useState(false)

  async function retry() {
    setBusy(true)
    await useSession.getState().checkPlan()
    setBusy(false)
  }

  async function signOut() {
    await useSession.getState().logout()
    router.replace('/login')
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => {}}>
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 justify-center bg-background p-6" testID="plan-locked-screen">
        <Panel className="gap-6 p-6">
          <View className="gap-2">
            <Text accessibilityRole="header" className="text-xl font-bold text-foreground">{t.planLocked.title}</Text>
            <Text testID="plan-locked-message" className="text-sm text-muted-foreground">{t.planLocked.message}</Text>
          </View>
          <View className="gap-3">
            <Button label={t.tryAgain} onPress={() => void retry()} loading={busy} testID="plan-locked-retry" />
            <Button label={t.planLocked.signOut} onPress={() => void signOut()} variant="outline" testID="plan-locked-signout" />
          </View>
        </Panel>
      </SafeAreaView>
    </Modal>
  )
}
