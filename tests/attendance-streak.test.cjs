const assert = require('node:assert/strict')
const { test } = require('node:test')
const compile = require('./load-module.cjs')

const { attendanceStreak } = compile('src/lib/api.ts', { './request-cache': { clearRequestCache() {} } })
const days = statuses => statuses.map((status, i) => ({ date: `2026-10-${String(i + 1).padStart(2, '0')}`, status, morning: null, afternoon: null }))

test('Streak counts back from the latest marked day while it is present, skipping non-school days', () => {
  assert.equal(attendanceStreak(days(['absent', 'present', 'weekly_off', 'present', 'holiday', 'present', 'not_marked', 'future'])), 3)
})
test('A late, half or absent day ends the streak', () => {
  assert.equal(attendanceStreak(days(['present', 'present', 'late', 'present'])), 1)
  assert.equal(attendanceStreak(days(['present', 'half'])), 0)
  assert.equal(attendanceStreak(days(['present', 'absent'])), 0)
})
test('No marked days means no streak', () => {
  assert.equal(attendanceStreak(days(['weekly_off', 'future'])), 0)
  assert.equal(attendanceStreak([]), 0)
})
