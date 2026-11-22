import type { TransformLanguage, TransformResult } from './engine'

export interface TransformPlugin {
  id: string
  label: string
  description: string
  languages: readonly TransformLanguage[]
  defaultConfig: string
  run: (
    source: string,
    language: TransformLanguage,
    config: string,
  ) => Promise<TransformResult>
}

export const transformPlugins: readonly TransformPlugin[] = [
  {
    id: 'rename-symbols',
    label: 'Rename identifiers / CSS properties',
    description:
      'AST-aware identifier replacements for JS/TS, declaration properties for CSS',
    languages: ['javascript', 'typescript', 'css'],
    defaultConfig: JSON.stringify(
      [{ find: 'oldName', replace: 'newName' }],
      null,
      2,
    ),
    run: async (source, language, config) => {
      const { transformSource } = await import('./engine')
      return transformSource(source, language, config)
    },
  },
  {
    id: 'remove-console',
    label: 'Remove console calls',
    description:
      'Remove standalone console.log/debug/info/warn statements using TypeScript AST ranges',
    languages: ['javascript', 'typescript'],
    defaultConfig: '{}',
    run: async (source, language) => {
      const ts = await import('typescript')
      const file = ts.createSourceFile(
        `input.${language === 'typescript' ? 'ts' : 'js'}`,
        source,
        ts.ScriptTarget.Latest,
        true,
        language === 'typescript' ? ts.ScriptKind.TS : ts.ScriptKind.JS,
      )
      const edits: Array<{ from: number; to: number }> = []
      const visit = (node: import('typescript').Node) => {
        if (
          ts.isExpressionStatement(node) &&
          ts.isCallExpression(node.expression)
        ) {
          const target = node.expression.expression
          if (
            ts.isPropertyAccessExpression(target) &&
            ts.isIdentifier(target.expression) &&
            target.expression.text === 'console' &&
            ['log', 'debug', 'info', 'warn'].includes(target.name.text)
          ) {
            edits.push({ from: node.getFullStart(), to: node.getEnd() })
            return
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(file)
      let output = source
      for (const edit of edits.toSorted((a, b) => b.from - a.from))
        output = output.slice(0, edit.from) + output.slice(edit.to)
      return { output, diagnostics: [] }
    },
  },
]

export function getTransformPlugin(id: string): TransformPlugin | undefined {
  return transformPlugins.find((plugin) => plugin.id === id)
}
