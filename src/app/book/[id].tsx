import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { WebView } from 'react-native-webview'
import * as ScreenOrientation from 'expo-screen-orientation'
import { BookOpen, RotateCw, Trash2 } from 'lucide-react-native'
import { downloadBook, deleteBook, isDownloaded, readerUri, libraryDirUri } from '@/lib/books'
import { Screen, ErrorState, SafeAreaView, Loading, Bar, ConfirmDialog, IconTile, useColors, Text } from '@/components/ui'
import { useT } from '@/lib/i18n'

// Error markers translated at render time (the download effect must not re-run on a language switch).
const NO_LINK = '\u0000no-link'
const FAILED = '\u0000failed'

// In-app textbook reader (#9): downloads the PDF once into the app, then opens
// it offline in the bundled PDF.js reader — no browser involved.
export default function BookScreen() {
  const { id: idParam, title, url } = useLocalSearchParams<{ id: string; title?: string; url?: string }>()
  const id = Number(idParam)
  const router = useRouter()
  const t = useT()
  const [uri, setUri] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [landscape, setLandscape] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const c = useColors()

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
          if (!url) throw new Error(NO_LINK)
          setProgress(0)
          await downloadBook(id, url, setProgress, abort.signal)
        }
        const reader = await readerUri(id)
        if (!abort.signal.aborted) setUri(reader)
      } catch (e) {
        if (!abort.signal.aborted) setError(e instanceof Error ? e.message : FAILED)
      }
    })()
    // Leaving the screen cancels an unfinished download.
    return () => abort.abort()
  }, [id, url, attempt])


  const header = (
    <Stack.Screen options={{
      title: title ?? t.book.titleFallback,
      headerRight: uri ? () => (
        <View className="flex-row items-center gap-1">
          <Pressable onPress={() => setLandscape(l => !l)} hitSlop={6} testID="book-rotate" accessibilityRole="button"
            accessibilityLabel={landscape ? t.book.readPortrait : t.book.readLandscape}
            className="size-11 items-center justify-center rounded-full active:bg-white/15">
            <RotateCw size={20} color={c.onBrand} />
          </Pressable>
          <Pressable onPress={() => setConfirming(true)} hitSlop={6} testID="book-delete" accessibilityRole="button" accessibilityLabel={t.book.removeDownload}
            className="size-11 items-center justify-center rounded-full active:bg-white/15">
            <Trash2 size={20} color={c.onBrand} />
          </Pressable>
        </View>
      ) : undefined,
    }} />
  )

  const dialog = (
    <ConfirmDialog
      visible={confirming}
      title={t.book.removeTitle}
      message={t.book.removeMessage}
      confirmLabel={t.book.remove}
      onConfirm={() => { setConfirming(false); deleteBook(id); router.back() }}
      onCancel={() => setConfirming(false)}
      testID="book-delete-confirm"
    />
  )

  if (error) {
    return (
      <>
        {header}
        <Screen>
          <ErrorState message={t.book.downloadErrorPrefix(error === NO_LINK ? t.book.noLink : error === FAILED ? t.book.downloadFailed : error)}
            onRetry={error === NO_LINK ? undefined : () => setAttempt(a => a + 1)} />
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
          <IconTile icon={BookOpen} tone="violet" size="lg" />
          <Text className="text-center text-base font-semibold text-foreground">{title ?? t.book.titleFallback}</Text>
          <View className="w-full max-w-sm" style={{ opacity: pct === null ? 0.5 : 1 }}>
            <Bar pct={pct ?? 100} label={t.book.titleFallback} />
          </View>
          <Text className="text-center text-sm text-muted-foreground">
            {t.book.downloadingLine(pct)}
          </Text>
        </View>
      </>
    )
  }

  return (
    <>
      {header}
      {dialog}
      {/* Keep the page slider out of the system gesture strip (swipes there switch apps). */}
      <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-muted">
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
        renderLoading={() => <View className="absolute inset-0 bg-muted"><Loading label={t.book.openingBook} /></View>}
        style={{ flex: 1, backgroundColor: c.muted }}
      />
      </SafeAreaView>
    </>
  )
}
