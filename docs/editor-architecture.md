# Editor architecture

## Goals

Keep parser selection, AST source ranges, diagnostics and transformations independent of editor engine.

The typed `EditorAdapter` contract in `app/editor/adapter.ts` defines the minimum surface: source text, selection, language, diagnostics, focus and lifecycle. Providers are loaded lazily and must never be loaded together by default.

### Milestones

1. **Contract (implemented):** shared provider types and lazy registry.
2. **Monaco adapter (initial implementation):** wrap the existing `MonacoEditor` instance and preserve cursor-to-AST synchronization and settings.
3. **CodeMirror 6 adapter:** implement a Vue host with compartments for language and theme, selections, transactions and decorations.
4. **Provider switch:** persist user preference and switch without losing source, cursor or AST selection.
5. **Transform integration:** use the same adapter contract for source, rules and output, with read-only output and diagnostics.

The initial contract is a foundation, **not** a completed editor migration. CodeMirror is not yet installed or rendered.
