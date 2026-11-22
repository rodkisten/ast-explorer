/// <reference lib="webworker" />

interface RequestMessage { id: number; source: string; language: 'javascript' | 'typescript'; preset: 'react' | 'typescript' }

globalThis.addEventListener('message', async (event: MessageEvent<RequestMessage>) => {
  const { id, source, language, preset } = event.data
  try {
    // Fixed package and version: do not interpolate arbitrary package names into executable URLs.
    const moduleUrl: string = 'https://esm.sh/@babel/standalone@7.26.9?bundle'
    const babel = await import(/* @vite-ignore */ moduleUrl)
    const transform = babel.transform ?? babel.default?.transform
    if (typeof transform !== 'function') throw new Error('Babel transform export not found')
    const result = transform(source, { filename: language === 'typescript' ? 'input.tsx' : 'input.jsx', presets: [preset], sourceMaps: false, babelrc: false, configFile: false })
    globalThis.postMessage({ id, output: result.code ?? source, diagnostics: [] })
  } catch (error) {
    globalThis.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
})
