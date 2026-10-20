const assert = require('node:assert/strict')
const { test } = require('node:test')
const compile = require('./load-module.cjs')

test('Timeout covers the response body and surfaces a retry message', async () => {
  const api = compile('src/lib/api.ts', { './request-cache': { clearRequestCache() {} } }).api
  const originalFetch = global.fetch, originalTimer = global.setTimeout, originalClear = global.clearTimeout
  let timeout, cleared = false
  global.setTimeout = (fn, ms) => { assert.equal(ms, 25_000); timeout = fn; return 123 }
  global.clearTimeout = id => { assert.equal(id, 123); cleared = true }
  global.fetch = async (_url, options) => ({ ok: true, json: () => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')))
    timeout()
  }) })
  try {
    await assert.rejects(api('/test'), /server is taking too long/)
    assert.equal(cleared, true)
  } finally { global.fetch = originalFetch; global.setTimeout = originalTimer; global.clearTimeout = originalClear }
})
test('Writes invalidate screen data; account changes also reset the session generation', async () => {
  const cache = compile('src/lib/request-cache.ts')
  const api = compile('src/lib/api.ts', { './request-cache': cache }).api
  const originalFetch = global.fetch
  global.fetch = async () => ({ ok: true, json: async () => ({ success: true }) })
  try {
    const generation = cache.accountGeneration()
    await cache.loadCached('/books', async () => ['private'])
    await api('/api/parent/fees', { method: 'POST' })
    assert.equal(cache.cachedResult('/books'), null)
    assert.equal(cache.accountGeneration(), generation)
    await api('/api/parent/auth/login', { method: 'POST' })
    assert.equal(cache.accountGeneration(), generation + 1)
    await api('/api/parent/auth/me', { method: 'PUT' })
    assert.equal(cache.accountGeneration(), generation + 2)
    await api('/api/parent/auth/change-password', { method: 'POST' })
    assert.equal(cache.accountGeneration(), generation + 3)
  } finally { global.fetch = originalFetch }
})
