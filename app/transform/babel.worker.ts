/// <reference lib="webworker" />

interface RequestMessage { id: number; source: string; language: 'javascript' | 'typescript'; preset: 'react' | 'typescript' }

self.onmessage = async (event: MessageEvent<RequestMessage>) => {
  const { id, source, language, preset } = event.data
  try {
    // Fixed package and version: do not interpolate arbitrary package names into executable URLs.
    const babel = await import(/* @vite-ignore */ 'https://esm.sh/@babel/standalone@7.26.9?bundle')
    const transform = babel.transform ?? babel.default?.transform
    if (typeof transform !== 'function') throw new Error('Babel transform export not found')
    const result = transform(source, { filename: language === 'typescript' ? 'input.tsx' : 'input.jsx', presets: [preset], sourceMaps: false, babelrc: false, configFile: false })
    self.postMessage({ id, output: result.code ?? source, diagnostics: [] })
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
}
