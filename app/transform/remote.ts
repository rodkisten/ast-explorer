import { calculateChanges } from './runner'
import type { TransformExecutionResult } from './runner'
import type { TransformLanguage } from './engine'

export interface RemoteTransformRequest {
  source: string
  language: TransformLanguage
  signal?: AbortSignal
  timeoutMs?: number
}

/** Trusted, version-pinned Babel CDN transform. Workers isolate UI responsiveness, not malicious code. */
export function runRemoteBabel(request: RemoteTransformRequest): Promise<TransformExecutionResult> {
  if (request.language === 'css') return Promise.reject(new Error('Babel supports JavaScript and TypeScript only'))
  if (request.source.length > 2_000_000) return Promise.reject(new Error('Source exceeds the 2 MB limit'))
  if (request.signal?.aborted) return Promise.reject(new Error('Transform cancelled'))
  const started = performance.now()
  const worker = new Worker(new URL('./babel.worker.ts', import.meta.url), { type: 'module' })
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (error?: Error, output?: string) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      request.signal?.removeEventListener('abort', abort)
      worker.terminate()
      if (error) reject(error)
      else {
        const result = output ?? request.source
        resolve({ output: result, diagnostics: [], changes: calculateChanges(request.source, result), elapsedMs: Math.round(performance.now() - started) })
      }
    }
    const abort = () => finish(new Error('Transform cancelled'))
    const timeout = setTimeout(() => finish(new Error('Remote transform timed out')), request.timeoutMs ?? 15_000)
    request.signal?.addEventListener('abort', abort, { once: true })
    worker.onerror = event => finish(new Error(event.message || 'Babel worker failed'))
    worker.onmessage = (event: MessageEvent<{ id: number; output?: string; error?: string }>) => {
      if (event.data.id !== 1) return
      if (event.data.error) finish(new Error(event.data.error))
      else finish(undefined, event.data.output)
    }
    worker.postMessage({ id: 1, source: request.source, language: request.language, preset: request.language === 'typescript' ? 'typescript' : 'react' })
  })
}
