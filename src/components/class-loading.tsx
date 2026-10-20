import { View } from 'react-native'
import { useSession } from '@/stores/session'
import { Alert, Button, Loading } from '@/components/ui'
import { useT } from '@/lib/i18n'

export function ClassLoading() {
  const { classError, load } = useSession()
  const t = useT()
  return classError ? (
    <View className="gap-3">
      <Alert>{classError}</Alert>
      <Button testID="retry-class-load" label={t.tryAgain} onPress={() => void load(true)} />
    </View>
  ) : <Loading label={t.classLoading.loading} />
}
