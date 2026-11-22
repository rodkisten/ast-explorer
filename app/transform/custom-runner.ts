import { resolveTransformerImports } from './module-resolver'
import type { TransformResult } from './engine'

/** Executes user-authored transformer code in a Worker. This is NOT a security sandbox. */
export async function runCustomTransformer(source: string, transformer: string, signal?: AbortSignal): Promise<TransformResult> {
  if (source.length > 2_000_000 || transformer.length > 100_000) throw new Error('Transformer exceeds size limit')
  if (signal?.aborted) throw new Error('Transform cancelled')
  const imports = await resolveTransformerImports(transformer)
  if (signal?.aborted) throw new Error('Transform cancelled')
  const worker = new Worker(new URL('./custom.worker.ts', import.meta.url), { type: 'module' })
  return new Promise((resolve, reject) => {
    let done = false
    const finish = (error?: Error, output?: string) => {
      if (done) return
      done = true
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
      worker.terminate()
      if (error) reject(error)
      else resolve({ output: output ?? source, diagnostics: [] })
    }
    const abort = () => finish(new Error('Transform cancelled'))
    const timeout = setTimeout(() => finish(new Error('Transformer timed out')), 30_000)
    signal?.addEventListener('abort', abort, { once: true })
    worker.addEventListener('error', (event) => finish(new Error(event.message || 'Transformer worker failed')))
    worker.addEventListener('message', (event: MessageEvent<{ id: number; output?: string; error?: string }>) => {
      if (event.data.id !== 1) return
      if (event.data.error) finish(new Error(event.data.error))
      else finish(undefined, event.data.output)
    })
    worker.postMessage({ id: 1, source, transformer, imports })
  })
}
