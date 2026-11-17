# Web → mobile sync

The web team builds parent features first in `welearnyoulearn/prototype` (branch `dev`).
This file records how far the mobile app has been checked against it, so each sync
only has to look at what changed since.

## Automatic issues

`docs/web-sync/notify-parent-mobile.yml` is a GitHub workflow for the **prototype** repo. On every
merge to `dev` that touches the paths below, it opens an issue here labelled `web-sync`, with the
commits, the changed files, and whether it is a UI change (build it in mobile) or API only
(already live, since both apps share one backend). To turn it on:

1. Create a fine-grained GitHub token: resource owner `welearnyoulearn`, repository
   `wlyl-parent-mobile` only, permission **Issues: Read and write**.
2. In the prototype repo: Settings → Secrets and variables → Actions → new secret
   `PARENT_MOBILE_TOKEN` with that token.
3. Copy the workflow to `.github/workflows/notify-parent-mobile.yml` in the prototype repo and
   merge it into `dev`.

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
