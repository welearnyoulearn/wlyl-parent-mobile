# Tester feedback tracker

Local tracker for app feedback while this repo has no GitHub remote. One row per item; move to **Done** with the commit when fixed.

Status: `Open` · `In progress` · `Done` · `Blocked`

## Round 1 — kowsik, 17 Oct 2026 (build 1.0.2, internal testing)

| ID | Feedback | Root cause | Fix | Status |
|---|---|---|---|---|
| FB-1 | Push notifications not arriving as phone notifications (they do show in the in-app list) | No `google-services.json` / FCM key, so Android never issues a push token; `src/lib/push.ts` swallows the error. Platform has no token route or sender on dev (only on unpushed `feature/133-expo-push`). The web has no Firebase setup to reuse. | Now: log the registration error. Later: Firebase project + FCM V1 key in EAS, merge platform #129/#133 to dev, rebuild | Error logging done; rest blocked — waiting on Firebase access |
| FB-2 | No language change | Web has EN/Telugu (`app/parent/translations.ts`); app strings are hard-coded English | EN/తెలుగు switch in More → Account and on login, saved on device; all live screens translated (wording reuses the web's Telugu; app-only strings need a Telugu speaker's review; dates still English) | Done — not yet tested on a device |
| FB-3 | Syllabus not the same as web | Same API, but the app drops semester tabs, re-sorts subjects and omits "Taught by" teachers | Match the web: semester tabs, API order, teacher names | Done — not yet tested on a device |
| FB-4 | Calendar and exam calendar are separate on web, not shown properly in app | App merges both into one list for Jan–Dec of the current year, no month navigation, no exam calendar | Calendar = school events month grid; Exams tab gets an exam month grid (Upcoming tab) | Done — not yet tested on a device |
| FB-5 | Bus, activity, homework, timetable, rewards show in the app but not on web | Their platform routes don't exist on dev (unpushed `feature/129`); quick links gate on feature keys that don't exist | Disable them (shown as "Soon") until the backend ships; gate Calendar on the `calendar` feature like the web | Done — not yet tested on a device |
| FB-6 | Can't see which academic year | App loads the current year but never shows it | "AY 2026-27" pill in the header on every tab | Done — not yet tested on a device |

## Follow-ups
- Platform branches `feature/129-parent-app-backend` and `feature/133-expo-push` are local only and 102 commits behind `dev` — rebase and open PRs before re-enabling FB-5 screens and FB-1.
- Create a GitHub repo for this app so these can become real issues.
