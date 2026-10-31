const assert = require('node:assert/strict')
const { test } = require('node:test')
const compile = require('./load-module.cjs')
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const flush = () => new Promise(r => setImmediate(r))
function setup() {
  const cache = compile('src/lib/request-cache.ts')
  const classes = deferred(), year = deferred(), features = deferred()
  const me = { id: 1, school_id: 1, children: [{ id: 2, grade: '6', section: 'A', school_id: 1 }] }
  const calls = [], bodies = {}
  let onError = null
  const session = compile('src/stores/session.ts', {
    'zustand/middleware': { persist: init => init, createJSONStorage() {} },
    '@react-native-async-storage/async-storage': {},
    '@/lib/api': { ApiError: class ApiError extends Error {}, onApiError: fn => { onError = fn }, api: async (path, init) => {
      calls.push(path)
      if (init?.body) bodies[path] = JSON.parse(init.body)
      if (path.endsWith('/auth/me')) return me
      if (path.startsWith('/api/classes')) return classes.promise
      if (path.startsWith('/api/academic-year')) return year.promise
      if (path.startsWith('/api/school/enabled-features')) return features.promise
    } },
    '@/lib/request-cache': cache, '@/lib/books': { clearBooks() {} }, '@/lib/push': { unregisterPush: async () => {} },
  })
  return { session: session.useSession, navKeyFor: session.navKeyFor, onError, cache, calls, bodies, classes, year, features }
}
test('Account renders before school metadata, concurrent shell load deduplicates, class resolution preserves selected child', async () => {
  const s = setup()
  const first = s.session.getState().load()
  assert.equal(s.session.getState().load(), first)
  await flush()
  assert.equal(s.session.getState().loading, false)
  assert.equal(s.session.getState().student.id, 2)
  assert.equal(s.session.getState().student.class_id, 0)
  s.classes.resolve([{ id: 9, grade: '6', section: 'A' }])
  await flush()
  assert.equal(s.session.getState().student.class_id, 9)
  s.year.resolve({ label: '2027-28' }); s.features.resolve({ enabled: ['library'] })
  await first
  await s.session.getState().load()
  assert.equal(s.calls.length, 5) // me, classes, year, features, plan status
  assert.equal(s.session.getState().year, '2027-28')
})
test('Logging out while metadata is pending cannot restore the previous account or features', async () => {
  const s = setup()
  const load = s.session.getState().load()
  await flush()
  await s.session.getState().logout()
  s.classes.resolve([{ id: 9, grade: '6', section: 'A' }])
  s.year.resolve({ label: '2027-28' }); s.features.resolve({ enabled: ['library'] })
  await load
  assert.equal(s.session.getState().student, null)
  assert.equal(s.session.getState().me, null)
  assert.equal(s.session.getState().features, null)
  assert.equal(s.session.getState().unauthorized, true)
})
test('A non-auth mutation does not discard pending class metadata', async () => {
  const s = setup()
  const load = s.session.getState().load()
  await flush()
  s.cache.clearRequestCache(false)
  s.classes.resolve([{ id: 9, grade: '6', section: 'A' }])
  s.year.resolve({ label: '2027-28' }); s.features.resolve({ enabled: ['library'] })
  await load
  assert.equal(s.session.getState().student.class_id, 9)
})
test('A missing class produces a recoverable error instead of sending requests for class zero', async () => {
  const s = setup()
  const load = s.session.getState().load()
  s.classes.resolve([]); s.year.resolve({ label: '2027-28' }); s.features.resolve({ enabled: ['library'] })
  await load
  assert.match(s.session.getState().classError, /class could not be found/)
  assert.equal(s.session.getState().student.class_id, 0)
})
test('Routes map to the platform usage nav keys; unknown pages are not tracked', () => {
  const { navKeyFor } = setup()
  assert.equal(navKeyFor('/'), 'overview')
  assert.equal(navKeyFor('/exams'), 'exams')
  assert.equal(navKeyFor('/exam/12'), 'results')
  assert.equal(navKeyFor('/book/3'), 'library')
  assert.equal(navKeyFor('/more'), null)
})
test('Usage: consecutive sections are de-duplicated and logout closes the usage session', async () => {
  const s = setup()
  s.session.getState().setUsageSessionId(77)
  const load = s.session.getState().load()
  s.classes.resolve([]); s.year.resolve({ label: '2027-28' }); s.features.resolve({ enabled: [] })
  await load
  for (const key of ['fees', 'fees', 'overview', 'fees']) s.session.getState().track(key)
  await flush()
  assert.equal(s.calls.filter(p => p === '/api/usage/track').length, 3)
  s.session.getState().heartbeat()
  assert.deepEqual(s.bodies['/api/usage/heartbeat'], { usageSessionId: 77 })
  await s.session.getState().logout()
  assert.deepEqual(s.bodies['/api/parent/auth/logout'], { usageSessionId: 77 })
  assert.equal(s.session.getState().usageSessionId, null)
})
test('Access revoked signs out with the school message; plan expired locks only a signed-in parent', async () => {
  const s = setup()
  s.onError({ status: 403, code: 'PLAN_EXPIRED', message: 'paused' })
  assert.equal(s.session.getState().locked, false)
  const load = s.session.getState().load()
  await flush()
  s.onError({ status: 403, code: 'PLAN_EXPIRED', message: 'paused' })
  assert.equal(s.session.getState().locked, true)
  s.onError({ status: 401, code: 'access_revoked', message: 'Portal disabled' })
  assert.equal(s.session.getState().unauthorized, true)
  assert.equal(s.session.getState().notice, 'Portal disabled')
  assert.equal(s.session.getState().locked, false)
  assert.equal(s.session.getState().me, null)
  s.classes.resolve([]); s.year.resolve({ label: '2027-28' }); s.features.resolve({ enabled: [] })
  await load
})
