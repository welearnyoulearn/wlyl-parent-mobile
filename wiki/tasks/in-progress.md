# In progress

- Play Store release readiness: EAS build profiles (`eas.json`) and the release checklist (`docs/RELEASE.md`). Waiting on account steps: `eas init`, Play Console app + service-account key, a privacy policy URL on the platform (#13)

- Sign-in with a real dev parent account and check every tab against live data (#7)

- Push notifications: EAS project, Firebase (FCM V1) key and a development build to receive them (#8)

- Web parity from the Parent Portal integration guide, on branch `feature/2-6-parent-parity`: forgot password + birthday + profile (#2), plan-expired / access-revoked / usage tracking (#3), contact card + school notices + header chips (#4), fees receipt PDF + year switcher + prior-year dues (#5), exams / attendance / notifications (#6). Typecheck, lint and tests pass; needs a new native build (expo-print, expo-sharing) and a device check against wlyl-dev before release
