import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeRedirect } from '../lib/auth-redirect.js'

test('authentication redirects retain internal destinations', () => {
  assert.equal(safeRedirect('/join/group-123'), '/join/group-123')
  assert.equal(safeRedirect('/dashboard?view=groups'), '/dashboard?view=groups')
})

test('authentication redirects reject executable, external and disguised URLs', () => {
  for (const value of [null, '', 'javascript:alert(1)', 'https://example.com', '//example.com', '/\\example.com', '/%2fexample.com', '/%5cexample.com', '/%0aexample.com', '/%zz']) {
    assert.equal(safeRedirect(value), '/dashboard', String(value))
  }
})
