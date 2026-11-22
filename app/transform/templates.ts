export interface TransformerTemplate {
  id: string
  label: string
  family: 'PostCSS' | 'Babel' | 'TypeScript'
  language: 'css' | 'javascript' | 'typescript'
  source: string
}

/** Editable examples: every template exports a function that accepts and returns source text. */
export const transformerTemplates: readonly TransformerTemplate[] = [
  {
    id: 'original-postcss',
    label: 'Original AST Explorer · PostCSS visitor',
    family: 'PostCSS',
    language: 'css',
    source: `import postcss from 'postcss@8.5.3'

// Adapted from fkling/astexplorer: css/transformers/postcss/codeExample.txt
// Original contract exports a PostCSS plugin factory.
const plugin = () => ({
  postcssPlugin: 'postcss-reverse-props',
  Once(root: postcss.Root) {
    root.walkRules(rule => {
      rule.walkDecls(decl => {
        decl.prop = decl.prop.split('').reverse().join('')
      })
    })
  },
})

export default async function transform(source: string): Promise<string> {
  return (await postcss([plugin()]).process(source, { from: undefined })).css
}`,
  },
  {
    id: 'original-babel7',
    label: 'Original AST Explorer · Babel 7 visitor',
    family: 'Babel',
    language: 'javascript',
    source: `import Babel from '@babel/standalone@7.26.9'

// Adapted from fkling/astexplorer: js/transformers/babel7/codeExample.txt
// Original contract exports a Babel plugin factory.
const plugin = () => ({
  name: 'ast-transform',
  visitor: {
    Identifier(path: { node: { name: string } }) {
      path.node.name = path.node.name.split('').reverse().join('')
    },
  },
})

export default function transform(source: string): string {
  return Babel.transform(source, { plugins: [plugin] }).code ?? source
}`,
  },
  {
    id: 'original-typescript',
    label: 'Original AST Explorer · TypeScript visitor',
    family: 'TypeScript',
    language: 'typescript',
    source: `import ts from 'typescript@5.9.3'

// Adapted from fkling/astexplorer: js/transformers/typescript/codeExample.txt
// The original uses a Program and type checker; this example uses a standalone source file.
export default function transform(source: string): string {
  const file = ts.createSourceFile('input.ts', source, ts.ScriptTarget.Latest, true)
  const visitor: ts.TransformerFactory<ts.SourceFile> = (context) => (root) => {
    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
      if (ts.isIdentifier(node) && (node.text === 'printTips' || node.text === 'tips'))
        return context.factory.createIdentifier(node.text.split('').reverse().join(''))
      return ts.visitEachChild(node, visit, context)
    }
    return ts.visitNode(root, visit) as ts.SourceFile
  }
  const result = ts.transform(file, [visitor])
  try { return ts.createPrinter().printFile(result.transformed[0]) }
  finally { result.dispose() }
}`,
  },

  {
    id: 'postcss-autoprefixer',
    label: 'Autoprefixer',
    family: 'PostCSS',
    language: 'css',
    source: `import postcss from 'postcss@8.5.3'
import autoprefixer from 'autoprefixer@10.4.21'

export default async function transform(source: string): Promise<string> {
  const result = await postcss([autoprefixer({ overrideBrowserslist: ['last 2 versions'] })]).process(source, { from: undefined })
  return result.css
}`,
  },
  {
    id: 'postcss-preset-env',
    label: 'Preset Env',
    family: 'PostCSS',
    language: 'css',
    source: `import postcss from 'postcss@8.5.3'
import presetEnv from 'postcss-preset-env@10.2.4'

export default async function transform(source: string): Promise<string> {
  return (await postcss([presetEnv({ stage: 3 })]).process(source, { from: undefined })).css
}`,
  },
  {
    id: 'postcss-cssnano',
    label: 'cssnano',
    family: 'PostCSS',
    language: 'css',
    source: `import postcss from 'postcss@8.5.3'
import cssnano from 'cssnano@7.0.7'

export default async function transform(source: string): Promise<string> {
  return (await postcss([cssnano({ preset: 'default' })]).process(source, { from: undefined })).css
}`,
  },
  {
    id: 'postcss-custom',
    label: 'Custom PostCSS visitor',
    family: 'PostCSS',
    language: 'css',
    source: `import postcss from 'postcss@8.5.3'

export default async function transform(source: string): Promise<string> {
  const plugin = {
    postcssPlugin: 'custom-property-rename',
    Declaration(decl: { prop: string }) {
      if (decl.prop === 'color') decl.prop = 'background-color'
    },
  }
  return (await postcss([plugin]).process(source, { from: undefined })).css
}`,
  },
  {
    id: 'babel-typescript',
    label: 'Strip TypeScript types',
    family: 'Babel',
    language: 'typescript',
    source: `import Babel from '@babel/standalone@7.26.9'

export default function transform(source: string): string {
  return Babel.transform(source, { filename: 'input.ts', presets: ['typescript'] }).code ?? source
}`,
  },
  {
    id: 'babel-react',
    label: 'JSX transform',
    family: 'Babel',
    language: 'javascript',
    source: `import Babel from '@babel/standalone@7.26.9'

export default function transform(source: string): string {
  return Babel.transform(source, { presets: ['react'] }).code ?? source
}`,
  },
  {
    id: 'babel-custom',
    label: 'Custom Babel visitor',
    family: 'Babel',
    language: 'javascript',
    source: `import Babel from '@babel/standalone@7.26.9'

export default function transform(source: string): string {
  const rename = ({ types }: { types: { identifier(name: string): unknown } }) => ({
    visitor: {
      Identifier(path: { node: { name: string } }) {
        if (path.node.name === 'oldName') path.node.name = 'newName'
      },
    },
  })
  return Babel.transform(source, { plugins: [rename] }).code ?? source
}`,
  },
  {
    id: 'typescript-transpile',
    label: 'Transpile TypeScript',
    family: 'TypeScript',
    language: 'typescript',
    source: `import ts from 'typescript@5.9.3'

export default function transform(source: string): string {
  return ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
}`,
  },
  {
    id: 'typescript-ast',
    label: 'Custom TypeScript AST visitor',
    family: 'TypeScript',
    language: 'typescript',
    source: `import ts from 'typescript@5.9.3'

export default function transform(source: string): string {
  const file = ts.createSourceFile('input.ts', source, ts.ScriptTarget.Latest, true)
  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => (root) => ts.visitNode(root, function visit(node: ts.Node): ts.VisitResult<ts.Node> {
    if (ts.isIdentifier(node) && node.text === 'oldName')
      return ts.factory.createIdentifier('newName')
    return ts.visitEachChild(node, visit, context)
  })
  const result = ts.transform(file, [transformer])
  try { return ts.createPrinter().printFile(result.transformed[0]) }
  finally { result.dispose() }
}`,
  },
]
