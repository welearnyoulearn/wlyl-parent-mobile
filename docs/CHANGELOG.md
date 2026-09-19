# Changelog

## [Unreleased]

### Fixed
- UPI payment was missing from the mobile Fees tab (dropped when the web screen was ported). (#11)

### Added
- Pay fees by UPI from the Fees tab (schools with online payments on): pick the amount, open GPay/PhonePe/Paytm with the school's UPI ID and amount filled in, then enter the UTR so the school can verify it. (#11)
- Quick Links on Home: one-tap icons for every screen; features the school has turned off show greyed out as "Off", features not built yet (Receipts, Report card, Photos, Bus live tracking) show greyed out as "Soon". (#10)
- Library books open inside the app: tap to download (with progress), read offline in a built-in PDF reader with a page slider and a portrait/landscape toggle, remove a download from the reader. Downloads are cleared on sign-out. (#9)
- Real-time push notifications: registers the phone after sign-in, foreground banners, live Notifications list, tap opens the related screen, unregisters on logout. Package id `com.welearnyoulearn.parent`. (#8)
- Expo app with login, first-login password change, logout, child switcher, and Home, Attendance, Fees and Exams tabs with a per-exam mark sheet and parent sign-off. (#7)
- Talks to the dev platform by default (`EXPO_PUBLIC_API_ORIGIN`). (#7)
