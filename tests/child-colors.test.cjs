const assert = require('node:assert/strict')
const { test } = require('node:test')
const compile = require('./load-module.cjs')

const { CHILD_COLORS, childColor } = compile('src/lib/child-colors.ts')
const kids = [{ id: 7 }, { id: 3 }, { id: 9 }]

test('Each child gets the colour at their position in the list', () => {
  assert.equal(childColor(kids, 7), CHILD_COLORS[0])
  assert.equal(childColor(kids, 3), CHILD_COLORS[1])
  assert.equal(childColor(kids, 9), CHILD_COLORS[2])
})
test('Unknown or missing child falls back to teal', () => {
  assert.equal(childColor(kids, 42), '#0d7d76')
  assert.equal(childColor([], null), '#0d7d76')
})
test('Colours wrap around after the palette runs out', () => {
  const many = Array.from({ length: CHILD_COLORS.length + 1 }, (_, i) => ({ id: i }))
  assert.equal(childColor(many, CHILD_COLORS.length), CHILD_COLORS[0])
})
