import type { MonacoLanguage } from '~/parser'

const identifierPattern = /^[$a-z_][\w$]*$/i

export type TransformLanguage = 'javascript' | 'typescript' | 'css'
export interface TransformRule {
  find: string
  replace: string
}
export interface TransformResult {
  output: string
  diagnostics: string[]
}

export function supportsTransform(language: MonacoLanguage): language is TransformLanguage {
  return language === 'javascript' || language === 'typescript' || language === 'css'
}

function parseRules(source: string): TransformRule[] {
  const parsed: unknown = JSON.parse(source)
  if (!Array.isArray(parsed))
    throw new TypeError('Rules must be a JSON array.')
  return parsed.map((rule: unknown, index): TransformRule => {
    if (
      typeof rule !== 'object' ||
      rule === null ||
      !('find' in rule) ||
      !('replace' in rule) ||
      typeof rule.find !== 'string' ||
      typeof rule.replace !== 'string' ||
      rule.find.length === 0
    )
      throw new TypeError(`Rule ${index + 1} must have non-empty "find" and string "replace".`)
    return { find: rule.find, replace: rule.replace }
  })
}

export async function transformSource(
  input: string,
  language: TransformLanguage,
  rulesSource: string,
): Promise<TransformResult> {
  const rules = parseRules(rulesSource)
  if (rules.length === 0)
    return { output: input, diagnostics: [] }
  if (language === 'css') {
    const { default: postcss } = await import('postcss')
    const root = postcss.parse(input)
    root.walkDecls((decl) => {
      for (const rule of rules) {
        if (decl.prop === rule.find)
          decl.prop = rule.replace
      }
    })
    return { output: root.toResult().css, diagnostics: [] }
  }

  const ts = await import('typescript')
  const sourceFile = ts.createSourceFile(
    language === 'typescript' ? 'input.ts' : 'input.js',
    input,
    ts.ScriptTarget.Latest,
    true,
    language === 'typescript' ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  )
  const edits: Array<{ start: number, end: number, replace: string }> = []
  const diagnostics: string[] = []
  const parseDiagnostics = (sourceFile as typeof sourceFile & { parseDiagnostics?: readonly import('typescript').Diagnostic[] }).parseDiagnostics
  for (const diagnostic of parseDiagnostics ?? [])
    diagnostics.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\\n'))
  if (diagnostics.length)
    return { output: input, diagnostics }
  const visit = (node: import('typescript').Node) => {
    if (ts.isIdentifier(node)) {
      const rule = rules.find((item) => item.find === node.text)
      if (rule) {
        if (!identifierPattern.test(rule.replace))
          throw new TypeError(`Invalid JavaScript identifier: ${rule.replace}`)
        edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), replace: rule.replace })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  let output = input
  for (const edit of edits.toSorted((a, b) => b.start - a.start))
    output = output.slice(0, edit.start) + edit.replace + output.slice(edit.end)
  return {
    output,
    diagnostics,
  }
}
