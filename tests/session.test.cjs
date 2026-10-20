const assert = require('node:assert/strict')
const { test } = require('node:test')
const compile = require('./load-module.cjs')
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const flush = () => new Promise(r => setImmediate(r))
function setup() {
  const cache = compile('src/lib/request-cache.ts')
  const classes = deferred(), year = deferred(), features = deferred()
  const me = { id: 1, school_id: 1, children: [{ id: 2, grade: '6', section: 'A', school_id: 1 }] }
  const calls = []
  const session = compile('src/stores/session.ts', {
    'zustand/middleware': { persist: init => init, createJSONStorage() {} },
    '@react-native-async-storage/async-storage': {},
    '@/lib/api': { ApiError: class ApiError extends Error {}, api: async path => {
      calls.push(path)
      if (path.endsWith('/auth/me')) return me
      if (path.startsWith('/api/classes')) return classes.promise
      if (path.startsWith('/api/academic-year')) return year.promise
      if (path.startsWith('/api/school/enabled-features')) return features.promise
    } },
    '@/lib/request-cache': cache, '@/lib/books': { clearBooks() {} }, '@/lib/push': { unregisterPush: async () => {} },
  }).useSession
  return { session, cache, calls, classes, year, features }
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
  assert.equal(s.calls.length, 4)
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
