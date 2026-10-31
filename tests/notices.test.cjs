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
test('Only unseen urgent, action-needed or greeting notices pop up', () => {
  assert.equal(notices.needsPopup(notice(1, { seen: false, priority: 'urgent' })), true)
  assert.equal(notices.needsPopup(notice(2, { seen: false, requires_ack: true })), true)
  assert.equal(notices.needsPopup(notice(3, { seen: false, template_key: 'diwali' })), true)
  assert.equal(notices.needsPopup(notice(4, { seen: false, template_key: 'ptm' })), false)
  assert.equal(notices.needsPopup(notice(5, { seen: true, priority: 'urgent' })), false)
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
