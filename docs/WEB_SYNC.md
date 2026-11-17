# Web → mobile sync

The web team builds parent features first in `welearnyoulearn/prototype` (branch `dev`).
This file records how far the mobile app has been checked against it, so each sync
only has to look at what changed since.

## Last synced

| Field | Value |
|---|---|
| Prototype commit | `b3d03b6` (Daily Newspaper, #485), 2026-11-04 |
| Checked on | 2026-11-17 |

## What to compare

Only these paths in the prototype affect the parent app:

- `app/parent/**`: the parent portal (sections, translations, components)
- `app/api/parent/**`: parent APIs
- `app/api/announcements/**`, `components/announcements/**`, `lib/announcementPopup.ts`
- `components/portal/**`: launcher and nav that the parent portal uses
- `lib/features.ts`: feature keys and nav aliases

```bash
git -C prototype log --oneline b3d03b6..origin/dev -- app/parent app/api/parent app/api/announcements components/announcements lib/announcementPopup.ts components/portal lib/features.ts
```

## Parity as of the last sync

| Web parent section | Mobile |
|---|---|
| Announcements (+ unread badge, popup once, #482) | School notices, popup on Home, badge on More |
| Overview | Home tab |
| Daily Report (daily quiz) | Daily report |
| Attendance | Attendance tab |
| School Calendar | Calendar |
| Fees | Fees tab |
| Exam Calendar, Results | Exams tab |
| Syllabus | Syllabus |
| Digital Library | Library |
| Profile | Profile + Settings |

Not for parents on the web (so not in mobile): Daily Newspaper and AI Tutor (student only),
Doubts and Rewards (parent APIs exist, but the web parent portal does not show them yet).
