# Parent app screens

**Status:** Built (first version) · **Issue:** welearnyoulearn/wlyl-parent-app#7

| Screen | Data | Platform endpoint |
|---|---|---|
| Login | Sign in with email or phone | `POST /api/parent/auth/login` |
| Change password | Required on first login | `POST /api/parent/auth/change-password` |
| Home | Attendance, fees due, today's classes, results, exams, announcements, events | child-summary, fees, timetable, announcements, school-calendar |
| Attendance | Ring, month heat map, monthly %, absences | `GET /api/parent/attendance` |
| Fees | Summary, dues, payments, waivers | `GET /api/parent/fees` |
| Exams | Upcoming exams, released results | child-summary, `GET /api/students/{id}/exams` |
| Mark sheet | Per-subject marks, parent sign-off | `GET /api/students/{id}/exams`, `POST /api/exams/{id}/acknowledge` |
| Home → Quick links (#10) | Icon grid to every screen; "Off" = school switched it off, "Soon" = not built yet | school feature flags from the session |
| Library → Book (#9) | Download a textbook, read it offline in the app, page slider, rotate to landscape, remove download | `GET /api/school/library`, the book's `file_url` (`/api/materials/file` → R2) |
