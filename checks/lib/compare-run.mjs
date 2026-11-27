// Runs selections through the compare tool's statistics, as the page's
// workers do, on the committed snapshot of The List (checks/targets/compare/).
// The tasks are spread over worker threads; each task has its own seeded
// stream, so the numbers are the same however many threads run them.
import { readFileSync } from 'node:fs'
import { Worker, isMainThread, parentPort } from 'node:worker_threads'
import { availableParallelism } from 'node:os'
import { fromRow } from '../../src/list/entry.js'
import { poolOf, buildOf, typesOffered, selectionData, MEASURES } from '../../src/list/compare/data.js'
import { planTasks, runTask, assemble } from '../../src/list/compare/stats.js'

export const SNAPSHOT = new URL('../targets/compare/list-rows.json', import.meta.url)
export const loadRows = (file = SNAPSHOT) => JSON.parse(readFileSync(file, 'utf8')).map(fromRow)

// A selection with every type any of its firms has, when types is 'all'.
export function withTypes(rows, sel) {
  if (sel.types !== 'all') return sel
  const pool = poolOf(rows, sel)
  const build = buildOf(pool, sel.firm)
  return { ...sel, types: typesOffered(pool, build, [sel.firm, ...sel.vs]).map((t) => t.type) }
}

export function inputOf(rows, sel) {
  const full = withTypes(rows, sel)
  const data = selectionData(rows, full)
  return { sel: full, data, input: { seedKey: data.seedKey, firms: data.firms, measures: MEASURES, context: data.context } }
}

// Runs the tasks on threads (threads = 1 runs them here).
export async function runSelection(rows, sel, { threads = Math.max(1, availableParallelism() - 1) } = {}) {
  const { sel: full, data, input } = inputOf(rows, sel)
  const tasks = planTasks(input)
  const t0 = performance.now()
  let results
  if (threads <= 1) results = tasks.map((t) => runTask(input.seedKey, t))
  else {
    results = new Array(tasks.length)
    let next = 0
    await Promise.all(Array.from({ length: Math.min(threads, tasks.length) }, () => new Promise((resolve, reject) => {
      const w = new Worker(new URL(import.meta.url))
      const give = () => { if (next >= tasks.length) { w.terminate(); resolve(); return } const i = next++; w.postMessage({ i, seedKey: input.seedKey, task: tasks[i] }) }
      w.on('message', ({ i, result }) => { results[i] = result; give() })
      w.on('error', reject)
      give()
    })))
  }
  const out = assemble(input, tasks, results)
  return { sel: full, data, input, ...out, ms: performance.now() - t0, tasks: tasks.length }
}

if (!isMainThread) parentPort.on('message', ({ i, seedKey, task }) => parentPort.postMessage({ i, result: runTask(seedKey, task) }))
