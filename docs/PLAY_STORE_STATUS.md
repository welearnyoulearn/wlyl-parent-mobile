# Play Store release status

Last checked: 15 October 2026 (Asia/Kolkata).

- App: WLYL Parent (`com.welearnyoulearn.parent`).
- Developer: Varchas Studios, account `6447683415189331565`.
- Play Console app ID: `4974602149007088670`.
- API target: `https://wlyl-dev.vercel.app` (explicitly requested; keep it on dev).
- Reviewer credentials: `.play-review-credentials` (gitignored).
- Content declarations: complete; App content has no items needing attention.
- Store listing: existing icon, feature graphic and six phone screenshots.
- Internal testers: existing `Kutumb owner tester` list selected and saved.
- Internal release: `1.0.0 (4) — initial internal test`, published and confirmed **Active**.
- Track URL: https://play.google.com/console/u/0/developers/6447683415189331565/app/4974602149007088670/tracks/4701325226419928085?tab=releases
- Tester opt-in URL: https://play.google.com/apps/internaltest/4701325226419928085
- Google shows the temporary name `com.welearnyoulearn.parent (unreviewed)` until app review is completed.

## Android build

Build version code 3 (`2ed4037f-0ae3-438f-884a-e80adeb30cb9`) failed during
dependency installation: pnpm 11 required an explicit install-script decision
for `unrs-resolver@1.12.2`.

Commit `825781a` fixes that with `pnpm-workspace.yaml`, also preserving hoisted
dependencies. Verified with a clean, frozen-lockfile install using pnpm 11.9.0,
TypeScript and an Android Metro export.

Replacement build: version 1.0.0, version code 4.

- EAS ID: `83ee8ef6-0a2e-473b-bd0c-490bed93f951`.
- Logs: https://expo.dev/accounts/thindaam/projects/wlyl-parent-mobile/builds/83ee8ef6-0a2e-473b-bd0c-490bed93f951
- Status: finished successfully; bundle uploaded and internal release published.
- Local signed bundle: `store/wlyl-parent-1.0.0-4.aab` (gitignored).
- Bundle SHA-256: `257a00ecfbc5fb95e4229ae79e0af5d2773dd3a744dca61deec409e576cbf87e`.
- ZIP integrity passed; manifest contains the expected package and the shipped JavaScript bundle contains the dev API URL.
- Play validated version code 4, target SDK 36, minimum Android API 24. Estimated new install size: 27.4 MB.
- One non-blocking Play warning: no deobfuscation file associated with the bundle.
- Real-device smoke testing remains to be performed through the internal track.

## Production access

Play Console currently requires a closed testing release with at least 12
testers opted in for at least 14 days before applying for production access.
Internal testing does not complete this requirement.

## Build 5 (16 October 2026)

- Fixes: exam calendar sent `class_id` (platform now returns 403 for parents; it
  needs `student_id`), and Home showed the dev platform's missing
  `/api/parent/timetable` 404 as an error banner. Commit `96b2447`.
- EAS ID `f1500043-4cf7-49f7-8f3e-90b6b8954f13`, version code 5,
  SHA-256 `50b8f0509a21ad6648d4d7d04472c21f66c6183c453a473958e531119b0f669d`.
- Published to internal testing 16 Oct 14:43; track Active, latest release 5 (1.0.0).
- Still 404 on dev by design: homework, leave, transport, rewards, activity
  (platform `feature/129-parent-app-backend` not merged); the app shows them as "Soon".
