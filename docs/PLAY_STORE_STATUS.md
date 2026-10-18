# Play Store release status

Last checked: 18 October 2026 (Asia/Kolkata).

## Tester feedback + push update — 1.0.3 (9)

- Fixes kowsik's round-1 feedback (docs/FEEDBACK_TRACKER.md FB-2..FB-6), English/Telugu switch, Firebase (wlyl-512003) for Android push, per-kind notification sounds ("Set A").
- Build: `ae642434-a03c-4c75-9c24-776f84607b79`, version 1.0.3, code 9, source `69b0a83`.
- Build URL: https://expo.dev/accounts/thindaam/projects/wlyl-parent-mobile/builds/ae642434-a03c-4c75-9c24-776f84607b79
- Local bundle: `~/Desktop/wlyl-parent-1.0.3-9.aab`, SHA-256 `6109eac5f161f3c3a0437faac0396f20842730a2066a9cbde47e92446d08dbd3`. Verified: package, version 1.0.3, six sounds in res/raw, Firebase app id, dev API origin.
- Not yet uploaded to Play internal testing (no Play service-account key on this machine). Push also needs platform branch `feature/133-expo-push-v2` on dev.

## Library and loading update — 1.0.2

- Parent access confirmed by the user: textbooks for the selected child's grade only.
- Read-only checks found the school has library materials for Grades 8 and 10 in current academic year 2027-28, with no Grade 6 assignments. The web screenshot's wider shelf is consistent with an administrator session; mobile parent access remains restricted.
- Clearer grade/year empty state, account rendering before school metadata, session/request deduplication, shared Home/Fees requests, 30-second memory cache and 25-second request timeout.
- Cache and late account response guards are covered by tests; no school subscriptions or library permissions changed.
- Validation: 14 regression tests, TypeScript, lint and Android Metro export pass. Physical-device verification remains pending; ADB lists no connected devices.
- Build: `26c7a959-e18b-496a-b4b1-5fef145151cc`, version 1.0.2, code 8, source `be022368c642600a19444f5a62345f907705cdbf`.
- Build URL: https://expo.dev/accounts/thindaam/projects/wlyl-parent-mobile/builds/26c7a959-e18b-496a-b4b1-5fef145151cc
- Code 7 (`54c0faf3-f868-4803-b926-864b39b46223`) was canceled before publication to include profile/password session invalidation in the final build.
- Published and verified **Active / Available to internal testers**, 16 October 2026 at 18:53 IST. Previous code 6 is replaced; the tester audience is unchanged.
- Release URL: https://play.google.com/console/u/0/developers/6447683415189331565/app/4974602149007088670/tracks/4701325226419928085?tab=releases
- Update link: https://play.google.com/apps/internaltest/4701325226419928085
- Signed local bundle: `store/wlyl-parent-1.0.2-8.aab` (gitignored), SHA-256 `a2f51895c78c2c8e4ac5a8f7d041d98ce77464de802bec28e576410fe5ada2ef`.
- Bundle integrity, package, version and dev API address verified. Play reports no lost device support; only the existing optional deobfuscation-file warning. Estimated update size 3.7 MB.
- The temporary local upload server was stopped after the browser read the verified bundle.

## Crash-fix update — 1.0.1 (6)

- User supplied a dashboard screenshot showing `Request failed (404)` and reported that the app also closes.
- Play Console was verified to have **5 (1.0.0)** active before this update. That release already handles the missing timetable route.
- Confirmed the live dev calendar returns an object with `events`, and attendance returns `month`, `yearToDate` and `trend`; the mobile screens still expected older arrays/fields.
- Screen render regression tests reproduce exceptions in the prior code and pass with commit `6bb322e`. TypeScript, lint and Android bundle export also pass.
- The demo parent authenticates successfully. The credentials supplied separately by the user did not authenticate through the **parent** login endpoint; no account changes were made.
- No physical Android device has been detected by ADB yet. USB crash-log capture and real-device smoke testing remain pending.
- Build ID: `cc8a5cc3-a630-47f0-aeb9-23cecba95bd0` (1.0.1, version code 6).
- Build URL: https://expo.dev/accounts/thindaam/projects/wlyl-parent-mobile/builds/cc8a5cc3-a630-47f0-aeb9-23cecba95bd0
- Status: published and confirmed **Active / Available to internal testers**, 16 October at 17:51 IST.
- Release URL: https://play.google.com/console/u/0/developers/6447683415189331565/app/4974602149007088670/tracks/4701325226419928085?tab=releases
- Tester link remains https://play.google.com/apps/internaltest/4701325226419928085 . Update to **1.0.1 (6)** before retesting.
- Signed local bundle: `store/wlyl-parent-1.0.1-6.aab` (gitignored), SHA-256 `7ff2cdb0f18eaa303863d30fcffcd8a43a10702e6f07cff5385074f7711988d3`.
- Bundle integrity, package, version and dev API address verified. Play reports no lost device support; only the existing optional deobfuscation-file warning.

## Initial release — historical record

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
