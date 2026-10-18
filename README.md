# WLYL Parent (mobile)

Native parent app for the WLYL school platform, built with Expo (React Native).
It is the store version of the web parent app in `wlyl-parent-app`, and shares its API types.

Tracking issue: [welearnyoulearn/wlyl-parent-app#7](https://github.com/welearnyoulearn/wlyl-parent-app/issues/7)

## Screens

Login, first-login password change, Home, Attendance, Fees, Exams and the per-exam mark sheet.
Parents with more than one child switch between them in the header.

## Set up a new computer

You need **Git**, **Node.js 22 LTS** and **pnpm 11**. No secrets are needed to run the app: it talks to the dev platform by default (see [Backend](#backend)). To sign in, use a parent account on the dev platform.

### Windows 10/11

1. Install [Git for Windows](https://git-scm.com/download/win) and [Node.js 22 LTS](https://nodejs.org/) (the `.msi` installer).
2. Open **PowerShell** and run:
   ```powershell
   npm install -g pnpm@11
   git config --global core.longpaths true
   ```
   If PowerShell says running scripts is disabled, run this once, then reopen PowerShell:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```
3. Get the code, then install:
   ```powershell
   cd wlyl-parent-mobile
   pnpm install
   ```
4. When `pnpm start` runs for the first time, Windows Firewall asks about **Node.js**. Allow it on **Private networks**, or your phone can't reach the computer. On office or guest Wi-Fi that blocks devices from seeing each other, use `pnpm start --tunnel` instead.
5. **Android emulator (optional):** install [Android Studio](https://developer.android.com/studio), open **More Actions → Virtual Device Manager**, and create a phone. Then add these to your user environment variables (**Start → "Edit environment variables for your account"**):
   - `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
   - add `%LOCALAPPDATA%\Android\Sdk\platform-tools` to `Path`

iOS simulators need a Mac. On Windows, test iPhone on a real iPhone with Expo Go.

### macOS

1. Install [Homebrew](https://brew.sh), then:
   ```bash
   brew install git node@22 watchman
   npm install -g pnpm@11
   ```
   If `node -v` doesn't print v22, follow the `brew` message to add `node@22` to your `PATH`.
2. Get the code, then install:
   ```bash
   cd wlyl-parent-mobile
   pnpm install
   ```
3. **Android emulator (optional):** install [Android Studio](https://developer.android.com/studio), create a phone in **Virtual Device Manager**, and add this to `~/.zshrc`:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
4. **iOS simulator (optional):** install **Xcode** from the App Store, open it once to accept the licence, then install a simulator under **Settings → Components**.

## Run it

```bash
pnpm install
pnpm start
```

- **On your phone:** install **Expo Go** from the Play Store or App Store, then scan the QR code in the terminal. Phone and computer must be on the same Wi-Fi.
- **Android emulator:** press `a` in the terminal. If the app can't reach Metro, run `adb reverse tcp:8081 tcp:8081` and open `exp://127.0.0.1:8081` in Expo Go.
- **iOS simulator (Mac only):** press `i` in the terminal.

Expo Go must support SDK 57; update it from the store if it says the project is incompatible. Push notifications don't work in Expo Go on Android — see [Push notifications](#push-notifications).

The web target (`w`) renders the screens but can't sign in: the platform API does not send CORS headers.

## Backend

The app calls the platform API directly. The base URL comes from `EXPO_PUBLIC_API_ORIGIN` and defaults to dev:

```bash
EXPO_PUBLIC_API_ORIGIN=https://wlyl-dev.vercel.app
```

This is the only environment variable the app reads, and it is not a secret. Copy `.env.example` to `.env.local` (Windows: `copy .env.example .env.local`) only if you need a different backend.

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

Building or releasing needs access to the **thindaam** Expo account (ask for an invite at expo.dev → Members); running the app locally does not. The Firebase file `google-services.json` is in the repo, and the push key and signing key live in EAS, so nobody needs them on their machine.

Store builds run on EAS: `preview` (APK for testers, dev platform) and `production` (App Bundle, production platform). One-time account setup, blockers, build/submit commands and the smoke test are in [docs/RELEASE.md](docs/RELEASE.md).

## Stack

Expo SDK 57, expo-router, TypeScript strict, Zustand, Uniwind (Tailwind v4 classes on React Native), lucide-react-native.

## Checks

```bash
pnpm typecheck
pnpm lint
```
