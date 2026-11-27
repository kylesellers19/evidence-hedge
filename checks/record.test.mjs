// The Record's public file (public/record/record.json) and its reader (src/record/model.js).
// Holds the contract the page relies on and the privacy rules the session spec sets:
// organizations are anonymous until every input passes its gate, no firm name, title,
// URL or document text appears, and every value says how it was made.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fmt, fmtInterval, sentence, markDomain, labelled, nearest, defaultOrg, isShown } from '../src/record/model.js'

const data = JSON.parse(readFileSync(new URL('../public/record/record.json', import.meta.url), 'utf8'))
// SHA-256 of every corpus firm name, alias and report title, normalized (record.export writes it):
// the check can find a name without the repo holding a list of the map's firms.
const banned = new Set(JSON.parse(readFileSync(new URL('./record-name-hashes.json', import.meta.url), 'utf8')).hashes)
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim()
const sha = (s) => createHash('sha256').update(s).digest('hex')
const GATES = new Set(['passed', 'provisional', 'pending', 'too_few'])
const CELL = ['value', 'lo', 'hi', 'k', 'n', 'basis', 'model', 'model_version', 'gate', 'reason', 'engine_version', 'map_build_hash', 'window']

function strings(v, path = '', out = []) {
  if (typeof v === 'string') out.push([path, v])
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${path}[${i}]`, out))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) strings(x, path ? `${path}.${k}` : k, out)
  return out
}

test('schema and build identity', () => {
  assert.equal(data.schema, 'eh-record/0.1')
  assert(data.questions.length >= 1)
  for (const q of data.questions) {
    assert(q.question && q.question.length < 140)
    assert.match(q.build.map_build_hash, /^[0-9a-f]{12}$/)
    assert.match(q.build.engine_version, /^[0-9a-f]{7}$/)
    assert.equal(q.build.window.length, 2)
    assert(q.measures.length >= 9)
    assert(q.figure.x && q.figure.y)
  }
})

test('every value says what it is, how it was made and whether it passed', () => {
  for (const q of data.questions) {
    const keys = q.measures.map((m) => m.key)
    for (const o of q.organizations) {
      for (const k of keys) {
        const c = o.values[k]
        assert(c, `${o.id} ${k}`)
        for (const f of CELL) assert(Object.hasOwn(c, f), `${o.id} ${k} ${f}`)
        assert(GATES.has(c.gate), c.gate)
        assert.equal(c.map_build_hash, q.build.map_build_hash)
        if (c.value !== null) {
          assert(c.gate === 'passed' || c.gate === 'provisional', `${o.id} ${k} has a value under gate ${c.gate}`)
          if (c.lo !== null) assert(c.lo <= c.value + 1e-9 && c.value <= c.hi + 1e-9, `${o.id} ${k} interval`)
        }
        if (c.gate !== 'passed' && c.gate !== 'provisional') assert(c.reason, `${o.id} ${k} needs a reason`)
      }
    }
  }
})

test('organizations stay anonymous until every input passes', () => {
  for (const q of data.questions) {
    const allPassed = q.organizations.every((o) => Object.values(o.values).every((c) => c.gate === 'passed'))
    if (!allPassed) {
      assert.equal(data.provisional, true)
      assert.equal(data.naming, 'anonymous')
    }
    for (const o of q.organizations) {
      assert.match(o.label, /^Organization \d+$/)
      assert.match(o.id, /^o\d+$/)
      assert.equal(o.id, `o${o.n}`)
    }
    // Label order says nothing about size.
    const sizes = [...q.organizations].sort((a, b) => a.n - b.n).map((o) => o.documents)
    const sorted = [...sizes].sort((a, b) => b - a)
    assert.notDeepEqual(sizes, sorted, 'labels are numbered by size')
  }
})

test('no firm name, title, address or document text anywhere in the file', () => {
  for (const [path, s] of strings(data)) {
    assert(!/https?:\/\/|www\./i.test(s), `address at ${path}`)
    const w = norm(s).split(' ').filter(Boolean)
    for (let i = 0; i < w.length; i++) {
      for (let n = 1; n <= 30 && i + n <= w.length; n++) {
        assert(!banned.has(sha(w.slice(i, i + n).join(' '))), `a firm name or title at ${path}: "${w.slice(i, i + n).join(' ')}"`)
      }
    }
  }
  for (const q of data.questions) {
    for (const [path, s] of strings({ o: q.organizations, c: q.claims, f: q.first_claims, g: q.open_ground })) {
      // Data fields hold labels, counts and short phrases: never a sentence from a document.
      assert(s.split(/\s+/).length <= 40, `long text at ${path}`)
    }
  }
})

test('the reader formats and words the page from the data', () => {
  assert.equal(fmt(0.1234, 'share'), '12%')
  assert.equal(fmt(0.0412, 'share'), '4.1%')
  assert.equal(fmt(-2.44, 'points'), '−2.4')
  assert.equal(fmt(3.2, 'points'), '+3.2')
  assert.equal(fmt(null, 'share'), '—')
  assert.equal(fmtInterval({ lo: 0.01, hi: 0.2 }, 'share'), '1.0% to 20%')
  const q = data.questions[0]
  const o = defaultOrg(q)
  const s = sentence(q, o)
  assert(s.startsWith(`${o.label} published ${o.window_documents} of the`))
  assert(s.endsWith('.'))
  assert(!/undefined|NaN|null/.test(s))
  for (const m of q.measures) {
    const [lo, hi] = markDomain(q, m.key, m.unit)
    assert(Number.isFinite(lo) && Number.isFinite(hi) && hi > lo, m.key)
  }
  const pts = [{ id: 'a', x: 0.1, y: 0.2, sx: 10, sy: 10 }, { id: 'b', x: 0.3, y: 0.1, sx: 50, sy: 40 }]
  assert(labelled(pts, 'a').has('b'))
  assert.equal(nearest(pts, 48, 38).id, 'b')
  assert.equal(nearest(pts, 300, 300), null)
  assert.equal(isShown({ gate: 'pending', value: null }), false)
})
