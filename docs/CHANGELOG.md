# Changelog

## [Unreleased]

### Added
- Forgot password on the login screen (#2): sends the web reset link; the parent resets on the web and signs in here. Login shows a `?notice=` message above the form.
- Birthday: asked once after the first-login password change (optional), and Add/Edit on Profile (`PUT /api/parent/auth/date-of-birth`).
- Session, plan and usage (#3): the app keeps the session alive while open (`/me` every 60 s and on return from background) and returns to sign-in on a 401; "access revoked" signs out with the school's message (`/login?notice=`). A school whose plan has ended shows a full-screen "Portal access is paused" (Retry, Sign out), checked every 10 min (45 s while paused). Usage heartbeat every 60 s, section opens tracked, and the usage session closed on logout. `ApiError.code` exposes `PLAN_EXPIRED` / `FEATURE_DISABLED` / `access_revoked`; a `FEATURE_DISABLED` reply refreshes the enabled features.

### Changed
- Profile matches the web: name, email, phone and school are read-only (the platform has no `PUT /api/parent/auth/me`), plus birthday and a Change password entry.
- Home: Contact & Support card (class teacher and school administration with Call buttons, school address) and School notices (latest 4, NEW / Urgent / Action needed / Pinned badges, Telugu text when the school gave one). Unseen urgent, action-needed and greeting notices pop up one at a time; "I have read this" acknowledges (#4).
- School notices screen with search and All / Unread / Pinned / Action needed / Past filters; the section hides when the school has notices switched off (403).
- Header chips: red "N results to sign" → Exams, amber "N fee overdue" → Fees (#4).

## [1.0.3] — 2026-10-18

### Fixed
- Tester feedback FB-2 to FB-6 (see `docs/FEEDBACK_TRACKER.md`), including the academic year pill in the header on every tab (FB-6).

### Added
- Firebase/FCM push setup so Android builds can receive push notifications.
- Per-type notification sounds: exams, results, fees, absence, school messages and birthdays each have their own sound and Android channel (`exams`, `results`, `fees`, `absent`, `messages`, `birthday`), named in the chosen language. The `default` channel remains the fallback.

## [1.0.2] — 2026-10-16

### Fixed
- Library empty state now identifies the child's grade and current academic year. Parent access remains textbooks for the child's grade only; other grades and staff handbooks remain excluded by the server.
- Account and child-independent cards render before school metadata finishes. Login and the signed-in shell share one session load; class-dependent screens wait for class lookup and offer retry on failure.
- Repeated screen requests share a 30-second memory cache, including the Home and Fees fee summary. Pull-to-refresh bypasses cached results; successful writes and sign-out clear cached data. Late responses from a previous account cannot restore its data.
- Requests time out after 25 seconds with a retry message instead of waiting indefinitely.
- Added cache, account-race, timeout and Library render regression coverage.

## [1.0.1] — 2026-10-16

### Fixed
- Home and Calendar crashed on the dev platform's `{ events, weeklyOff, today, canEdit }` calendar response. Both now read its events list.
- Attendance crashed on the dev platform's month-based response. It now shows the current month, server-calculated session totals and trend, including half days and holidays.
- Added screen render regression tests using the deployed response contracts; the shipped code fails these cases and the fixes pass.

## [1.0.0]

### Fixed
- UPI payment was missing from the mobile Fees tab (dropped when the web screen was ported). (#11)

### Added
- EAS build profiles (`development`, `preview`, `production`) and a Play Store release checklist in `docs/RELEASE.md`. Dev builds keep the dev platform default; store builds also use the dev platform until the live platform runs the parent API this app needs. (#13)
- Pay fees by UPI from the Fees tab (schools with online payments on): pick the amount, open GPay/PhonePe/Paytm with the school's UPI ID and amount filled in, then enter the UTR so the school can verify it. (#11)
- Quick Links on Home: one-tap icons for every screen; features the school has turned off show greyed out as "Off", features not built yet (Receipts, Report card, Photos, Bus live tracking) show greyed out as "Soon". (#10)
- Library books open inside the app: tap to download (with progress), read offline in a built-in PDF reader with a page slider and a portrait/landscape toggle, remove a download from the reader. Downloads are cleared on sign-out. (#9)
- Real-time push notifications: registers the phone after sign-in, foreground banners, live Notifications list, tap opens the related screen, unregisters on logout. Package id `com.welearnyoulearn.parent`. (#8)
- Expo app with login, first-login password change, logout, child switcher, and Home, Attendance, Fees and Exams tabs with a per-exam mark sheet and parent sign-off. (#7)
- Talks to the dev platform by default (`EXPO_PUBLIC_API_ORIGIN`). (#7)
