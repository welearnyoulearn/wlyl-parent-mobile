# Parent app screens

**Status:** Built (first version) · **Issue:** welearnyoulearn/wlyl-parent-app#7

| Screen | Data | Platform endpoint |
|---|---|---|
| Login | Sign in with email or phone | `POST /api/parent/auth/login` |
| Forgot password (#2) | Sends a reset link (email/WhatsApp); the reset itself happens on the web | `POST /api/parent/auth/forgot-password` |
| Change password | Required on first login; also from Profile (current password needed) | `POST /api/parent/auth/change-password` |
| Birthday (#2) | Asked once after first login (Skip allowed); Add/Edit on Profile. Server checks age 18–100 | `PUT /api/parent/auth/date-of-birth` |
| Profile (#2) | Name, email, phone, school read-only; birthday; change password | `GET /api/parent/auth/me` |
| Home | Attendance, fees due, today's classes, results, exams, announcements, events | child-summary, fees, timetable, announcements, school-calendar |
| Attendance | Ring, month heat map, monthly %, absences | `GET /api/parent/attendance` |
| Fees | Summary, dues, payments, waivers; Pay by UPI (#11) | `GET /api/parent/fees`, `GET /api/fees/upi-qr/info`, `POST /api/parent/fees` |
| Exams | Upcoming exams, released results | child-summary, `GET /api/students/{id}/exams` |
| Mark sheet | Per-subject marks, parent sign-off | `GET /api/students/{id}/exams`, `POST /api/exams/{id}/acknowledge` |
| Home → Quick links (#10) | Icon grid to every screen; "Off" = school switched it off, "Soon" = not built yet | school feature flags from the session |
| Library → Book (#9) | Download a textbook, read it offline in the app, page slider, rotate to landscape, remove download | `GET /api/school/library`, the book's `file_url` (`/api/materials/file` → R2) |
| Signed-in shell (#3) | Keep-alive, access revoked → sign-in with notice, plan ended → "Portal access is paused" cover, usage heartbeat + section tracking (nav keys from `navKeyFor` in `src/stores/session.ts`); all polls run only while the app is in the foreground | `GET /api/parent/auth/me`, `GET /api/plan/status`, `POST /api/usage/heartbeat`, `POST /api/usage/track`, `POST /api/parent/auth/logout {usageSessionId}` |
