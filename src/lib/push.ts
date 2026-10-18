import { useEffect } from 'react'
import * as Device from 'expo-device'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'
import type { Href } from 'expo-router'
import { api } from '@/lib/api'
import { TRANSLATIONS, type Strings } from '@/lib/i18n'
import { useSession } from '@/stores/session'

// Every use of expo-notifications lives in this file. On Android, Expo Go
// (SDK 53+) throws as soon as expo-notifications is imported, which took the
// whole app down; so it is only loaded where push can work (development or
// store builds, and iOS). In Expo Go on Android the app runs without push.
const pushSupported = !(Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
// ponytail: lazy require is the only way to avoid the import-time throw; a static import cannot be skipped.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Notifications: typeof import('expo-notifications') | null = pushSupported ? require('expo-notifications') : null

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

// The server sends `channelId` = one of these ids and `sound` = the file name (iOS plays `sound`),
// so ids and file names must stay in sync with the platform's lib/expoPush.ts and the `sounds`
// list in app.json. Android binds a sound to a channel when it is created and it cannot be
// changed afterwards, so a new sound needs a new id.
export const PUSH_CHANNELS: { id: keyof Strings['pushChannels']; sound: string }[] = [
  { id: 'exams', sound: 'exams_chime.wav' },
  { id: 'results', sound: 'results_bells.wav' },
  { id: 'fees', sound: 'fees_coin.wav' },
  { id: 'absent', sound: 'absent_alert.wav' },
  { id: 'messages', sound: 'message_ding.wav' },
  { id: 'birthday', sound: 'birthday_jingle.wav' },
]

let registeredToken: string | null = null

export async function registerForPush(): Promise<void> {
  try {
    if (!Notifications || !Device.isDevice) return

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'School updates',
        importance: Notifications.AndroidImportance.MAX,
      })
      const names = TRANSLATIONS[useSession.getState().lang ?? 'en'].pushChannels
      for (const { id, sound } of PUSH_CHANNELS) {
        await Notifications.setNotificationChannelAsync(id, {
          name: names[id],
          importance: Notifications.AndroidImportance.MAX,
          sound,
        })
      }
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
    if (!projectId) {
      console.warn('Push disabled: no EAS projectId')
      return
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })

    await api('/api/parent/push/expo', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })

    registeredToken = token
  } catch (err) {
    // Log, don't throw: Expo Go on Android cannot get push tokens, and the app must keep working
    console.warn('[push] registration failed', err)
  }
}

export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return

  try {
    await api('/api/parent/push/expo', {
      method: 'DELETE',
      body: JSON.stringify({ token: registeredToken }),
    })
  } catch (err) {
    // Log, don't throw: unregistering is best-effort and must not block logout
    console.warn('[push] unregister failed', err)
  } finally {
    registeredToken = null
  }
}

export function routeForPush(url: unknown): Href {
  if (typeof url !== 'string') return '/notifications'

  const routes = [
    '/', '/attendance', '/fees', '/exams', '/more', '/timetable',
    '/calendar', '/notifications', '/profile', '/syllabus',
    '/library', '/homework', '/leave', '/transport', '/rewards', '/activity'
  ]

  if (routes.includes(url)) {
    return url as Href
  }

  return '/notifications'
}

// Opens the tapped notification's screen, including the tap that launched the app.
export function useNotificationTap(open: (href: Href) => void): void {
  useEffect(() => {
    if (!Notifications) return
    const N = Notifications
    const handle = (response: import('expo-notifications').NotificationResponse | null) => {
      if (!response) return
      const data = response.notification.request.content.data as Record<string, unknown> | undefined
      // Clear it so a later remount (e.g. sign out and back in) does not reopen it.
      N.clearLastNotificationResponse()
      open(routeForPush(data?.url))
    }
    void N.getLastNotificationResponseAsync().then(handle)
    const sub = N.addNotificationResponseReceivedListener(handle)
    return () => sub.remove()
  }, [open])
}

// Calls `onReceive` whenever a notification arrives while the app is open.
export function onNotificationReceived(onReceive: () => void): () => void {
  if (!Notifications) return () => {}
  const sub = Notifications.addNotificationReceivedListener(onReceive)
  return () => sub.remove()
}
