// English/Telugu strings for the app. Keys shared with the web parent portal
// (.webref/app_parent_translations.ts) reuse the same name and English text;
// app-only screens (login, exam detail, book reader, etc.) add their own keys.
import { useSession, type Lang } from '@/stores/session'

export type { Lang }
export type Strings = typeof en

const en = {
  // Reused across several screens
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  done: 'Done',
  today: 'Today',
  tomorrow: 'Tomorrow',
  urgent: 'Urgent',
  acknowledged: 'Acknowledged',
  language: 'Language',
  cancel: 'Cancel',
  close: 'Close',
  saving: 'Saving...',
  savingEllipsis: 'Saving…',
  tryAgain: 'Try again',
  thisMonth: 'This month',
  seeAll: 'See all',
  allClear: 'All clear',
  password: 'Password',
  privacyPolicy: 'Privacy policy',
  appName: 'WLYL Parent',
  notAvailableTitle: 'Not available yet',
  notAvailableHint: "Your school's server doesn't have this feature yet.",
  classRoll: (grade: string, section: string, roll: string) => `Class ${grade}-${section} · Roll ${roll}`,

  // Exam type / payment mode labels (resolved in place of src/lib/api.ts's EXAM_TYPE/PAY_MODE)
  examType: { unit_test: 'Unit Test', mid_term: 'Mid Term', final_exam: 'Final Exam', practical: 'Practical' } as Record<string, string>,
  payMode: { cash: 'Cash', cheque: 'Cheque', dd: 'Demand draft', online: 'UPI (app)', upi: 'UPI' } as Record<string, string>,

  // Tabs shell: src/app/(tabs)/_layout.tsx
  tabs: { home: 'Home', attendance: 'Attendance', fees: 'Fees', exams: 'Exams', more: 'More' },
  layout: { loadingAccount: 'Loading your account', loadError: 'Could not load your account' },

  // Stack screen titles, shared with quick-links labels
  screenTitles: { calendar: 'Calendar', syllabus: 'Syllabus', library: 'Library', notifications: 'Notifications', profile: 'Profile' },

  // Home: src/app/(tabs)/index.tsx
  home: {
    feesOverdue: (n: number, amt: string) => `${n} fee${n > 1 ? 's' : ''} overdue · ${amt} outstanding`,
    resultsWaiting: (n: number) => `${n} result${n > 1 ? 's' : ''} waiting for your acknowledgement`,
    attendance: 'Attendance',
    feesDue: 'Fees due',
    tapToPay: 'Tap to pay',
    todaysClasses: "Today's classes",
    noClassesTitle: 'No classes today',
    noClassesHint: 'Enjoy the day off.',
    freePeriod: 'Free period',
    now: 'Now',
    examsTitle: 'Exams',
    latestResult: 'Latest result',
    tapToViewMarkSheet: 'Tap to view mark sheet',
    noExamsYet: 'No exams yet',
    fromSchool: 'From the school',
    important: 'Important',
    comingUp: 'Coming up',
    subjectsCount: (n: number) => `${n} subjects`,
  },

  // Attendance: src/app/(tabs)/attendance.tsx
  attendance: {
    half: 'Half day',
    holiday: 'Holiday',
    weeklyOff: 'Weekly off',
    upcoming: 'Upcoming',
    beforeJoining: 'Before joining',
    loadError: 'Failed to load attendance',
    loading: 'Loading attendance...',
    markedSessions: (n: number) => `${n} marked sessions`,
    emptyTitle: 'No attendance marked yet',
    emptyHint: "Your child's daily attendance will appear here.",
    byMonth: 'By month',
    absencesTitle: 'Absences and late arrivals',
    sessionsLine: (attended: number, marked: number, pctText: string) => `${attended}/${marked} sessions · ${pctText}`,
    fullAttendanceTitle: 'Full attendance',
    fullAttendanceHint: 'No absences or late arrivals this month.',
    weekdayLetters: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  },

  // Exams: src/app/(tabs)/exams.tsx
  exams: {
    inDays: (n: number) => `In ${n} days`,
    loadingCalendar: 'Loading exam calendar',
    noExamsOn: (date: string) => `No exams on ${date}`,
    tapDayHint: 'Tap a day to see that day’s exams.',
    tabUpcoming: 'Upcoming',
    tabResults: 'Results',
    noneScheduledTitle: 'No exams scheduled',
    noneScheduledHint: 'Upcoming exams for the next two months appear here.',
    startsWord: 'starts',
    noResultsYet: 'No results released yet',
    gradeChip: (grade: string) => `Grade ${grade}`,
    signOffNeeded: 'Sign-off needed',
  },

  // Fees: src/app/(tabs)/fees.tsx
  fees: {
    notEnabled: 'Fee details are not enabled for your school yet.',
    statusPaid: 'Paid',
    statusOverdue: 'Overdue',
    statusPartial: 'Partly paid',
    statusDue: 'Due',
    statusWaived: 'Waived',
    statusReceived: 'Received',
    statusAwaitingVerification: 'Awaiting verification',
    statusRejected: 'Rejected',
    outstandingHeader: (year: string) => `Outstanding · ${year}`,
    thisYear: 'this year',
    overdueChip: (n: number) => `${n} overdue`,
    payByUpi: (amt: string) => `Pay ${amt} by UPI`,
    paidSummary: (paid: string, waivedPart: string, due: string) => `Paid ${paid}${waivedPart} of ${due}`,
    concessionSuffix: (amt: string) => ` + ${amt} concession`,
    payAtOffice: 'Pay at the school office. Receipts will show here.',
    tabDues: 'Dues',
    tabPayments: 'Payments',
    tabAll: 'All items',
    nothingDueTitle: 'Nothing due',
    nothingDueHint: 'All fee items for this year are settled.',
    noPaymentsYet: 'No payments yet',
    concessionsTitle: 'Concessions',
    noFeesSetup: 'No fees set up for this year',
    dueSuffix: (date: string) => ` · due ${date}`,
    ledgerPaidSummary: (paid: string, concessionPart: string, due: string) => `${paid} paid${concessionPart} of ${due}`,
    ledgerConcessionSuffix: (amt: string) => ` · ${amt} concession`,
    toPay: (amt: string) => `${amt} to pay`,
  },

  // Pay sheet: src/components/pay-sheet.tsx
  paySheet: {
    title: 'Pay fees by UPI',
    subtitle: 'Pay from any UPI app, then enter the transaction ID so the school can verify it.',
    noUpi: "Your school hasn't set up UPI payments yet. Please pay at the school office.",
    amountLabel: (total: string) => `Amount (up to ${total})`,
    payingTo: (name: string) => `Paying to ${name}`,
    payWithApp: (amt: string) => `Pay ${amt} with UPI app`,
    enterValidAmount: 'Enter a valid amount',
    alreadyPaid: "I've already paid",
    utrLabel: 'UPI transaction ID (UTR)',
    utrPlaceholder: '12-digit number from your UPI app',
    submitVerification: 'Submit for verification',
    back: 'Back',
    doneTitle: 'Payment submitted',
    doneHint: (statusLabel: string) => `The school office will verify it. It shows under Payments as "${statusLabel}" until then.`,
    noUpiAppError: (amt: string, upiId: string, alreadyPaidLabel: string) =>
      `No UPI app found on this phone. Pay ${amt} to ${upiId} from any UPI app, then tap "${alreadyPaidLabel}".`,
    recordError: 'Could not record the payment',
  },

  // Calendar: src/app/calendar.tsx
  calendar: {
    filterAll: 'All',
    filterHolidays: 'Holidays',
    filterExams: 'Exams',
    filterEvents: 'Events',
    labelHoliday: 'Holiday',
    labelExam: 'Exam',
    labelMeeting: 'Meeting',
    labelEvent: 'Event',
    labelOther: 'Other',
    nothingOn: (date: string) => `${date} — nothing scheduled.`,
    nothingThisMonth: 'Nothing scheduled this month.',
  },

  // Syllabus: src/app/syllabus.tsx
  syllabus: {
    notEnabled: 'Syllabus tracking is not enabled for your school.',
    emptyTitle: 'Syllabus not added yet',
    emptyHint: (name: string) => `Topics appear here as ${name}'s teachers mark them taught.`,
    taughtBy: (name: string) => `Taught by ${name}`,
    topicsTaught: (covered: number, total: number) => `${covered} of ${total} topics taught`,
    semester: (n: number) => `Semester ${n}`,
    taughtWord: 'Taught',
    noTopicsYet: 'No topics added to this chapter yet.',
  },

  // Library: src/app/library.tsx
  library: {
    notEnabled: 'The digital library is not enabled for your school.',
    noTextbooksTitle: (grade: string) => `No textbooks for Grade ${grade}`,
    inYear: (year: string) => ` in ${year}`,
    noTextbooksHint: (yearSuffix: string) => `Your school has not assigned textbooks for this grade${yearSuffix}. Books will appear here once the school adds them. Pull down to check again.`,
    textbook: 'Textbook',
    handbook: 'Handbook',
    itemMeta: (type: string, date: string) => `${type} · added ${date}`,
    downloaded: 'Downloaded',
  },

  // Notifications: src/app/notifications.tsx
  notifications: { empty: 'No notifications' },

  // Profile: src/app/profile.tsx
  profile: {
    schoolDetails: 'School Details',
    schoolFallback: 'School',
    linkedChildren: 'Linked Children',
    linkedChild: 'Linked Child',
    editProfile: 'Edit Profile',
    editNotAvailableHint: "Editing your profile isn't available yet.",
    nameLabel: 'Name',
    emailLabel: 'Email',
    mobileLabel: 'Mobile number',
    signInHint: 'You sign in with this email or mobile number.',
    errName: 'Enter your name',
    errEmail: 'Enter a valid email',
    errPhone: 'Enter a 10-digit mobile number',
    errContact: 'Keep at least an email or a phone number to sign in with',
    saveError: 'Could not save',
    saved: 'Saved',
    saveChanges: 'Save changes',
  },

  // Change password: src/app/change-password.tsx
  changePassword: {
    title: 'Set your password',
    subtitle: 'Replace the temporary password from your school with one only you know.',
    tempLabel: 'Temporary password',
    newLabel: 'New password (8+ characters)',
    repeatLabel: 'Repeat new password',
    mismatch: 'New passwords do not match',
    tooShort: 'New password must be at least 8 characters',
    error: 'Could not change password',
    submit: 'Save and continue',
    logout: 'Log out instead',
  },

  // Login: src/app/login.tsx
  login: {
    subtitle: 'Sign in with the login your school sent you.',
    identifierLabel: 'Email or phone number',
    signingIn: 'Signing in…',
    signIn: 'Sign in',
    error: 'Login failed',
  },

  // Exam detail: src/app/exam/[id].tsx
  examDetail: {
    backToResults: 'Results',
    marksWord: 'marks',
    someMarksNotEntered: 'Some marks not entered yet',
    passed: 'Passed',
    belowPassMark: 'Below pass mark',
    passMark: (pct: number) => `Pass mark ${pct}%`,
    teacherRemarksTitle: "Class teacher's remarks",
    conductChip: (conduct: string) => `Conduct: ${conduct}`,
    attendanceLabel: 'Attendance: ',
    nextTermLabel: 'Next term: ',
    byName: (name: string) => `by ${name}`,
    onDate: (date: string) => ` on ${date}`,
    you: 'you',
    pleaseAcknowledge: 'Please acknowledge this result',
    tellsTeacher: (name: string) => `This tells the class teacher you have seen ${name}'s marks.`,
    iHaveSeen: 'I have seen this result',
    notAvailable: 'This result is not available.',
    ackError: 'Could not acknowledge',
  },

  // Book reader: src/app/book/[id].tsx
  book: {
    removeTitle: 'Remove download?',
    removeMessage: 'The book will be removed from this phone. You can download it again anytime.',
    remove: 'Remove',
    readPortrait: 'Read in portrait',
    readLandscape: 'Read in landscape',
    removeDownload: 'Remove download',
    titleFallback: 'Book',
    noLink: 'This book has no download link.',
    downloadFailed: 'Download failed',
    downloadErrorPrefix: (msg: string) => `Couldn't download this book. ${msg}`,
    downloadingLine: (pct: number | null) => `${pct === null ? 'Downloading…' : `Downloading ${pct}%`} · saved on this phone for offline reading`,
    openingBook: 'Opening book',
  },

  // Child header: src/components/child-header.tsx
  header: {
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    greetingSuffix: (name: string) => `, ${name}`,
    ay: (year: string) => `AY ${year}`,
    logOut: 'Log out',
    childrenList: 'Children',
    classShort: (grade: string, section: string) => `Class ${grade}-${section}`,
  },

  // Quick links: src/components/quick-links.tsx
  quickLinks: {
    title: 'Quick links',
    payFees: 'Pay fees',
    homework: 'Homework',
    leave: 'Leave',
    bus: 'Bus',
    rewards: 'Rewards',
    activity: 'Activity',
    timetable: 'Timetable',
    receipts: 'Receipts',
    reportCard: 'Report card',
    photos: 'Photos',
    busLive: 'Bus live',
    offBadge: 'Off',
    soonBadge: 'Soon',
    accessibilityComingSoon: (label: string) => `${label}, coming soon`,
    accessibilityOff: (label: string) => `${label}, turned off by the school`,
  },

  // More tab: src/app/(tabs)/more.tsx
  more: {
    school: 'School',
    account: 'Account',
    signOut: 'Sign out',
    langEnglish: 'English',
    langTelugu: 'తెలుగు',
  },

  // Class loading: src/components/class-loading.tsx
  classLoading: { loading: "Loading your child's class" },

  // Month calendar: src/components/month-calendar.tsx
  monthCalendar: {
    weekdayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
  },

  // Shared bits: src/components/ui.tsx
  ui: { loading: 'Loading', showPassword: 'Show password', hidePassword: 'Hide password' },

  // Android notification channel names: src/lib/push.ts
  pushChannels: { exams: 'Exams', results: 'Results', fees: 'Fees', absent: 'Attendance', messages: 'School messages', birthday: 'Birthdays' },
}

const te: typeof en = {
  present: 'హాజరు',
  absent: 'గైర్హాజరు',
  late: 'ఆలస్యం',
  done: 'పూర్తయింది',
  today: 'నేడు',
  tomorrow: 'రేపు',
  urgent: 'అత్యవసర',
  acknowledged: 'నిర్ధారించబడింది',
  language: 'భాష',
  cancel: 'రద్దు',
  close: 'మూసివేయి',
  saving: 'సేవ్ అవుతున్నది...',
  savingEllipsis: 'సేవ్ అవుతున్నది…',
  tryAgain: 'మళ్లీ ప్రయత్నించండి',
  thisMonth: 'ఈ నెల',
  seeAll: 'అన్నీ చూడండి',
  allClear: 'అంతా సరిగ్గా ఉంది',
  password: 'పాస్‌వర్డ్',
  privacyPolicy: 'గోప్యతా విధానం',
  appName: 'WLYL Parent',
  notAvailableTitle: 'ఇంకా అందుబాటులో లేదు',
  notAvailableHint: 'మీ పాఠశాల సర్వర్‌లో ఈ ఫీచర్ ఇంకా అందుబాటులో లేదు.',
  classRoll: (grade, section, roll) => `తరగతి ${grade}-${section} · హాజరు సంఖ్య ${roll}`,

  examType: { unit_test: 'యూనిట్ టెస్ట్', mid_term: 'మిడ్ టర్మ్', final_exam: 'ఫైనల్ పరీక్ష', practical: 'ప్రాక్టికల్' },
  payMode: { cash: 'నగదు', cheque: 'చెక్', dd: 'డిమాండ్ డ్రాఫ్ట్', online: 'UPI (యాప్)', upi: 'UPI' },

  tabs: { home: 'హోమ్', attendance: 'హాజరు', fees: 'రుసుములు', exams: 'పరీక్షలు', more: 'మరిన్ని' },
  layout: { loadingAccount: 'మీ ఖాతా లోడ్ అవుతున్నది', loadError: 'మీ ఖాతాను లోడ్ చేయలేకపోయాము' },

  screenTitles: { calendar: 'క్యాలెండర్', syllabus: 'పాఠ్యక్రమం', library: 'లైబ్రరీ', notifications: 'నోటిఫికేషన్లు', profile: 'ప్రొఫైల్' },

  home: {
    feesOverdue: (n, amt) => `${n} రుసుము${n > 1 ? 'లు' : ''} ఆలస్యం · ${amt} బాకీ`,
    resultsWaiting: (n) => `${n} ఫలితం${n > 1 ? 'లు' : ''} మీ నిర్ధారణ కోసం వేచి ఉన్నాయి`,
    attendance: 'హాజరు',
    feesDue: 'రుసుము బాకీ',
    tapToPay: 'చెల్లించడానికి నొక్కండి',
    todaysClasses: 'నేటి తరగతులు',
    noClassesTitle: 'నేడు తరగతులు లేవు',
    noClassesHint: 'విరామ దినాన్ని ఆస్వాదించండి.',
    freePeriod: 'విరామ వ్యవధి',
    now: 'ఇప్పుడు',
    examsTitle: 'పరీక్షలు',
    latestResult: 'తాజా ఫలితం',
    tapToViewMarkSheet: 'మార్క్ షీట్ చూడటానికి నొక్కండి',
    noExamsYet: 'ఇంకా పరీక్షలు లేవు',
    fromSchool: 'పాఠశాల నుండి',
    important: 'ముఖ్యమైనది',
    comingUp: 'రాబోయేవి',
    subjectsCount: (n) => `${n} సబ్జెక్టులు`,
  },

  attendance: {
    half: 'సగం రోజు',
    holiday: 'సెలవు',
    weeklyOff: 'వారాంతపు సెలవు',
    upcoming: 'రాబోయేది',
    beforeJoining: 'చేరిక ముందు',
    loadError: 'హాజరు లోడ్ చేయడంలో విఫలమైంది',
    loading: 'హాజరు లోడ్ అవుతున్నది...',
    markedSessions: (n) => `${n} నమోదైన సెషన్లు`,
    emptyTitle: 'ఇంకా హాజరు నమోదు కాలేదు',
    emptyHint: 'మీ పిల్లల రోజువారీ హాజరు ఇక్కడ కనిపిస్తుంది.',
    byMonth: 'నెల వారీగా',
    absencesTitle: 'గైర్హాజరులు మరియు ఆలస్యాలు',
    sessionsLine: (attended, marked, pctText) => `${attended}/${marked} సెషన్లు · ${pctText}`,
    fullAttendanceTitle: 'పూర్తి హాజరు',
    fullAttendanceHint: 'ఈ నెలలో గైర్హాజరులు లేదా ఆలస్యాలు లేవు.',
    weekdayLetters: ['సో', 'మం', 'బు', 'గు', 'శు', 'శ', 'ఆ'],
  },

  exams: {
    inDays: (n) => `${n} రోజుల్లో`,
    loadingCalendar: 'పరీక్షల పంచాంగం లోడ్ అవుతున్నది',
    noExamsOn: (date) => `${date}న పరీక్షలు లేవు`,
    tapDayHint: 'ఆ రోజు పరీక్షలు చూడటానికి ఒక రోజును నొక్కండి.',
    tabUpcoming: 'రాబోయేవి',
    tabResults: 'ఫలితాలు',
    noneScheduledTitle: 'పరీక్షలు షెడ్యూల్ కాలేదు',
    noneScheduledHint: 'రాబోయే రెండు నెలల పరీక్షలు ఇక్కడ కనిపిస్తాయి.',
    startsWord: 'ప్రారంభం',
    noResultsYet: 'ఇంకా ఫలితాలు ప్రచురించలేదు',
    gradeChip: (grade) => `గ్రేడ్ ${grade}`,
    signOffNeeded: 'సంతకం అవసరం',
  },

  fees: {
    notEnabled: 'రుసుముల వివరాలు మీ పాఠశాలకు ఇంకా అందుబాటులో లేవు.',
    statusPaid: 'చెల్లించారు',
    statusOverdue: 'ఆలస్యం',
    statusPartial: 'కొంత చెల్లించారు',
    statusDue: 'బాకీ',
    statusWaived: 'మాఫీ చేయబడింది',
    statusReceived: 'అందింది',
    statusAwaitingVerification: 'ధృవీకరణ కోసం వేచి ఉంది',
    statusRejected: 'తిరస్కరించబడింది',
    outstandingHeader: (year) => `బాకీ · ${year}`,
    thisYear: 'ఈ సంవత్సరం',
    overdueChip: (n) => `${n} ఆలస్యం`,
    payByUpi: (amt) => `UPI ద్వారా ${amt} చెల్లించు`,
    paidSummary: (paid, waivedPart, due) => `${due}లో ${paid}${waivedPart} చెల్లించారు`,
    concessionSuffix: (amt) => ` + ${amt} మాఫీ`,
    payAtOffice: 'పాఠశాల కార్యాలయంలో చెల్లించండి. రసీదులు ఇక్కడ చూపబడతాయి.',
    tabDues: 'బాకీలు',
    tabPayments: 'చెల్లింపులు',
    tabAll: 'అన్ని అంశాలు',
    nothingDueTitle: 'ఏమీ బాకీ లేదు',
    nothingDueHint: 'ఈ సంవత్సరం అన్ని రుసుము అంశాలు పరిష్కరించబడ్డాయి.',
    noPaymentsYet: 'ఇంకా చెల్లింపులు లేవు',
    concessionsTitle: 'మాఫీలు',
    noFeesSetup: 'ఈ సంవత్సరానికి రుసుములు సెట్ చేయలేదు',
    dueSuffix: (date) => ` · గడువు ${date}`,
    ledgerPaidSummary: (paid, concessionPart, due) => `${due}లో ${paid}${concessionPart} చెల్లించారు`,
    ledgerConcessionSuffix: (amt) => ` · ${amt} మాఫీ`,
    toPay: (amt) => `${amt} చెల్లించాలి`,
  },

  paySheet: {
    title: 'UPI ద్వారా రుసుము చెల్లించండి',
    subtitle: 'ఏదైనా UPI యాప్ నుండి చెల్లించి, పాఠశాల ధృవీకరించడానికి ట్రాన్సాక్షన్ ఐడి నమోదు చేయండి.',
    noUpi: 'మీ పాఠశాల ఇంకా UPI చెల్లింపులు సెట్ చేయలేదు. దయచేసి పాఠశాల కార్యాలయంలో చెల్లించండి.',
    amountLabel: (total) => `మొత్తం (${total} వరకు)`,
    payingTo: (name) => `${name}కి చెల్లిస్తున్నారు`,
    payWithApp: (amt) => `UPI యాప్‌తో ${amt} చెల్లించు`,
    enterValidAmount: 'చెల్లుబాటు అయ్యే మొత్తం నమోదు చేయండి',
    alreadyPaid: 'నేను ఇప్పటికే చెల్లించాను',
    utrLabel: 'UPI ట్రాన్సాక్షన్ ఐడి (UTR)',
    utrPlaceholder: 'మీ UPI యాప్ నుండి 12-అంకెల నంబర్',
    submitVerification: 'ధృవీకరణ కోసం సమర్పించు',
    back: 'వెనక్కు',
    doneTitle: 'చెల్లింపు సమర్పించబడింది',
    doneHint: (statusLabel) => `పాఠశాల కార్యాలయం దీన్ని ధృవీకరిస్తుంది. అప్పటి వరకు ఇది చెల్లింపుల్లో "${statusLabel}"గా చూపబడుతుంది.`,
    noUpiAppError: (amt, upiId, alreadyPaidLabel) =>
      `ఈ ఫోన్‌లో UPI యాప్ కనుగొనబడలేదు. ఏదైనా UPI యాప్ నుండి ${upiId}కి ${amt} చెల్లించి, తర్వాత "${alreadyPaidLabel}" నొక్కండి.`,
    recordError: 'చెల్లింపును నమోదు చేయలేకపోయాము',
  },

  calendar: {
    filterAll: 'అన్నీ',
    filterHolidays: 'సెలవులు',
    filterExams: 'పరీక్షలు',
    filterEvents: 'కార్యక్రమాలు',
    labelHoliday: 'సెలవు',
    labelExam: 'పరీక్ష',
    labelMeeting: 'మీటింగ్',
    labelEvent: 'కార్యక్రమం',
    labelOther: 'ఇతర',
    nothingOn: (date) => `${date} — ఏమీ షెడ్యూల్ కాలేదు.`,
    nothingThisMonth: 'ఈ నెలలో ఏమీ షెడ్యూల్ కాలేదు.',
  },

  syllabus: {
    notEnabled: 'పాఠ్యక్రమ ట్రాకింగ్ మీ పాఠశాలకు ఇంకా అందుబాటులో లేదు.',
    emptyTitle: 'పాఠ్యక్రమం ఇంకా చేర్చలేదు',
    emptyHint: (name) => `${name} యొక్క ఉపాధ్యాయులు పాఠాలు బోధించినట్లు గుర్తించినప్పుడు అంశాలు ఇక్కడ కనిపిస్తాయి.`,
    taughtBy: (name) => `${name} బోధిస్తున్నారు`,
    topicsTaught: (covered, total) => `${total}లో ${covered} అంశాలు బోధించారు`,
    semester: (n) => `సెమిస్టర్ ${n}`,
    taughtWord: 'బోధించారు',
    noTopicsYet: 'ఈ చాప్టర్‌కు ఇంకా అంశాలు చేర్చలేదు.',
  },

  library: {
    notEnabled: 'డిజిటల్ లైబ్రరీ మీ పాఠశాలకు ఇంకా అందుబాటులో లేదు.',
    noTextbooksTitle: (grade) => `గ్రేడ్ ${grade}కి పాఠ్యపుస్తకాలు లేవు`,
    inYear: (year) => ` ${year}లో`,
    noTextbooksHint: (yearSuffix) => `మీ పాఠశాల ఈ గ్రేడ్‌కి${yearSuffix} పాఠ్యపుస్తకాలు ఇంకా కేటాయించలేదు. పాఠశాల వాటిని చేర్చిన తర్వాత పుస్తకాలు ఇక్కడ కనిపిస్తాయి. తిరిగి తెలుసుకోవడానికి లాగి వదలండి.`,
    textbook: 'పాఠ్యపుస్తకం',
    handbook: 'హ్యాండ్‌బుక్',
    itemMeta: (type, date) => `${type} · ${date} న చేర్చారు`,
    downloaded: 'డౌన్‌లోడ్ చేయబడింది',
  },

  notifications: { empty: 'నోటిఫికేషన్లు లేవు' },

  profile: {
    schoolDetails: 'పాఠశాల వివరాలు',
    schoolFallback: 'పాఠశాల',
    linkedChildren: 'అనుసంధానించిన పిల్లలు',
    linkedChild: 'అనుసంధానించిన పిల్లవాడు',
    editProfile: 'ప్రొఫైల్ సవరించు',
    editNotAvailableHint: 'మీ ప్రొఫైల్ సవరించడం ఇంకా అందుబాటులో లేదు.',
    nameLabel: 'పేరు',
    emailLabel: 'ఇమెయిల్',
    mobileLabel: 'మొబైల్ నంబర్',
    signInHint: 'మీరు ఈ ఇమెయిల్ లేదా మొబైల్ నంబర్‌తో సైన్ ఇన్ అవుతారు.',
    errName: 'మీ పేరు నమోదు చేయండి',
    errEmail: 'చెల్లుబాటు అయ్యే ఇమెయిల్ నమోదు చేయండి',
    errPhone: '10-అంకెల మొబైల్ నంబర్ నమోదు చేయండి',
    errContact: 'సైన్ ఇన్ కావడానికి కనీసం ఇమెయిల్ లేదా ఫోన్ నంబర్ ఉంచండి',
    saveError: 'సేవ్ చేయలేకపోయాము',
    saved: 'సేవ్ చేయబడింది',
    saveChanges: 'మార్పులు సేవ్ చేయండి',
  },

  changePassword: {
    title: 'మీ పాస్‌వర్డ్ సెట్ చేయండి',
    subtitle: 'మీ పాఠశాల ఇచ్చిన తాత్కాలిక పాస్‌వర్డ్‌ను మీకు మాత్రమే తెలిసిన దానితో మార్చండి.',
    tempLabel: 'తాత్కాలిక పాస్‌వర్డ్',
    newLabel: 'కొత్త పాస్‌వర్డ్ (8+ అక్షరాలు)',
    repeatLabel: 'కొత్త పాస్‌వర్డ్ తిరిగి నమోదు చేయండి',
    mismatch: 'కొత్త పాస్‌వర్డ్‌లు సరిపోలలేదు',
    tooShort: 'కొత్త పాస్‌వర్డ్ కనీసం 8 అక్షరాలు ఉండాలి',
    error: 'పాస్‌వర్డ్ మార్చలేకపోయాము',
    submit: 'సేవ్ చేసి కొనసాగించండి',
    logout: 'బదులుగా లాగ్ అవుట్ చేయండి',
  },

  login: {
    subtitle: 'మీ పాఠశాల పంపిన లాగిన్‌తో సైన్ ఇన్ చేయండి.',
    identifierLabel: 'ఇమెయిల్ లేదా ఫోన్ నంబర్',
    signingIn: 'సైన్ ఇన్ అవుతున్నారు…',
    signIn: 'సైన్ ఇన్',
    error: 'లాగిన్ విఫలమైంది',
  },

  examDetail: {
    backToResults: 'ఫలితాలు',
    marksWord: 'మార్కులు',
    someMarksNotEntered: 'కొన్ని మార్కులు ఇంకా నమోదు చేయలేదు',
    passed: 'పాస్ అయ్యారు',
    belowPassMark: 'పాస్ మార్క్ కంటే తక్కువ',
    passMark: (pct) => `పాస్ మార్క్ ${pct}%`,
    teacherRemarksTitle: 'తరగతి ఉపాధ్యాయుని వ్యాఖ్యలు',
    conductChip: (conduct) => `నడవడిక: ${conduct}`,
    attendanceLabel: 'హాజరు: ',
    nextTermLabel: 'తదుపరి టర్మ్: ',
    byName: (name) => `${name} ద్వారా`,
    onDate: (date) => ` ${date}న`,
    you: 'మీరు',
    pleaseAcknowledge: 'దయచేసి ఈ ఫలితాన్ని నిర్ధారించండి',
    tellsTeacher: (name) => `ఇది మీరు ${name} యొక్క మార్కులు చూశారని తరగతి ఉపాధ్యాయునికి తెలియజేస్తుంది.`,
    iHaveSeen: 'నేను ఈ ఫలితం చూశాను',
    notAvailable: 'ఈ ఫలితం అందుబాటులో లేదు.',
    ackError: 'నిర్ధారించలేకపోయాము',
  },

  book: {
    removeTitle: 'డౌన్‌లోడ్ తీసివేయాలా?',
    removeMessage: 'పుస్తకం ఈ ఫోన్ నుండి తీసివేయబడుతుంది. మీరు దీన్ని ఎప్పుడైనా తిరిగి డౌన్‌లోడ్ చేసుకోవచ్చు.',
    remove: 'తీసివేయి',
    readPortrait: 'నిలువు తీరులో చదవండి',
    readLandscape: 'అడ్డ తీరులో చదవండి',
    removeDownload: 'డౌన్‌లోడ్ తీసివేయి',
    titleFallback: 'పుస్తకం',
    noLink: 'ఈ పుస్తకానికి డౌన్‌లోడ్ లింక్ లేదు.',
    downloadFailed: 'డౌన్‌లోడ్ విఫలమైంది',
    downloadErrorPrefix: (msg) => `ఈ పుస్తకం డౌన్‌లోడ్ చేయలేకపోయాము. ${msg}`,
    downloadingLine: (pct) => `${pct === null ? 'డౌన్‌లోడ్ అవుతున్నది…' : `${pct}% డౌన్‌లోడ్ అవుతున్నది`} · ఆఫ్‌లైన్ చదవడానికి ఈ ఫోన్‌లో సేవ్ చేయబడింది`,
    openingBook: 'పుస్తకం తెరుచుకుంటున్నది',
  },

  header: {
    goodMorning: 'శుభోదయం',
    goodAfternoon: 'శుభ మధ్యాహ్నం',
    goodEvening: 'శుభ సాయంత్రం',
    greetingSuffix: (name) => `, ${name}`,
    ay: (year) => `AY ${year}`,
    logOut: 'లాగ్ అవుట్',
    childrenList: 'పిల్లలు',
    classShort: (grade, section) => `తరగతి ${grade}-${section}`,
  },

  quickLinks: {
    title: 'త్వరిత లింకులు',
    payFees: 'రుసుము చెల్లించు',
    homework: 'ఇంటి పని',
    leave: 'సెలవు',
    bus: 'బస్సు',
    rewards: 'బహుమతులు',
    activity: 'కార్యకలాపం',
    timetable: 'టైమ్‌టేబుల్',
    receipts: 'రసీదులు',
    reportCard: 'రిపోర్ట్ కార్డ్',
    photos: 'ఫోటోలు',
    busLive: 'బస్సు లైవ్',
    offBadge: 'ఆఫ్',
    soonBadge: 'త్వరలో',
    accessibilityComingSoon: (label) => `${label}, త్వరలో వస్తుంది`,
    accessibilityOff: (label) => `${label}, పాఠశాల ద్వారా ఆఫ్ చేయబడింది`,
  },

  more: {
    school: 'పాఠశాల',
    account: 'ఖాతా',
    signOut: 'సైన్ అవుట్',
    langEnglish: 'English',
    langTelugu: 'తెలుగు',
  },

  classLoading: { loading: 'మీ పిల్లల తరగతి లోడ్ అవుతున్నది' },

  monthCalendar: {
    weekdayShort: ['ఆది', 'సోమ', 'మంగళ', 'బుధ', 'గురు', 'శుక్ర', 'శని'],
    monthNames: ['జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్', 'జూలై', 'ఆగస్టు', 'సెప్టెంబర్', 'అక్టోబర్', 'నవంబర్', 'డిసెంబర్'],
    prevMonth: 'మునుపటి నెల',
    nextMonth: 'తర్వాతి నెల',
  },

  ui: { loading: 'లోడ్ అవుతున్నది', showPassword: 'పాస్‌వర్డ్ చూపించు', hidePassword: 'పాస్‌వర్డ్ దాచు' },

  pushChannels: { exams: 'పరీక్షలు', results: 'ఫలితాలు', fees: 'ఫీజులు', absent: 'హాజరు', messages: 'బడి సందేశాలు', birthday: 'పుట్టినరోజులు' },
}

export const TRANSLATIONS = { en, te }

// Defaults to English when the store has no `lang` yet (e.g. screen tests mock useSession without it).
export function useT() {
  const { lang } = useSession()
  return TRANSLATIONS[lang ?? 'en']
}
