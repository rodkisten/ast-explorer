export interface TypeLibrary { filename: string; content: string }

/** Acquire transitive npm declaration files in an isolated worker. */
export function acquireTransformerTypes(source: string): Promise<TypeLibrary[]> {
  if (!source.trim()) return Promise.resolve([])
  const worker = new Worker(new URL('./types.worker.ts', import.meta.url), { type: 'module' })
  return new Promise((resolve, reject) => {
    const finish = (error?: string, libraries: TypeLibrary[] = []) => {
      worker.terminate()
      if (error) reject(new Error(error))
      else resolve(libraries)
    }
    worker.addEventListener('error', (event) => finish(event.message))
    worker.addEventListener('message', (event: MessageEvent<{ id: number; libraries: TypeLibrary[]; error?: string }>) => {
      if (event.data.id !== 1) return
      finish(event.data.error, event.data.libraries)
    })
    worker.postMessage({ id: 1, source })
  })
}
