// One of the compare tool's workers: runs tasks from stats.js planTasks and
// posts each result back. Results are the same whichever worker runs a task.
import { runTask } from './stats.js'

self.onmessage = ({ data: { i, seedKey, task } }) => {
  const result = runTask(seedKey, task)
  const transfer = result instanceof Float64Array ? [result.buffer] : []
  self.postMessage({ i, result }, transfer)
}
