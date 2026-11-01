import { Fragment, useCallback, useState } from 'react'
import { View } from 'react-native'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { BookOpen, Library } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { type LibraryItem, day } from '@/lib/api'
import { isDownloaded } from '@/lib/books'
import { useApi } from '@/lib/use-api'
import { Screen, Alert, Empty, Panel, Section, Divider, Chip, ListItem, ErrorState, ScreenSkeleton } from '@/components/ui'
import { useT } from '@/lib/i18n'

export default function LibraryScreen() {
  const { student, year, has } = useSession()
  const enabled = has('library')
  const t = useT()
  const router = useRouter()
  // Re-read which books are on the phone whenever the list comes back into view.
  const [, setFocusTick] = useState(0)
  useFocusEffect(useCallback(() => setFocusTick(n => n + 1), []))

  const { data: items, error, loading, refreshing, refresh, status } = useApi<LibraryItem[]>(
    student && enabled ? `/api/school/library?school_id=${student.school_id}&student_id=${student.id}` : null
  )

  const title = <Stack.Screen options={{ title: t.screenTitles.library }} />

  if (!enabled) {
    return <>{title}<Screen><Alert tone="info">{t.library.notEnabled}</Alert></Screen></>
  }

  if (status === 404 || status === 405) {
    return (
      <>
        {title}
        <Screen refreshing={refreshing} onRefresh={refresh}>
          <Empty icon={Library} title={t.notAvailableTitle} hint={t.notAvailableHint} />
        </Screen>
      </>
    )
  }

  if (error && !items) {
    return <>{title}<Screen refreshing={refreshing} onRefresh={refresh}><ErrorState message={error} onRetry={refresh} busy={refreshing} /></Screen></>
  }

  if (loading || !items || !student) {
    return <>{title}<Screen><ScreenSkeleton /></Screen></>
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
      {title}
      <Screen refreshing={refreshing} onRefresh={refresh} testID="library-screen">
        {entries.length === 0 ? (
          <Empty icon={Library} title={t.library.noTextbooksTitle(student.grade)} hint={t.library.noTextbooksHint(year ? t.library.inYear(year) : '')} />
        ) : (
          <View className="gap-6">
            {entries.map(([subject, list]) => (
              <Section key={subject} title={subject}>
                <Panel className="overflow-hidden">
                  {list.map((m, i) => (
                    <Fragment key={m.material_id}>
                      {i > 0 && <Divider inset />}
                      <ListItem
                        icon={BookOpen}
                        tone="violet"
                        title={m.title}
                        subtitle={t.library.itemMeta(m.material_type === 'textbook' ? t.library.textbook : t.library.handbook, day(m.created_at))}
                        trailing={isDownloaded(m.material_id) ? <Chip tone="green">{t.library.downloaded}</Chip> : undefined}
                        onPress={() => openItem(m)}
                        testID={`library-item-${m.material_id}`}
                      />
                    </Fragment>
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
