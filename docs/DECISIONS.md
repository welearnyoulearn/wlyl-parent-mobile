# Architecture decisions

## 2026-09-19 — React Native with Expo, separate repo (#7)
**Decision:** Build the store app with Expo (React Native) in its own repo, next to the web parent app.
**Why:** The team already works in React, TypeScript, Zustand and Tailwind, so the API client, types and store port directly. Flutter would mean a rewrite in Dart. A separate repo keeps the web app's Next.js build and the mobile app's native builds independent.

## 2026-09-19 — Reuse the platform's cookie login (#7)
**Decision:** Call the platform API directly and let the OS cookie jar keep the `wlyl-parent` cookie. No token auth yet.
**Why:** React Native's fetch stores cookies natively on Android and iOS, so no backend change is needed for the first version.
**Revisit when:** the cookie jar proves unreliable, or the app needs offline sign-in. Then add bearer-token auth on the platform.

## 2026-09-19 — Uniwind for Tailwind on React Native (#7)
**Decision:** Use Uniwind, not NativeWind.
**Why:** Uniwind targets Tailwind v4 (same as the web app) and React Native 0.81+. NativeWind 4 still needs Tailwind v3.
**Gotcha:** `className` only works on core React Native components. Wrap third-party components with `withUniwind`, as `ui.tsx` does for `SafeAreaView`.

## 2026-09-19 — Expo Push for real-time notifications (#8)
**Decision:** Use Expo's push service (FCM on Android, APNs on iOS) and send from the platform the moment a parent notification is created, through the existing `pushToParent()` hook.
**Why:** One API for both platforms, no socket server to run, and it reaches parents even when the app is closed. The platform's in-app notification list stays the source of truth; push is the real-time nudge.

## 2026-09-19 — Bundled PDF.js in a WebView for the in-app reader (#9)
**Decision:** Download each book into the app's documents folder, then open it with PDF.js 3.11.174 inlined into one HTML asset (`assets/pdf-viewer.html`, built by `scripts/build-pdf-viewer.mjs`) inside `react-native-webview`.
**Why:** Android's WebView can't show PDFs, and native PDF libraries don't run in Expo Go. A bundled reader works offline on Android and iOS in both Expo Go and store builds. The 3.x line is the last with a classic build that loads from `file://`; its CVE-2024-4367 is closed with `isEvalSupported: false`, and the WebView may only load `file://` pages.
