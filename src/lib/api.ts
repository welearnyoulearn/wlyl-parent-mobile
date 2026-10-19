// Typed client for the WLYL platform's parent APIs. Types and helpers are copied
// from the web parent app (wlyl-parent-app/lib/api.ts); shapes mirror the
// platform's route code.
//
// Auth: the platform sets an httpOnly `wlyl-parent` cookie on login. React
// Native's fetch keeps cookies in the OS cookie jar (NSHTTPCookieStorage /
// OkHttp CookieJar), so sending credentials is enough; no token handling.
// ponytail: cookie auth, move to a bearer token on the platform if the native
// cookie jar ever proves unreliable (see welearnyoulearn/wlyl-parent-app#7).
import { clearRequestCache } from './request-cache'

export const API_ORIGIN = process.env.EXPO_PUBLIC_API_ORIGIN ?? 'https://wlyl-dev.vercel.app'
// Google Play requires the privacy policy to be reachable inside the app (source: site/).
export const PRIVACY_URL = 'https://wlyl.varchas.store/privacy/'

export type Child = { id: number; name: string; grade: string; section: string; roll_number: string; school_id: number; has_photo?: boolean }
export type Me = {
  id: number; name: string | null; email: string | null; phone: string | null
  school_id: number; school_name: string | null; password_changed: boolean; children: Child[]
}
export type Exam = { id: number; exam_name: string; exam_type: string; exam_date: string; subjects: string[]; total_subjects: number }
export type Result = {
  id: number; exam_name: string; exam_type: string; exam_date: string
  passing_pct: number; total_obtained: number | null; total_max: number | null; parent_acknowledged: boolean
}
export type Summary = { upcoming_exams: Exam[]; released_results: Result[]; unacknowledged_count: number; attendance_pct: number | null }

export type SubjectMark = {
  subject_name: string; max_marks: number; marks_obtained: number | null; is_absent: boolean
  percentage: number | null; grade: string | null; pass: boolean | null
}
export type MarkSheet = {
  exam_id: number; exam_name: string; exam_type: string; exam_date: string; passing_pct: number; released_at: string | null
  subjects: SubjectMark[]; total_obtained: number | null; total_max: number; percentage: number | null
  grade: string | null; pass: boolean | null
  parent_acknowledged: boolean; parent_ack_name: string | null; parent_ack_at: string | null
  remarks?: Remarks | null
}
export type Remarks = { class_teacher_remark: string | null; conduct: string | null; attendance_remark: string | null; next_term_advice: string | null }

export type Period = {
  period_number: number; day_of_week: string; time_from: string; time_to: string
  subject_name: string | null; teacher_name: string | null; is_break: boolean; break_label: string | null
}
export type Timetable = { periods: Period[]; week_periods: Period[]; day: string }

export type AttendanceDay = { date: string; morning: string | null; afternoon: string | null; status: string; title?: string }
export type AttendanceSummary = { present: number; absent: number; late: number; marked: number; attended: number; pct: number | null }
export type Attendance = {
  today: string
  month: { month: string; days: AttendanceDay[]; summary: AttendanceSummary; daysMarked: number; absentDays: number; halfDays: number }
  yearToDate: { from: string; summary: AttendanceSummary }
  trend: { month: string; summary: AttendanceSummary }[]
  upcomingHolidays: { title: string; event_date: string; end_date: string | null }[]
}

// NUMERIC columns arrive as strings from pg; use num() before doing maths.
export type FeeRow = {
  id: number; category_name: string; frequency: string; period_label: string
  amount_due: number | string; amount_paid: number | string; waiver_amount: number | string; balance: number | string
  due_date: string | null; status: 'pending' | 'paid' | 'partial' | 'overdue' | 'waived'
  source_academic_year: string | null // set when the bill was carried in from an earlier year
}
export type Payment = {
  id: number; receipt_number: string; amount: number | string; payment_mode: string
  payment_status: 'completed' | 'pending_verification' | 'rejected' | 'cancelled'; paid_date: string
  transaction_ref: string | null; rejection_reason: string | null; category_name: string; period_label: string
}
export type Waiver = { id: number; waiver_type: string; waiver_amount: number | string; reason: string; category_name: string; period_label: string }
// Unpaid bills from earlier years (or 'passout'): shown only, not in the totals, paid at the school office.
export type PriorDues = { total: number; items: { id: number; academic_year: string; category_name: string; period_label: string; balance: number | string }[] }
export type Fees = {
  ledger: FeeRow[]; payments: Payment[]; waivers: Waiver[]; prior_dues?: PriorDues
  summary: { total_due: number; total_paid: number; total_outstanding: number; carried_outstanding?: number; total_waived: number; overdue_count: number }
}
export type AcademicYear = { id: number; label: string; is_current: boolean }

export type Announcement = {
  id: number; title: string; content: string; announcement_type: string
  priority: 'urgent' | 'high' | 'normal' | string; created_by_name: string | null; created_at: string
}
export type CalendarEvent = { id: number; title: string; event_date: string; end_date: string | null; event_type: string; description: string | null }
export type SchoolCalendar = { events: CalendarEvent[]; weeklyOff: number[]; today: string; canEdit: boolean }
// /api/exams/calendar — class exams for the current calendar year; exam_date can be null for an undated exam.
export type CalendarExam = { id: number; exam_name: string; exam_type: string; exam_date: string | null; status: string; subjects: string[]; total_subjects: number }

export type SyllabusTopic = {
  id: number; topic_name: string; topic_order: number; status: 'covered' | 'pending' | string
  covered_date: string | null; covered_by_name: string | null
}
// class_semester_label is the per-CLASS Semester 1/2/... grouping from the teacher's Setup
// screen (not school_chapters' own shared `semester` column) — it drives the Semester tabs.
export type SyllabusChapter = {
  school_chapter_id: number; chapter_name: string; chapter_order: number
  class_semester_label: string | null; total: number; covered: number; topics: SyllabusTopic[]
}
export type SyllabusSubject = {
  subject: string; board: string | null; total: number; covered: number; completion_pct: number; chapters: SyllabusChapter[]
  setup_completed_at: string | null; semester_mode: boolean; semester_count: number | null
}
// completion_pct is chapter-weighted on the platform (each chapter an equal share), not covered/total.
export type Syllabus = { subjects: SyllabusSubject[] }
// /api/parent/subjects?student_id= — one child's class subjects with each subject's teacher.
export type ClassSubject = { subject_name: string; teacher_name: string | null }

// /api/school/library — parents only ever get 'textbook' rows for the child's grade.
export type LibraryItem = {
  material_id: number; subject_id: number | null; subject_name: string; grade: string
  material_type: 'textbook' | 'handbook'; title: string; file_url: string; created_at: string
}
export type Homework = {
  id: number; title: string; subject: string; task_type: string; max_marks: number; instructions: string | null
  due_date: string | null; due_time: string | null; created_at: string; teacher_name: string | null
  submission_status: string | null; submitted_at: string | null; score: number | null; feedback: string | null
  reviewed_at: string | null; resubmission_requested: boolean
}
export type Rewards = {
  total_points: number; points_this_month: number
  recent: { points: number; action_type: string; earned_at: string }[]
  badges: { badge_type: string; earned_at: string }[]
  streak: { current_streak: number; longest_streak: number; last_activity_date: string | null }
}
export type ActivityFeed = {
  sessions: number; seconds: number; last_seen: string | null; active_days: number
  sections: { nav_key: string; visits: number; last_visit: string }[]
  timeline: { kind: 'task_submit' | 'doubt' | 'login'; at: string; title: string | null; detail: string | null }[]
}
export type LeaveRequest = {
  id: number; from_date: string; to_date: string; reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewed_by_name: string | null; review_note: string | null; reviewed_at: string | null; created_at: string
}
export type Transport = {
  route: { id: number; name: string; vehicle_number: string | null; driver_name: string | null; driver_phone: string | null; attendant_name: string | null; attendant_phone: string | null } | null
  stop_id: number | null
  stops: { id: number; name: string; stop_order: number; pickup_time: string | null; drop_time: string | null }[]
}
export type Notification = { id: number; type: string; title: string | null; message: string | null; is_read: boolean; created_at: string }

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const cancel = () => controller.abort()
  if (init?.signal?.aborted) cancel()
  init?.signal?.addEventListener('abort', cancel)
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, 25_000)
  try {
    const res = await fetch(`${API_ORIGIN}${path}`, {
      credentials: 'include',
      ...init,
      signal: controller.signal,
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    })
    const data: unknown = await res.json().catch(error => {
      if (controller.signal.aborted) throw error
      return {}
    })
    if (!res.ok) {
      if (res.status === 401) clearRequestCache(false)
      // Keep the failing route in Android logs without query strings or login data.
      console.warn(`WLYL API: ${init?.method ?? 'GET'} ${path.split('?')[0]} failed (${res.status})`)
      const msg = (data as { error?: string }).error ?? `Request failed (${res.status})`
      throw new ApiError(res.status, msg)
    }
    if (init?.method && init.method.toUpperCase() !== 'GET') {
      clearRequestCache(path.startsWith('/api/parent/auth/'))
    }
    return data as T
  } catch (error) {
    if (timedOut) throw new Error('The server is taking too long. Please pull down to try again.')
    throw error
  } finally {
    clearTimeout(timer)
    init?.signal?.removeEventListener('abort', cancel)
  }
}

export const num = (v: number | string | null | undefined) => Number(v ?? 0)
export const inr = (v: number | string | null | undefined) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num(v))
export const day = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
export const longDay = (d: string) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
export const hhmm = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}
export const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('')
export const PAY_MODE: Record<string, string> = { cash: 'Cash', cheque: 'Cheque', dd: 'Demand draft', online: 'UPI (app)', upi: 'UPI' }
export const EXAM_TYPE: Record<string, string> ={ unit_test: 'Unit Test', mid_term: 'Mid Term', final_exam: 'Final Exam', practical: 'Practical' }
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const titleCase = (s: string) => s.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
