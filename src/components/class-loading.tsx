import { View } from 'react-native'
import { useSession } from '@/stores/session'
import { Alert, Button, Loading } from '@/components/ui'

export function ClassLoading() {
  const { classError, load } = useSession()
  return classError ? (
    <View className="gap-3">
      <Alert>{classError}</Alert>
      <Button testID="retry-class-load" label="Try again" onPress={() => void load(true)} />
    </View>
  ) : <Loading label="Loading your child's class" />
}
