import { useEffect, useState } from 'react'
import { Alert as RNAlert, Pressable, Text, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { WebView } from 'react-native-webview'
import * as ScreenOrientation from 'expo-screen-orientation'
import { BookOpen, RotateCw, Trash2 } from 'lucide-react-native'
import { downloadBook, deleteBook, isDownloaded, readerUri, libraryDirUri } from '@/lib/books'
import { Screen, Alert, Button, COLORS, SafeAreaView, Loading } from '@/components/ui'

// In-app textbook reader (#9): downloads the PDF once into the app, then opens
// it offline in the bundled PDF.js reader — no browser involved.
export default function BookScreen() {
  const { id: idParam, title, url } = useLocalSearchParams<{ id: string; title?: string; url?: string }>()
  const id = Number(idParam)
  const router = useRouter()
  const [uri, setUri] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [landscape, setLandscape] = useState(false)

  // The app is portrait-only; the reader alone can turn sideways for landscape books.
  useEffect(() => {
    ScreenOrientation.lockAsync(landscape ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {})
  }, [landscape])
  useEffect(() => () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {}) }, [])

  useEffect(() => {
    const abort = new AbortController()
    ;(async () => {
      setError('')
      try {
        if (!isDownloaded(id)) {
          if (!url) throw new Error('This book has no download link.')
          setProgress(0)
          await downloadBook(id, url, setProgress, abort.signal)
        }
        const reader = await readerUri(id)
        if (!abort.signal.aborted) setUri(reader)
      } catch (e) {
        if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Download failed')
      }
    })()
    // Leaving the screen cancels an unfinished download.
    return () => abort.abort()
  }, [id, url, attempt])

  function confirmDelete() {
    RNAlert.alert('Remove download?', 'The book will be removed from this phone. You can download it again anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { deleteBook(id); router.back() } },
    ])
  }

  const header = (
    <Stack.Screen options={{
      title: title ?? 'Book',
      headerRight: uri ? () => (
        <View className="flex-row items-center gap-6">
          <Pressable onPress={() => setLandscape(l => !l)} hitSlop={12} testID="book-rotate" accessibilityRole="button"
            accessibilityLabel={landscape ? 'Read in portrait' : 'Read in landscape'}>
            <RotateCw size={20} color={COLORS.primary} />
          </Pressable>
          <Pressable onPress={confirmDelete} hitSlop={12} testID="book-delete" accessibilityRole="button" accessibilityLabel="Remove download">
            <Trash2 size={20} color={COLORS.red} />
          </Pressable>
        </View>
      ) : undefined,
    }} />
  )

  if (error) {
    return (
      <>
        {header}
        <Screen>
          <Alert>{`Couldn't download this book. ${error}`}</Alert>
          <View className="mt-4">
            <Button label="Try again" onPress={() => setAttempt(a => a + 1)} testID="book-retry" />
          </View>
        </Screen>
      </>
    )
  }

  if (!uri) {
    const pct = progress === null ? null : Math.round(progress * 100)
    return (
      <>
        {header}
        <View className="flex-1 items-center justify-center gap-4 bg-background px-10" testID="book-downloading">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
            <BookOpen size={26} color="#0f766e" />
          </View>
          <Text className="text-center text-base font-semibold text-foreground">{title ?? 'Book'}</Text>
          <View className="h-2 w-full overflow-hidden rounded-full bg-muted"
            accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct ?? undefined }}>
            <View className="h-full rounded-full bg-primary" style={{ width: `${pct ?? 100}%`, opacity: pct === null ? 0.4 : 1 }} />
          </View>
          <Text className="text-sm text-muted-foreground">
            {pct === null ? 'Downloading…' : `Downloading ${pct}%`} · saved on this phone for offline reading
          </Text>
        </View>
      </>
    )
  }

  return (
    <>
      {header}
      {/* Keep the page slider out of the system gesture strip (swipes there switch apps). */}
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-[#e5e7eb]">
      <WebView
        testID="book-reader"
        source={{ uri }}
        originWhitelist={['file://*']}
        allowFileAccess
        // The reader page reads the PDF saved next to it in the same folder.
        allowFileAccessFromFileURLs
        allowingReadAccessToURL={libraryDirUri()}
        // Keep the reader inside the app: it never needs to navigate anywhere else.
        onShouldStartLoadWithRequest={req => req.url.startsWith('file://') || req.url.startsWith('about:')}
        setSupportMultipleWindows={false}
        webviewDebuggingEnabled={__DEV__}
        startInLoadingState
        renderLoading={() => <View className="absolute inset-0 bg-[#e5e7eb]"><Loading label="Opening book" /></View>}
        style={{ flex: 1, backgroundColor: '#e5e7eb' }}
      />
      </SafeAreaView>
    </>
  )
}
