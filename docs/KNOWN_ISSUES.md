# Known issues

## Active

### [#8] Push notifications need an EAS project, Firebase and a development build
- **Severity:** Medium
- **Detail:** Registration is built but skipped until `extra.eas.projectId` exists; Android also needs `google-services.json` and an FCM V1 key in EAS. Expo Go on Android cannot receive push. See README → Push notifications.
- **Status:** Waiting on account setup.

### [#7] Screens that need the #129 backend are not in the app yet
- **Severity:** Medium
- **Detail:** Homework, leave, transport, rewards, activity, push notifications, child photo, exam remarks and profile edit need routes that are only on the platform's unpushed `feature/129-parent-app-backend` branch.
- **Status:** Waiting for that branch to reach dev.

### [#7] Online fee payment is not in the app
- **Severity:** Low
- **Detail:** The Fees tab shows dues and payments but has no UPI pay. Parents see a note to pay at the school office.

### [#7] Web target cannot sign in
- **Severity:** Low
- **Detail:** The platform API sends no CORS headers, so the Expo web build can't call it. Android and iOS are unaffected. Use the web parent app for browsers.
