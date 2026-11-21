# Transform Workspace

The first transformation workspace is integrated with the existing AST Explorer input editor. Open **Transforms** above the source editor.

## Rule format

Rules are JSON objects with `find` and `replace` fields:

```json
[
  { "find": "oldName", "replace": "newName" }
]
```

- **JavaScript / TypeScript:** matches identifier nodes using the TypeScript AST. Does not blindly replace strings or comments.
- **CSS:** matches declaration property names using PostCSS.
- **Run transform:** previews the result without changing the source.
- **Apply:** replaces source only after a successful preview. The AST parser then updates through the existing source state.
- Errors and parse diagnostics appear in the workspace.

This initial implementation uses a safe declarative rule format rather than executing arbitrary user-supplied JavaScript. It reuses Monaco temporarily; a typed editor adapter and CodeMirror 6 provider are planned next. The output preview is not yet read-only, and worker isolation and a richer transform-plugin API remain future work.

## Preview consistency

The workspace tracks the exact source, language and rules used to generate a preview. Applying a stale preview is blocked. The preview is invalidated whenever source, language or rules change.

## Limitations

Identifier rewriting is syntactic, not symbol-aware: a matching identifier in a property or object key can also be changed. It does not perform TypeScript symbol resolution or scope-aware rename. CSS rules rename declaration properties, not selectors or values.
