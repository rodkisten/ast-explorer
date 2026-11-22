/** Resolves static package imports in transformer code, following LiveCodes import-map behavior. */
export interface ModuleResolution {
  specifier: string
  url: string
}

const bare = (specifier: string) => !/^(?:[./]|https?:|data:|blob:)/.test(specifier)
const safePackage = /^(?:@[-\\w.]+\\/)?[-\\w.]+(?:\\/[-\\w.]+)*$/

export async function resolveTransformerImports(source: string): Promise<ModuleResolution[]> {
  const ts = await import('typescript')
  const file = ts.createSourceFile('transform.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const names = new Set<string>()
  const visit = (node: import('typescript').Node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))
      names.add(node.moduleSpecifier.text)
    if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')))
      names.add(node.arguments[0].text)
    ts.forEachChild(node, visit)
  }
  visit(file)
  return [...names].map((specifier) => {
    if (!bare(specifier) || !safePackage.test(specifier))
      throw new Error(`Only bare npm package imports are supported: ${specifier}`)
    return { specifier, url: `https://esm.sh/${specifier}` }
  })
}
