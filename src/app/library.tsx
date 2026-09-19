import { useCallback, useState } from 'react'
import { Text, View } from 'react-native'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { BookOpen, ChevronRight, Library } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { type LibraryItem, day } from '@/lib/api'
import { isDownloaded } from '@/lib/books'
import { useApi } from '@/lib/use-api'
import { Screen, Loading, Alert, Empty, Panel, Section, Row, Divider, Chip } from '@/components/ui'

export default function LibraryScreen() {
  const { student, has } = useSession()
  const enabled = has('library')
  const router = useRouter()
  // Re-read which books are on the phone whenever the list comes back into view.
  const [, setFocusTick] = useState(0)
  useFocusEffect(useCallback(() => setFocusTick(t => t + 1), []))

  const { data: items, error, loading, refreshing, refresh, status } = useApi<LibraryItem[]>(
    student && enabled ? `/api/school/library?school_id=${student.school_id}&student_id=${student.id}` : null
  )

  if (!enabled) {
    return (
      <>
        <Stack.Screen options={{ title: 'Library' }} />
        <Screen><Alert>The digital library is not enabled for your school.</Alert></Screen>
      </>
    )
  }

  if (status === 404 || status === 405) {
    return (
      <>
        <Stack.Screen options={{ title: 'Library' }} />
        <Screen refreshing={refreshing} onRefresh={refresh}>
          <Empty icon={Library} title="Not available yet" hint="Your school's server doesn't have this feature yet." />
        </Screen>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Library' }} />
        <Screen refreshing={refreshing} onRefresh={refresh}>
          <Alert>{error}</Alert>
        </Screen>
      </>
    )
  }

  if (loading || !items || !student) {
    return (
      <>
        <Stack.Screen options={{ title: 'Library' }} />
        <Screen><Loading /></Screen>
      </>
    )
  }

  // ponytail: standard reduce instead of Map.groupBy since React Native runtime may not support it yet.
  const grouped = items.reduce((acc, item) => {
    const key = item.subject_name
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, LibraryItem[]>)

  const entries = Object.entries(grouped)

  const openItem = (m: LibraryItem) =>
    router.push({ pathname: '/book/[id]', params: { id: String(m.material_id), title: m.title, url: m.file_url } })

  return (
    <>
      <Stack.Screen options={{ title: 'Library' }} />
      <Screen refreshing={refreshing} onRefresh={refresh} testID="library-screen">
        {entries.length === 0 ? (
          <Empty icon={Library} title="No books yet" hint={`Textbooks for ${student.name.split(' ')[0]}'s class appear here once the school adds them.`} />
        ) : (
          <View className="gap-5">
            {entries.map(([subject, list]) => (
              <Section key={subject} title={subject}>
                <Panel className="overflow-hidden">
                  {list.map((m, i) => (
                    <View key={m.material_id}>
                      {i > 0 && <Divider />}
                      <Row onPress={() => openItem(m)} testID={`library-item-${m.material_id}`}>
                        <View className="h-9 w-9 items-center justify-center rounded-xl bg-teal-50">
                          <BookOpen size={16} color="#0f766e" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-foreground">{m.title}</Text>
                          <Text className="text-[11px] text-muted-foreground">
                            {m.material_type === 'textbook' ? 'Textbook' : 'Handbook'} · added {day(m.created_at)}
                          </Text>
                        </View>
                        {isDownloaded(m.material_id) && <Chip tone="green">Downloaded</Chip>}
                        <ChevronRight size={16} color="#9ca3af" />
                      </Row>
                    </View>
                  ))}
                </Panel>
              </Section>
            ))}
          </View>
        )}
      </Screen>
    </>
  )
}
