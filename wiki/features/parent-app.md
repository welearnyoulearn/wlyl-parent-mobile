# Parent app screens

**Status:** Built (first version) · **Issue:** welearnyoulearn/wlyl-parent-app#7

| Screen | Data | Platform endpoint |
|---|---|---|
| Login | Sign in with email or phone | `POST /api/parent/auth/login` |
| Forgot password (#2) | Sends a reset link (email/WhatsApp); the reset itself happens on the web | `POST /api/parent/auth/forgot-password` |
| Change password | Required on first login; also from Profile (current password needed) | `POST /api/parent/auth/change-password` |
| Birthday (#2) | Asked once after first login (Skip allowed); Add/Edit on Profile. Server checks age 18–100 | `PUT /api/parent/auth/date-of-birth` |
| Profile (#2) | Name, email, phone, school read-only; birthday; change password | `GET /api/parent/auth/me` |
| Home | Attendance, fees due, contact & support (call buttons), results, exams, school notices (auto pop-up for unseen urgent / action-needed / greeting), events | child-summary, fees, `GET /api/parent/subjects`, announcements, school-calendar |
| School notices (#4) | Search, All / Unread / Pinned / Action needed / Past; opening marks seen; "I have read this" | `GET /api/announcements?scope=past`, `POST /api/announcements/{id}/read`, `POST /api/announcements/{id}/ack` |
| Header chips (#4) | "N results to sign" → Exams, "N fee overdue" → Fees | child-summary, fees (shared request cache) |
| Attendance (#6) | Month switcher; this month / this year / days absent / full-days streak cards; band message; tap a day for morning/afternoon or why it isn't counted; legend; monthly trend with 90/75 lines (2+ months); upcoming holidays; absences | `GET /api/parent/attendance?month=` |
| Fees | Summary per academic year, earlier-year dues, dues, payments, waivers; pay one, selected or all pending bills by UPI (#11, #5); PDF receipt for confirmed payments (expo-print + expo-sharing) | `GET /api/parent/fees`, `GET /api/academic-years`, `GET /api/fees/upi-qr/info`, `POST /api/parent/fees` |
| Exams (#6) | Today's exams with live countdown, next 60 days, exam calendar with day detail (time, duration, room, subjects), completed (last 60 days), released results; `?tab=upcoming|results` | `GET /api/exams/calendar`, `GET /api/students/{id}/exams` |
| Mark sheet | Per-subject marks with Pass/Fail, parent sign-off with Confirm / Cancel | `GET /api/students/{id}/exams`, `POST /api/exams/{id}/acknowledge` |
| Notifications (#6) | Grouped Exams / Marks & Results / Messages / Attendance / Birthdays / Fees; mark all, mark a group, tap to open the related screen (switches child from `data.student_id`) | `GET`/`PUT /api/notifications` |
| Home → Quick links (#10) | Icon grid to the screens the app has; "Off" = school switched it off. Unbuilt features are not shown | school feature flags from the session |
| Child colours | Each child has a colour (by position in the parent's list, `src/lib/child-colors.ts`): only the child cards in the header use it (solid when selected, light tint otherwise); the header and the rest of the app stay teal | session `children` |
| Library → Book (#9) | Download a textbook, read it offline in the app, page slider, rotate to landscape, remove download | `GET /api/school/library`, the book's `file_url` (`/api/materials/file` → R2) |
| Signed-in shell (#3) | Keep-alive, access revoked → sign-in with notice, plan ended → "Portal access is paused" cover, usage heartbeat + section tracking (nav keys from `navKeyFor` in `src/stores/session.ts`); all polls run only while the app is in the foreground | `GET /api/parent/auth/me`, `GET /api/plan/status`, `POST /api/usage/heartbeat`, `POST /api/usage/track`, `POST /api/parent/auth/logout {usageSessionId}` |
