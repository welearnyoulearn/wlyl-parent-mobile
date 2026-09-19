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
