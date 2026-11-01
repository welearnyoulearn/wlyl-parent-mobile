import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { Stack } from 'expo-router'
import { Megaphone, Search } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { filterNotices, type NoticeFilter } from '@/lib/notices'
import { NoticeModal, NoticeRow, useNotices } from '@/components/notices'
import { Screen, Panel, Empty, Alert, Loading, Divider, Text, useColors } from '@/components/ui'
import { useT } from '@/lib/i18n'

const FILTERS: NoticeFilter[] = ['all', 'unread', 'pinned', 'action', 'past']

// Every school notice for this parent, searchable, with filters (Past loads expired notices).
export default function NoticesScreen() {
  const { student, lang } = useSession()
  const t = useT()
  const c = useColors()
  const [filter, setFilter] = useState<NoticeFilter>('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)

  const base = student ? `/api/announcements?school_id=${student.school_id}` : null
  const live = useNotices(base)
  const past = useNotices(base && filter === 'past' ? `${base}&scope=past` : null)
  const source = filter === 'past' ? past : live
  const list = source.items ?? []
  const shown = filterNotices(list, filter, query, lang)
  const open = [...(live.items ?? []), ...(past.items ?? [])].find(n => n.id === openId) ?? null

  return (
    <>
      <Stack.Screen options={{ title: t.screenTitles.notices }} />
      <Screen testID="notices-screen" refreshing={source.refreshing} onRefresh={source.refresh}>
        <View className="h-11 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3">
          <Search size={16} color={c.subtle} />
          <TextInput value={query} onChangeText={setQuery} placeholder={t.notices.search} placeholderTextColor={c.subtle}
            testID="notices-search" accessibilityLabel={t.notices.search} autoCorrect={false} className="flex-1 text-sm text-foreground" />
        </View>

        <View className="flex-row flex-wrap gap-1.5" accessibilityRole="tablist">
          {FILTERS.map(f => {
            const selected = filter === f
            return (
              <Pressable key={f} onPress={() => setFilter(f)} testID={`notices-filter-${f}`}
                accessibilityRole="tab" accessibilityState={{ selected }}
                className={`rounded-full border px-3 py-1.5 ${selected ? 'border-primary bg-primary' : 'border-border bg-card'}`}>
                <Text className={`text-xs font-semibold ${selected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{t.notices.filters[f]}</Text>
              </Pressable>
            )
          })}
        </View>

        {source.hidden ? (
          <Empty icon={Megaphone} title={t.notices.none} />
        ) : source.error ? (
          <Alert>{source.error}</Alert>
        ) : source.items === null ? (
          <Loading />
        ) : shown.length === 0 ? (
          <Empty icon={Megaphone} title={t.notices.none} />
        ) : (
          <View className="gap-2">
            <Panel className="overflow-hidden">
              {shown.map((n, i) => (
                <View key={n.id}>
                  <NoticeRow notice={n} onPress={() => setOpenId(n.id)} />
                  {i < shown.length - 1 && <Divider />}
                </View>
              ))}
            </Panel>
            <Text className="px-1 text-[11px] text-muted-foreground">{t.notices.showing(shown.length, list.length)}</Text>
          </View>
        )}
      </Screen>
      {open && <NoticeModal notice={open} onClose={() => setOpenId(null)} />}
    </>
  )
}
