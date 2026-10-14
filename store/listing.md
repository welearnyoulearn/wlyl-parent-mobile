# WLYL Parent — Play Console listing (draft)

Package `com.welearnyoulearn.parent`, published under Varchas Studios. Drafts: confirm each answer against the build before submitting.

## Main store listing

- **App name** (30 max): WLYL Parent
- **Short description** (80 max): Attendance, fees, exam marks and notices from your child's school.
- **Full description:**

> WLYL Parent is the parent app for schools that use the We Learn You Learn (WLYL) school platform.
>
> Sign in with the email or phone number your school registered, and keep up with your child's school day:
>
> • Attendance — see each day, morning and afternoon
> • Fees — what is due, what is paid, and your receipts
> • Exams — upcoming exam dates and your child's mark sheets
> • Timetable — the class timetable for every day of the week
> • Calendar and notices — holidays, meetings and school announcements
> • Library — download textbooks and read them offline
>
> Parents with more than one child at the school can switch between them in one tap.
>
> Your login comes from your school. If you don't have one, please contact the school office.

- **App icon:** `store/icon-512.png`
- **Feature graphic:** `store/feature-graphic-1024x500.png`
- **Phone screenshots:** still needed, at least 2, taken from the production build signed in as the demo parent.
- **Category:** Education. **Tags:** education, school.
- **Contact email:** thindaam.ai@gmail.com
- **Website:** https://wlyl.varchas.store/
- **Privacy policy:** https://wlyl.varchas.store/privacy/

## App content

- **App access:** all functionality needs a login. Give reviewers the demo parent from `.play-review-credentials` (gitignored; fictional "WLYL Demo School"). Instructions: "Sign in with the email and password below. The account has two demo children; switch between them from the Home screen."
- **Ads:** no ads.
- **Content rating (IARC):** reference app / education, no violence, sexual content, gambling or user-to-user chat. Expected rating: Everyone / 3+.
- **Target audience:** 18 and over (parents). Not designed for children. The app shows children's school records, so answer the "appeals to children" question honestly: no child-focused design.
- **News app:** no. **Health app:** no. **Financial features:** none. Parents only report a UPI payment reference; the app does not move money.
- **Government app:** no.

## Data safety (draft answers)

- **Collects or shares data:** collects; does not share with third parties (only the child's school, through the WLYL platform).
- **Encrypted in transit:** yes (HTTPS).
- **Deletion:** users can request deletion at https://wlyl.varchas.store/delete-account/
- **Data types collected:**
  - Personal info → Name, Email address, Phone number: app functionality, account management. Required.
  - Financial info → Other financial info (UPI payment reference): app functionality. Optional.
  - App activity → Other user-generated content (leave requests, mark acknowledgements): app functionality. Optional.
  - Device or other IDs → push notification token: app functionality (notifications). Optional.
- **Not collected:** location, contacts, photos, audio, files, web history, health, advertising ID, analytics/crash data.
