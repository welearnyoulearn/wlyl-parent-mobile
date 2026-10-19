const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const babel = require('@babel/core')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

// Exercise the actual screen render functions with the deployed API contracts.
// Native presentation primitives are replaced; screen hooks and data selection run.
const root = path.resolve(__dirname, '..')
const student = { id: 1, school_id: 1, class_id: 1, grade: '6', name: 'Test child' }
const month = new Date().toISOString().slice(0, 7)
const date = `${month}-01`
const summary = { present: 5, late: 1, absent: 2, marked: 8, attended: 6, pct: 75 }
const attendance = {
  today: new Date().toISOString().slice(0, 10),
  month: { month, daysMarked: 4, absentDays: 1, halfDays: 1, summary,
    days: [{ date, status: 'half', morning: 'present', afternoon: 'absent' }] },
  yearToDate: { from: `${month.slice(0, 4)}-04-01`, summary },
  trend: [{ month, summary }], upcomingHolidays: [],
}
const calendar = { weeklyOff: [0], today: date, canEdit: false, events: [
  { id: 1, title: 'School meeting', event_date: '2099-12-01', end_date: null, event_type: 'meeting', description: null },
] }
const responses = {
  '/api/parent/child-summary': { upcoming_exams: [], released_results: [], unacknowledged_count: 0, attendance_pct: 75 },
  '/api/parent/fees': { summary: { total_outstanding: 0, overdue_count: 0 } },
  '/api/parent/attendance': attendance,
  '/api/announcements': [], '/api/school-calendar': calendar, '/api/exams/calendar': [],
}
function Primitive({ children, title, hint }) {
  return React.createElement('div', null, title, hint, children)
}
const primitives = new Proxy({}, { get: () => Primitive })
function compile(relative, overrides = {}) {
  const filename = path.join(root, relative)
  const source = process.env.SCREEN_TEST_REF
    ? require('node:child_process').execFileSync('git', ['show', `${process.env.SCREEN_TEST_REF}:${relative}`], { cwd: root, encoding: 'utf8' })
    : fs.readFileSync(filename, 'utf8')
  const { code } = babel.transformSync(source, {
    filename, configFile: false, babelrc: false,
    presets: [['@babel/preset-typescript', { allExtensions: true, isTSX: relative.endsWith('.tsx') }]],
    plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'],
  })
  const mod = new Module(filename, module)
  mod.filename = filename
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  mod.require = name => Object.hasOwn(overrides, name) ? overrides[name] : require(name)
  mod._compile(code, filename)
  return mod.exports
}
const api = compile('src/lib/api.ts', { './request-cache': compile('src/lib/request-cache.ts') })
const t = compile('src/lib/i18n.ts', { '@/stores/session': { useSession: () => ({}) } }).TRANSLATIONS.en
function render(screen, data = responses, has = f => f !== 'timetable') {
  const monthCalendar = compile('src/components/month-calendar.tsx', { 'react-native': primitives, 'lucide-react-native': primitives, '@/components/ui': primitives, '@/lib/i18n': { useT: () => t } })
  const Component = compile(screen, {
    '@/components/month-calendar': monthCalendar,
    'react-native': primitives, 'lucide-react-native': primitives,
    'expo-router': { Stack: { Screen: Primitive }, useRouter: () => ({ push() {} }), useFocusEffect() {} },
    '@/components/ui': primitives, '@/components/class-loading': { ClassLoading: Primitive }, '@/components/quick-links': { QuickLinks: Primitive },
    '@/stores/session': { useSession: () => ({ student, year: null, has }) },
    '@/components/pay-sheet': { PaySheet: Primitive }, '@/lib/receipt': { receiptHtml() {}, shareReceipt() {} },
    '@/lib/api': api, '@/lib/books': { isDownloaded: () => false }, '@/lib/i18n': { useT: () => t },
    '@/lib/use-api': { useApi: url => ({ data: url ? data[url.split('?')[0]] : null, error: null, loading: false, refreshing: false, refresh() {} }) },
  }).default
  return renderToStaticMarkup(React.createElement(Component))
}
test('Home renders the calendar envelope returned by dev without calling filter on an object', () => {
  assert.match(render('src/app/(tabs)/index.tsx'), /School meeting/)
})
test('Calendar renders the same event envelope without calling map on an object', () => {
  assert.match(render('src/app/calendar.tsx'), /School meeting/)
})
test('Attendance renders session totals, current month and half days from the new contract', () => {
  const html = render('src/app/(tabs)/attendance.tsx')
  assert.match(html, /8 marked sessions/)
  assert.match(html, /6\/8 sessions/)
  assert.match(html, /75%/)
  assert.match(html, /Half day/)
  assert.doesNotMatch(html, /Last 3 months|school days/)
})
test('A month with no marked sessions renders an empty state and no false percentage', () => {
  const empty = { ...attendance, month: { ...attendance.month, days: [], summary: { ...summary, marked: 0, pct: null } } }
  const html = render('src/app/(tabs)/attendance.tsx', { ...responses, '/api/parent/attendance': empty })
  assert.match(html, /No attendance marked yet/)
  assert.doesNotMatch(html, /NaN|0%/)
})

test('Library empty state identifies the child grade instead of implying the entire library is empty', () => {
  const html = render('src/app/library.tsx', { '/api/school/library': [] })
  assert.match(html, /No textbooks for Grade 6/)
  assert.match(html, /school has not assigned textbooks for this grade/)
})
test('Library renders assigned textbooks', () => {
  const html = render('src/app/library.tsx', { '/api/school/library': [{ material_id: 1, grade: '6', subject_name: 'Mathematics', material_type: 'textbook', title: 'Grade 6 Mathematics', created_at: '2026-01-01' }] })
  assert.match(html, /Grade 6 Mathematics/)
  assert.doesNotMatch(html, /No textbooks/)
})

const bill = { id: 7, category_name: 'Tuition', frequency: 'monthly', period_label: 'Oct', amount_due: '5000', amount_paid: '2000', waiver_amount: '0', balance: '3000', due_date: '2026-10-10', status: 'pending', source_academic_year: '2024-25' }
const fees = {
  ledger: [bill], payments: [], waivers: [],
  prior_dues: { total: 1200, items: [{ id: 1, academic_year: '2023-24', category_name: 'Bus', period_label: 'Mar', balance: '1200' }] },
  summary: { total_due: 5000, total_paid: 2000, total_outstanding: 3000, carried_outstanding: 3000, total_waived: 0, overdue_count: 0 },
}
test('Fees shows earlier-year dues, carried bills and per-bill Pay when online payments are on', () => {
  const html = render('src/app/(tabs)/fees.tsx', { '/api/parent/fees': fees, '/api/academic-years': [] })
  assert.match(html, /₹1,200 from earlier years is still unpaid/)
  assert.match(html, /2023-24: ₹1,200/)
  assert.match(html, /carried from 2024-25/)
  assert.match(html, /incl\. ₹3,000 carried from an earlier year/)
  assert.match(html, />Pay</)
  assert.doesNotMatch(html, /Online payment isn't available/)
})
test('Fees hides every Pay control and shows the office note when online payments are off', () => {
  const html = render('src/app/(tabs)/fees.tsx', { '/api/parent/fees': fees, '/api/academic-years': [] }, f => f !== 'online-payments')
  assert.match(html, /Online payment isn&#x27;t available for this school yet/)
  assert.doesNotMatch(html, />Pay<|by UPI/)
})

const receipt = compile('src/lib/receipt.ts', { 'expo-print': {}, 'expo-sharing': {}, './api': api })
const pay = (id, ledger, amount, status = 'completed') => ({ id, receipt_number: 'RCP-001-2026-000012', amount, payment_mode: 'online', payment_status: status, paid_date: '2026-10-12', transaction_ref: '4278<b>', rejection_reason: null, category_name: ledger, period_label: 'Oct' })
test('Receipt combines every confirmed allocation under one receipt number and escapes stored text', () => {
  const payments = [pay(1, 'Tuition', '600'), pay(2, 'Bus', '400'), pay(3, 'Lab', '50', 'rejected')]
  const html = receipt.receiptHtml(payments[0], payments, { school: 'Sunrise School', student: 'Test child', className: '6-A' }, t)
  assert.match(html, /Sunrise School/)
  assert.match(html, /RCP-001-2026-000012/)
  assert.match(html, /Covers 2 bills paid together/)
  assert.match(html, /Total Paid:<\/td><td>₹1,000/)
  assert.doesNotMatch(html, /Lab/)
  assert.match(html, /4278&lt;b&gt;/)
  assert.match(html, /6-A/)
})
