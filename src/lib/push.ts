import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import type { Href } from 'expo-router'
import { api } from '@/lib/api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

let registeredToken: string | null = null

export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'School updates',
        importance: Notifications.AndroidImportance.MAX,
      })
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
  } catch {
    // Ignore errors: Expo Go on Android cannot get push tokens, and the app must keep working
  }
}

export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return

  try {
    await api('/api/parent/push/expo', {
      method: 'DELETE',
      body: JSON.stringify({ token: registeredToken }),
    })
  } catch {
    // Ignore errors
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
