/// <reference lib="webworker" />

type CssTransformer = 'autoprefixer' | 'preset-env' | 'cssnano'

interface RequestMessage {
  id: number
  source: string
  transformer: CssTransformer
}

const modules: Record<CssTransformer, string> = {
  autoprefixer: 'https://esm.sh/autoprefixer@10.4.21?bundle',
  'preset-env': 'https://esm.sh/postcss-preset-env@10.2.4?bundle',
  cssnano: 'https://esm.sh/cssnano@7.0.7?bundle',
}

addEventListener('message', async (event: MessageEvent<RequestMessage>) => {
  const { id, source, transformer } = event.data
  try {
    if (!Object.hasOwn(modules, transformer))
      throw new Error('Unknown CSS transformer')
    const postcssUrl: string = 'https://esm.sh/postcss@8.5.3?bundle'
    const pluginUrl: string = modules[transformer]
    const [postcssModule, pluginModule] = await Promise.all([
      import(/* @vite-ignore */ postcssUrl),
      import(/* @vite-ignore */ pluginUrl),
    ])
    const postcss = postcssModule.default
    const plugin = pluginModule.default
    if (typeof postcss !== 'function' || typeof plugin !== 'function')
      throw new Error('CDN module does not export a PostCSS transformer')
    const options = transformer === 'autoprefixer'
      ? { overrideBrowserslist: ['last 2 versions', 'Safari >= 15'] }
      : transformer === 'preset-env'
        ? { stage: 3, browsers: 'last 2 versions' }
        : {}
    const result = await postcss([plugin(options)]).process(source, { from: undefined })
    postMessage({ id, output: result.css, diagnostics: result.warnings().map((warning: { text: string }) => warning.text) })
  } catch (error) {
    postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
})
