# Play Store release checklist

Android only for now. Builds run on EAS (Expo's cloud); nothing here changes how
`expo start` / Expo Go work against the dev platform.

## Environments

| How it runs | API origin | Artifact |
|---|---|---|
| `expo start` / Expo Go, `development` profile | `https://wlyl-dev.vercel.app` (code default) | dev client APK |
| `preview` profile — testers | `https://wlyl-dev.vercel.app` (set in `eas.json`) | APK, internal distribution |
| `production` profile — store | `https://wlyl-dev.vercel.app` (set in `eas.json`; the live platform does not run the API this app needs yet) | App Bundle (`.aab`) |

Production uses the **www** host on purpose: the apex answers 307 → www, and a
redirect would drop the `wlyl-parent` login cookie that auth relies on.

## One-time setup

1. **Expo project** — sign in and link the app. `eas init` writes
   `extra.eas.projectId` into `app.json`; commit that change.
   ```bash
   npx eas-cli login
   ```
   ```bash
   npx eas-cli init
   ```
2. **Version counter** — `eas.json` uses `appVersionSource: remote`, so the
   Android `versionCode` lives on EAS and auto-increments on every production
   build. Seed it once:
   ```bash
   npx eas-cli build:version:set --platform android
   ```
   `expo.version` in `app.json` (`1.0.0`) is the user-visible version; bump it by hand per release.
3. **Signing** — on the first production build, choose *Generate new keystore*.
   EAS stores the upload key; Google Play App Signing holds the app signing key.
   Nothing to keep locally.
4. **Google Play Console** — create the app: package `com.welearnyoulearn.parent`,
   name "WLYL Parent", category Education, free. Fill in Store presence,
   Privacy policy, Data safety, Content rating, Target audience (parents, not
   designed for children) and **App access** (the app requires sign-in, so give
   the reviewers a working parent login on the production platform).
5. **Submit credentials** — Play Console → *Setup → API access* → create a
   service account, grant it *Release manager* on this app, download its JSON
   key to `./google-play-service-account.json` (gitignored; never commit it).
6. **Push notifications (optional for v1, #8)** — Firebase project +
   `google-services.json` + FCM V1 key in EAS. See README → *Push notifications*.
   Without it the app skips push registration and everything else works.

## Blockers to clear before the first submission

- **Privacy policy URL** — Play requires a public one for an app that signs
  users in and shows children's school data. None exists on
  `welearnyoulearn.com` yet (`/privacy` and `/privacy-policy` return 404).
  Publish one on the platform and paste the URL into Play Console.
- **Reviewer login** — demo parent on WLYL Demo School (dev platform), saved in the gitignored `.play-review-credentials`, for
  the *App access* section.
- **Store assets** — 512×512 icon (`assets/images/icon.png` is the source),
  1024×500 feature graphic, at least two phone screenshots taken on a
  production build.

## Build

Testers (APK, installs directly on a phone):
```bash
npx eas-cli build --profile preview --platform android
```
Store (App Bundle):
```bash
npx eas-cli build --profile production --platform android
```

## Submit

Uploads the latest production build as a **draft on the internal track**:
```bash
npx eas-cli submit --profile production --platform android
```
Then in Play Console: review the draft → roll out to internal testers → closed
testing → production.

## Smoke test on the production build (internal track)

- Sign in with a real parent account; first-login password change works.
- Home, Attendance, Fees, Exams and one mark sheet load; child switcher works
  for a multi-child parent.
- Fees → UPI opens the payment app with the amount filled in (a school with
  online payments on).
- Library → a textbook downloads and opens offline (a school with the library
  feature on).
- Sign out clears downloads and the session.
- Push arrives only after the FCM setup in step 6.

## What is not in the app yet

Screens that need the platform's `feature/129-parent-app-backend` branch
(homework, leave, transport, rewards, activity, profile edit, remarks, child
photos) are not built into the mobile app, so nothing is hidden or broken in
the store build. See `docs/KNOWN_ISSUES.md`.

## Shipping an update

1. Bump `expo.version` in `app.json` if the change is user-visible; the
   `versionCode` increments on its own.
2. `npx eas-cli build --profile production --platform android`, then
   `npx eas-cli submit --profile production --platform android`.
3. Move the `[Unreleased]` entries in `docs/CHANGELOG.md` under the new version.
