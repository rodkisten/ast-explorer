/// <reference lib="webworker" />

interface RequestMessage { id: number; source: string; transformer: string; imports: Array<{ specifier: string; url: string }> }

addEventListener('message', async (event: MessageEvent<RequestMessage>) => {
  const { id, source, transformer, imports } = event.data
  try {
    const tsUrl: string = 'https://esm.sh/typescript@5.9.3?bundle'
    const tsModule = await import(/* @vite-ignore */ tsUrl)
    const ts = tsModule.default ?? tsModule
    const transpiled = ts.transpileModule(transformer, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    const escaped = imports.reduce((code, item) => code.replaceAll(`from "${item.specifier}"`, `from "${item.url}"`).replaceAll(`from '${item.specifier}'`, `from '${item.url}'`), transpiled)
    const moduleUrl = URL.createObjectURL(new Blob([escaped], { type: 'text/javascript' }))
    try {
      const mod = await import(/* @vite-ignore */ moduleUrl)
      if (typeof mod.default !== 'function') throw new Error('Transformer must export a default function')
      const output: unknown = await mod.default(source)
      if (typeof output !== 'string') throw new Error('Transformer must return a string')
      postMessage({ id, output })
    } finally { URL.revokeObjectURL(moduleUrl) }
  } catch (error) { postMessage({ id, error: error instanceof Error ? error.message : String(error) }) }
})
