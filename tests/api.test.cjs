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
test('Error codes reach ApiError and the listener; access_revoked carries the message; usage pings keep the cache', async () => {
  const cache = compile('src/lib/request-cache.ts')
  const mod = compile('src/lib/api.ts', { './request-cache': cache })
  const seen = []
  mod.onApiError(e => seen.push(e.code))
  const originalFetch = global.fetch, originalWarn = console.warn
  console.warn = () => {}
  const reply = (status, body) => { global.fetch = async () => ({ ok: status < 400, status, json: async () => body }) }
  try {
    reply(403, { error: 'Paused', code: 'PLAN_EXPIRED' })
    await assert.rejects(mod.api('/api/parent/fees'), e => e instanceof mod.ApiError && e.code === 'PLAN_EXPIRED' && e.message === 'Paused')
    reply(401, { error: 'access_revoked', message: 'Portal disabled' })
    await assert.rejects(mod.api('/api/parent/auth/me'), e => e.code === 'access_revoked' && e.message === 'Portal disabled')
    reply(401, { error: 'Invalid credentials' })
    await assert.rejects(mod.api('/api/parent/auth/login', { method: 'POST' }), e => e.code === undefined)
    assert.deepEqual(seen, ['PLAN_EXPIRED', 'access_revoked'])
    await cache.loadCached('/books', async () => ['kept'])
    reply(200, { success: true })
    await mod.api('/api/usage/heartbeat', { method: 'POST', body: '{}' })
    assert.deepEqual(cache.cachedResult('/books'), { data: ['kept'] })
  } finally { global.fetch = originalFetch; console.warn = originalWarn }
})
