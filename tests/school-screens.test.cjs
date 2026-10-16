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
const student = { id: 1, school_id: 1, class_id: 1 }
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
function Primitive({ children, title }) {
  return React.createElement('div', null, title, children)
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
const api = compile('src/lib/api.ts')
function render(screen, data = responses) {
  const Component = compile(screen, {
    'react-native': primitives, 'lucide-react-native': primitives,
    'expo-router': { Stack: { Screen: Primitive }, useRouter: () => ({ push() {} }) },
    '@/components/ui': primitives, '@/components/quick-links': { QuickLinks: Primitive },
    '@/stores/session': { useSession: () => ({ student, year: null, has: f => f !== 'timetable' }) },
    '@/lib/api': api,
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
