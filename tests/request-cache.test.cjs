const assert = require('node:assert/strict')
const { test } = require('node:test')
const compile = require('./load-module.cjs')
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

test('Concurrent requests share one call, fresh results reuse it, refresh bypasses and expiry reloads', async () => {
  const c = compile('src/lib/request-cache.ts')
  let calls = 0
  const load = async () => ++calls
  assert.deepEqual(await Promise.all([c.loadCached('/books', load), c.loadCached('/books', load)]), [1, 1])
  assert.equal(await c.loadCached('/books', load), 1)
  assert.equal(await c.loadCached('/books', load, true), 2)
  const now = Date.now
  Date.now = () => now() + 31_000
  try { assert.equal(await c.loadCached('/books', load), 3) } finally { Date.now = now }
})
test('A failed call is retried; old-account responses cannot populate the next account cache', async () => {
  const c = compile('src/lib/request-cache.ts')
  await assert.rejects(c.loadCached('/books', async () => { throw new Error('offline') }), /offline/)
  const old = deferred()
  const before = c.loadCached('/books', () => old.promise)
  c.clearRequestCache()
  const next = deferred()
  const after = c.loadCached('/books', () => next.promise)
  old.resolve('old account')
  await assert.rejects(before, c.CacheResetError)
  assert.equal(c.cachedResult('/books'), null)
  assert.equal(c.loadCached('/books', () => Promise.resolve('wrong')), after)
  next.resolve('new account')
  assert.equal(await after, 'new account')
  assert.deepEqual(c.cachedResult('/books'), { data: 'new account' })
})
