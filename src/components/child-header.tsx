import { Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LogOut } from 'lucide-react-native'
import { useSession } from '@/stores/session'
import { Avatar } from '@/components/ui'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

// Teal header on every tab: greeting, school, logout, and the selected child
// (or chips to switch between children). Ported from the web app's AppShell.
export function ChildHeader() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { me, children, student, year, selectChild, logout } = useSession()
  const firstName = me?.name?.split(' ')[0]

  async function onLogout() {
    await logout()
    router.replace('/login')
  }

  return (
    <View style={{ paddingTop: insets.top + 12 }} className="rounded-b-[28px] bg-primary px-4 pb-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xs text-white/75">{greeting()}{firstName ? `, ${firstName}` : ''}</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-white" numberOfLines={1}>{me?.school_name ?? 'WLYL Parent'}</Text>
            {year && (
              <View className="rounded-full bg-white/15 px-2 py-0.5">
                <Text testID="header-academic-year" className="text-[10px] font-medium text-white/90">AY {year}</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable onPress={() => void onLogout()} testID="logout-button" accessibilityRole="button" accessibilityLabel="Log out"
          className="size-10 items-center justify-center rounded-full bg-white/15 active:bg-white/25">
          <LogOut size={18} color="#fff" />
        </Pressable>
      </View>

      {student && children.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerClassName="gap-2"
          accessibilityRole="tablist" accessibilityLabel="Children">
          {children.map(k => {
            const active = k.id === student.id
            return (
              <Pressable key={k.id} onPress={() => selectChild(k)} testID={`child-chip-${k.id}`}
                accessibilityRole="tab" accessibilityState={{ selected: active }}
                className={`flex-row items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 ${active ? 'bg-white' : 'bg-white/15'}`}>
                <Avatar name={k.name} className={`size-7 ${active ? 'bg-teal-600' : 'bg-white/25'}`} textClassName="text-xs text-white" />
                <View>
                  <Text className={`text-sm font-semibold ${active ? 'text-teal-800' : 'text-white'}`}>{k.name.split(' ')[0]}</Text>
                  <Text className={`text-[10px] ${active ? 'text-teal-700' : 'text-white/75'}`}>Class {k.grade}-{k.section}</Text>
                </View>
              </Pressable>
            )
          })}
        </ScrollView>
      ) : student ? (
        <View className="mt-4 flex-row items-center gap-3">
          <Avatar name={student.name} className="size-11 bg-white/20" />
          <View>
            <Text testID="header-child-name" className="text-lg font-semibold text-white">{student.name}</Text>
            <Text className="text-xs text-white/80">Class {student.grade}-{student.section} · Roll {student.roll_number.split('-').pop()}</Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}
