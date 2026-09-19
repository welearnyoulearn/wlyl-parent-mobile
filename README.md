# WLYL Parent (mobile)

Native parent app for the WLYL school platform, built with Expo (React Native).
It is the store version of the web parent app in `wlyl-parent-app`, and shares its API types.

Tracking issue: [welearnyoulearn/wlyl-parent-app#7](https://github.com/welearnyoulearn/wlyl-parent-app/issues/7)

## Screens

Login, first-login password change, Home, Attendance, Fees, Exams and the per-exam mark sheet.
Parents with more than one child switch between them in the header.

## Run it

```bash
pnpm install
pnpm start
```

- **On your phone:** install **Expo Go** from the Play Store or App Store, then scan the QR code in the terminal. Phone and computer must be on the same Wi-Fi.
- **Android emulator:** press `a` in the terminal. If the app can't reach Metro, run `adb reverse tcp:8081 tcp:8081` and open `exp://127.0.0.1:8081` in Expo Go.

The web target (`w`) renders the screens but can't sign in: the platform API does not send CORS headers.

## Backend

The app calls the platform API directly. The base URL comes from `EXPO_PUBLIC_API_ORIGIN` and defaults to dev:

```bash
EXPO_PUBLIC_API_ORIGIN=https://wlyl-dev.vercel.app
```

Put it in `.env.local` to point at another backend, for example `https://welearnyoulearn.com` for production.

## Stack

Expo SDK 57, expo-router, TypeScript strict, Zustand, Uniwind (Tailwind v4 classes on React Native), lucide-react-native.

## Checks

```bash
pnpm typecheck
pnpm lint
```
