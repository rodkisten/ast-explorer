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
