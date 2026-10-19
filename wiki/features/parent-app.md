# Parent app screens

**Status:** Built (first version) · **Issue:** welearnyoulearn/wlyl-parent-app#7

| Screen | Data | Platform endpoint |
|---|---|---|
| Login | Sign in with email or phone | `POST /api/parent/auth/login` |
| Change password | Required on first login | `POST /api/parent/auth/change-password` |
| Home | Attendance, fees due, today's classes, results, exams, announcements, events | child-summary, fees, timetable, announcements, school-calendar |
| Attendance (#6) | Month switcher; this month / this year / days absent / full-days streak cards; band message; tap a day for morning/afternoon or why it isn't counted; legend; monthly trend with 90/75 lines (2+ months); upcoming holidays; absences | `GET /api/parent/attendance?month=` |
| Fees | Summary, dues, payments, waivers; Pay by UPI (#11) | `GET /api/parent/fees`, `GET /api/fees/upi-qr/info`, `POST /api/parent/fees` |
| Exams (#6) | Today's exams with live countdown, next 60 days, exam calendar with day detail (time, duration, room, subjects), completed (last 60 days), released results; `?tab=upcoming|results` | `GET /api/exams/calendar`, `GET /api/students/{id}/exams` |
| Mark sheet | Per-subject marks with Pass/Fail, parent sign-off with Confirm / Cancel | `GET /api/students/{id}/exams`, `POST /api/exams/{id}/acknowledge` |
| Notifications (#6) | Grouped Exams / Marks & Results / Messages / Attendance / Birthdays / Fees; mark all, mark a group, tap to open the related screen (switches child from `data.student_id`) | `GET`/`PUT /api/notifications` |
| Home → Quick links (#10) | Icon grid to every screen; "Off" = school switched it off, "Soon" = not built yet | school feature flags from the session |
| Library → Book (#9) | Download a textbook, read it offline in the app, page slider, rotate to landscape, remove download | `GET /api/school/library`, the book's `file_url` (`/api/materials/file` → R2) |
