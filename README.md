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

Put it in `.env.local` to point at another backend, for example `https://www.welearnyoulearn.com` for production (the **www** host — the apex redirects, which drops the login cookie). EAS builds ignore `.env.local` and take the value from the profile in `eas.json`; see `.env.example`.

## Push notifications

The app registers the phone for push after sign-in, shows notifications while open, refreshes the Notifications screen live, and opens the related screen on tap. The platform sends a push the moment it creates a parent notification.

Expo Go cannot receive push on Android (since SDK 53), so push needs a development build. One-time setup:

1. **Expo project:** sign in to Expo and link the app. This writes the project id into `app.json` (`extra.eas.projectId`).
   ```bash
   npx eas-cli login
   ```
   ```bash
   npx eas-cli init
   ```
2. **Android (Firebase Cloud Messaging):** create a Firebase project, add an Android app with package `com.welearnyoulearn.parent`, download `google-services.json` into the project root, and set `"googleServicesFile": "./google-services.json"` under `expo.android` in `app.json`. Then upload an FCM V1 service-account key with `npx eas-cli credentials`.
3. **iOS (optional now):** an Apple Developer account; EAS creates the APNs key during the first iOS build.
4. **Build and install a development build:**
   ```bash
   npx eas-cli build --profile development --platform android
   ```

Without these, the app works normally and skips push registration.

## Release

Store builds run on EAS: `preview` (APK for testers, dev platform) and `production` (App Bundle, production platform). One-time account setup, blockers, build/submit commands and the smoke test are in [docs/RELEASE.md](docs/RELEASE.md).

## Stack

Expo SDK 57, expo-router, TypeScript strict, Zustand, Uniwind (Tailwind v4 classes on React Native), lucide-react-native.

## Checks

```bash
pnpm typecheck
pnpm lint
```
