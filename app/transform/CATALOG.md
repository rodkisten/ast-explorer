# Transformer catalog

The catalog in `app/transform/templates.ts` provides editable TypeScript examples for the Transform Workspace.

## Upstream AST Explorer

Source: https://github.com/fkling/astexplorer/tree/master/website/src/parsers

The original registry (`website/src/parsers/index.js`) discovers transformer folders and their `codeExample.txt` files. Each transformer also has an `index.js` defining its runtime contract. The legacy Webpack configuration is not copied into this Nuxt/Vite application.

### Adapted examples

| Upstream example                             | Catalog ID            | Execution contract                                                      |
| -------------------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| `css/transformers/postcss/codeExample.txt`   | `original-postcss`    | PostCSS plugin factory wrapped in a source-to-source transform          |
| `js/transformers/babel7/codeExample.txt`     | `original-babel7`     | Babel plugin visitor wrapped in a source-to-source transform            |
| `js/transformers/typescript/codeExample.txt` | `original-typescript` | TypeScript AST visitor; program/type-checker features are not preserved |

Other upstream transformer families include jscodeshift, recast, ESLint, Prettier, TSLint and Babel macros. These require dedicated runtime adapters and must not be represented as working until implemented and verified.

## Constraints

- CDN imports are version-pinned in the examples.
- Custom code runs in a Web Worker, which is not a security sandbox.
- CDN packages may fail because of CSP, cross-origin module dependencies, Node-only APIs or package incompatibilities.
- Run TypeScript typecheck, lint and browser smoke tests before declaring any example operational.
