import { getTransformPlugin } from './plugins'
import type { TransformLanguage, TransformResult } from './engine'

export interface TransformExecution {
  pluginId: string
  source: string
  language: TransformLanguage
  config: string
  signal?: AbortSignal
}

export interface TransformChange {
  beforeStart: number
  beforeEnd: number
  afterStart: number
  afterEnd: number
  removed: string
  inserted: string
}

export interface TransformExecutionResult extends TransformResult {
  changes: TransformChange[]
  elapsedMs: number
}

/** Character-accurate change region, including edits that do not alter line counts. */
export function calculateChanges(
  before: string,
  after: string,
): TransformChange[] {
  if (before === after) return []
  let start = 0
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  )
    start++
  let beforeEnd = before.length
  let afterEnd = after.length
  while (
    beforeEnd > start &&
    afterEnd > start &&
    before[beforeEnd - 1] === after[afterEnd - 1]
  ) {
    beforeEnd--
    afterEnd--
  }
  return [
    {
      beforeStart: start,
      beforeEnd,
      afterStart: start,
      afterEnd,
      removed: before.slice(start, beforeEnd),
      inserted: after.slice(start, afterEnd),
    },
  ]
}

/** Runs only registered, trusted transforms. No eval or remote package execution. */
export async function executeTransform(
  request: TransformExecution,
): Promise<TransformExecutionResult> {
  if (request.signal?.aborted) throw new Error('Transform cancelled')
  const plugin = getTransformPlugin(request.pluginId)
  if (!plugin) throw new Error(`Unknown transform plugin: ${request.pluginId}`)
  if (!plugin.languages.includes(request.language))
    throw new Error(`Plugin does not support ${request.language}`)
  if (request.source.length > 2_000_000)
    throw new Error('Source exceeds the 2 MB transform limit')
  const started = performance.now()
  const result = await plugin.run(
    request.source,
    request.language,
    request.config,
  )
  if (request.signal?.aborted) throw new Error('Transform cancelled')
  if (typeof result.output !== 'string' || !Array.isArray(result.diagnostics))
    throw new Error('Invalid plugin output')
  return {
    ...result,
    changes: calculateChanges(request.source, result.output),
    elapsedMs: Math.round(performance.now() - started),
  }
}
