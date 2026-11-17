const assert = require('node:assert/strict')
const { test } = require('node:test')
const compile = require('./load-module.cjs')

const cache = compile('src/lib/request-cache.ts')
const api = compile('src/lib/api.ts', { './request-cache': cache })
const notices = compile('src/lib/notices.ts', { '@/lib/api': api, '@/lib/request-cache': cache })
const notice = (id, extra = {}) => ({ id, title: `Notice ${id}`, content: 'Body', priority: 'normal', pinned: false, requires_ack: false,
  template_key: null, translations: null, seen: true, acked: false, ...extra })

test('Call links keep only digits and a leading plus', () => {
  assert.equal(api.telHref(' +91 98480-22 (office)'), 'tel:+919848022')
  assert.equal(api.telHref('040 2345+678'), 'tel:0402345678')
})
test('Notices show the school translation for the app language, else the original', () => {
  const n = notice(1, { translations: { te: { title: 'తెలుగు', content: ' ' } } })
  assert.deepEqual(notices.localised(n, 'te'), { title: 'తెలుగు', content: 'Body' })
  assert.deepEqual(notices.localised(n, 'en'), { title: 'Notice 1', content: 'Body' })
})
test('Every new notice from the last 14 days pops up, at most 3 (web #482)', () => {
  const now = Date.parse('2026-11-17T10:00:00Z')
  const at = days => new Date(now - days * 86_400_000).toISOString()
  assert.equal(notices.needsPopup(notice(1, { seen: false, created_at: at(1) }), now), true)
  assert.equal(notices.needsPopup(notice(2, { seen: false, created_at: at(30), published_at: at(2) }), now), true)
  assert.equal(notices.needsPopup(notice(3, { seen: false, created_at: at(15) }), now), false)
  assert.equal(notices.needsPopup(notice(4, { seen: true, created_at: at(0) }), now), false)
  const list = [1, 2, 3, 4, 5].map(id => notice(id, { seen: id === 2, created_at: at(id) }))
  assert.deepEqual(notices.pickPopupNotices(list, now).map(n => n.id), [1, 3, 4])
})
test('Filters and search narrow the list', () => {
  const list = [notice(1, { seen: false }), notice(2, { pinned: true }), notice(3, { requires_ack: true }), notice(4, { requires_ack: true, acked: true, title: 'Sports Day' })]
  const ids = (f, q = '') => notices.filterNotices(list, f, q, 'en').map(n => n.id)
  assert.deepEqual(ids('all'), [1, 2, 3, 4])
  assert.deepEqual(ids('unread'), [1])
  assert.deepEqual(ids('pinned'), [2])
  assert.deepEqual(ids('action'), [3])
  assert.deepEqual(ids('all', 'sports'), [4])
})
test('Marks made this session apply until another account signs in', () => {
  const original = global.fetch
  global.fetch = async () => ({ ok: true, json: async () => ({ ok: true }) })
  try {
    notices.markSeen(notice(7, { seen: false }))
    assert.equal(notices.withMarks([notice(7, { seen: false })], notices.useNoticeMarks.getState())[0].seen, true)
    cache.clearRequestCache()
    assert.equal(notices.withMarks([notice(7, { seen: false })], notices.useNoticeMarks.getState())[0].seen, false)
  } finally { global.fetch = original }
})
