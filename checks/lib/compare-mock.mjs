// Answers the List table's requests in a Playwright page with the committed
// snapshot rows (checks/targets/compare/list-rows.json): real List rows with
// the flag counts from the ledgers that gave each score. Used until the
// table's version 3 columns are live; after that the checks read the table.
import { readFileSync } from 'node:fs'

export async function routeList(page, file = new URL('../targets/compare/list-rows.json', import.meta.url)) {
  const rows = JSON.parse(readFileSync(file, 'utf8'))
  await page.route(/\/rest\/v1\/list_entries/, async (route) => {
    const url = new URL(route.request().url())
    const select = url.searchParams.get('select') || '*'
    const cols = select === '*' ? null : select.split(',')
    const pickCols = (r) => (cols ? Object.fromEntries(cols.map((c) => [c, r[c] ?? null])) : { ...r, doc_hash: '0'.repeat(64), created_at: '2026-11-09T00:00:00Z', industry: 'Professional services and consulting' })
    let list = rows
    const limit = Number(url.searchParams.get('limit') || 0)
    const range = route.request().headers().range
    let start = 0, end = list.length - 1
    if (range) { const m = /(\d+)-(\d+)/.exec(range); start = Number(m[1]); end = Math.min(Number(m[2]), list.length - 1) }
    if (limit) end = Math.min(end, start + limit - 1)
    const body = list.slice(start, end + 1).map(pickCols)
    await route.fulfill({
      status: range ? 206 : 200,
      contentType: 'application/json',
      headers: { 'content-range': `${start}-${start + body.length - 1}/${list.length}`, 'access-control-expose-headers': 'content-range' },
      body: JSON.stringify(body),
    })
  })
}
