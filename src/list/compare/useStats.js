import { useEffect, useRef, useState } from 'react'
import { planTasks, assemble } from './stats.js'

// Runs a comparison's statistics in a pool of Web Workers, off the page's
// thread, and assembles the rows. The largest real selection takes seconds of
// work (docs/compare.md), so the page says "Working it out…" while it runs.
// Each task carries its own seeded stream, so the result is the same however
// many workers run. A new input cancels the old run.
export function useStats(input) {
  const [state, setState] = useState({ status: 'idle', result: null, key: null })
  const run = useRef(0)
  const key = input ? input.seedKey : null

  useEffect(() => {
    if (!input) { setState({ status: 'idle', result: null, key: null }); return undefined }
    const id = ++run.current
    const tasks = planTasks(input)
    const results = new Array(tasks.length)
    const size = Math.max(1, Math.min(8, (globalThis.navigator?.hardwareConcurrency || 4) - 1, tasks.length))
    const workers = []
    let next = 0
    let done = 0
    let stopped = false
    setState({ status: 'working', result: null, key })
    const stop = () => { stopped = true; for (const w of workers) w.terminate() }
    const finish = () => {
      stop()
      if (id !== run.current) return
      try {
        setState({ status: 'done', result: assemble(input, tasks, results), key })
      } catch (e) {
        setState({ status: 'failed', result: null, key, error: String(e) })
      }
    }
    if (!tasks.length) { finish(); return stop }
    for (let k = 0; k < size; k++) {
      const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
      workers.push(w)
      const give = () => {
        if (stopped || next >= tasks.length) return
        const i = next++
        w.postMessage({ i, seedKey: input.seedKey, task: tasks[i] })
      }
      w.onmessage = ({ data }) => {
        if (stopped) return
        results[data.i] = data.result
        done++
        if (done === tasks.length) finish()
        else give()
      }
      w.onerror = (e) => { if (!stopped) { stop(); setState({ status: 'failed', result: null, key, error: e.message }) } }
      give()
    }
    return stop
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return state.key === key ? state : { status: input ? 'working' : 'idle', result: null, key }
}
