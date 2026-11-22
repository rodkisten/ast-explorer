import type { TransformResult } from './engine'

export type CssTransformer = 'autoprefixer' | 'preset-env' | 'cssnano'

/** Pinned CDN modules run in a disposable Worker, not a security sandbox. */
export function runRemoteCss(
  source: string,
  transformer: CssTransformer,
): Promise<TransformResult> {
  if (source.length > 2_000_000)
    return Promise.reject(new Error('Source exceeds the 2 MB limit'))
  const worker = new Worker(new URL('css.worker.ts', import.meta.url), {
    type: 'module',
  })
  return new Promise((resolve, reject) => {
    let finished = false
    const finish = (error?: Error, result?: TransformResult) => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      worker.terminate()
      if (error) reject(error)
      else resolve(result ?? { output: source, diagnostics: [] })
    }
    const timeout = setTimeout(
      () => finish(new Error('CSS CDN transformer timed out')),
      30_000,
    )
    worker.addEventListener('error', (event) =>
      finish(new Error(event.message || 'CSS worker failed')),
    )
    worker.addEventListener(
      'message',
      (
        event: MessageEvent<{
          id: number
          output?: string
          diagnostics?: string[]
          error?: string
        }>,
      ) => {
        if (event.data.id !== 1) return
        if (event.data.error) finish(new Error(event.data.error))
        else
          finish(undefined, {
            output: event.data.output ?? source,
            diagnostics: event.data.diagnostics ?? [],
          })
      },
    )
    worker.postMessage({ id: 1, source, transformer })
  })
}
