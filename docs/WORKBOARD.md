# AST Explorer Workboard

> Living project plan. All project documentation, source comments, commit messages, pull request titles, and pull request descriptions are written in English.
>
> Status: **Active**. Update this board in the same pull request as each substantial implementation milestone.

## Vision

Modernize the fork of [sxzz/ast-explorer](https://github.com/sxzz/ast-explorer) into a mobile-first, fast, extensible AST and source transformation workbench at **https://ast.migos.club**. Preserve the existing Vue 3 / Nuxt application and parser ecosystem while replacing editor coupling with an adapter-driven architecture.

## Non-negotiable engineering conventions

- Work from the latest `main`; verify PR merge state before making changes. Never continue on merged branches.
- Prefer substantial, coherent implementation batches over many tiny commits.
- Use English for code, documentation, workboard, commits, PR titles, and PR descriptions.
- Keep this workboard and README in sync with implementation.
- Use `[skip ci]` on intermediate commits and `[deploy]` on the final commit when applicable.
- Maintain responsive, iPhone Safari-first UX with compact controls and dark/light modes.
- Avoid coupling parser, transform, and tree visualization logic to Monaco or CodeMirror.
- Report exact verification commands and actual CI results; do not claim a deploy before verification.

## Architecture decisions

### Editor adapter layer

Provide a typed `EditorAdapter` contract and `EditorProvider` selection independent of the AST/parsing pipeline. Initial providers:

- **CodeMirror 6**: preferred lightweight, modular, mobile-friendly editor.
- **Monaco**: compatibility option for existing behavior and richer desktop integrations.

The shared contract should cover:

- Model lifecycle, source text, language ID, read-only state, focus, selection and cursor position.
- Text edits and transactions, undo/redo, clipboard behavior, keyboard shortcuts and commands.
- Diagnostics, decorations, markers and source ranges.
- Change subscriptions with disposal and loop-safe synchronization.
- Theme switching, resize/layout and persistence of editor preference.
- Lazy provider loading and lazy language support; no eager loading of both editor engines.
- Consistent integration with AST selection and transform results.

Keep provider-specific code behind adapters. No direct Monaco imports in AST tree or transformation UI. Favor Vue composables and typed interfaces; do not introduce React as a second application runtime.

### AST and parser pipeline

- Preserve existing parser registry and parser selection behavior.
- Keep source-to-AST and AST-to-source selection mapping independent of editor implementation.
- Lazy-load language parsers and heavy language tooling where practical.
- Assess Web Workers for expensive parsing and transformation, using cancellation and stale-result protection.
- Use WASM only when a selected parser or transform requires it, not as a blanket dependency.

### Transform workspace

- Add a dockable/resizable Transform panel, initially for JavaScript, TypeScript and CSS.
- Support input source, transformation source, output preview, error diagnostics and one-click apply.
- Investigate Babel-based JavaScript/TypeScript transforms and PostCSS-based CSS transforms.
- Keep transform execution sandboxed and avoid blocking the editor thread.
- Provide explicit reset, rerun and copy controls, with deterministic output and clear errors.

### Experience and design

- Visual direction: Linear/Vercel-inspired, polished and minimal, with accessible Radix-style interactions where appropriate for Vue.
- Mobile-first split panes, compact toolbar, responsive AST tree and transform drawer.
- Theme parity, command shortcuts, clear loading states and robust editor resizing.
- No intrusive browser zoom or oversized controls on iPhone Safari.

## Infrastructure

| Area | Target | Status |
| --- | --- | --- |
| Production | `ast.migos.club` | Pending Wrangler deployment validation |
| PR preview | `pr<NUMBER>-dev.ast.migos.club` | Implemented provisionally; not validated |
| Preview cleanup | Delete custom domain and Worker on PR close/merge | Implemented provisionally; not validated |
| Nuxt build | Static `.output/public` with Cloudflare output | Nuxt generate passed; Wrangler deployment pending |
| Cross-origin isolation | COOP same-origin and COEP require-corp | `public/_headers` added; verify HTTP responses |
| CI setup | Node 24.15.0 and pnpm 12.21.0 | Setup fixed in PR #2 |
| Formatting | ESLint / Prettier / YAML | Fixing in PR #2 |

## Delivery workboard

### Phase 0: Reliable infrastructure (P0)

- [x] Add production and PR-preview Cloudflare workflow (PR #1).
- [x] Add custom-domain attach and preview cleanup script (PR #1).
- [x] Add static isolation headers (PR #1).
- [x] Replace failing pnpm bootstrap with pinned Corepack setup (PR #2).
- [x] Get unit-test workflow green.\n- [ ] Verify formatting-check workflow after replacing unavailable autofix.ci app.\n- [ ] Configure Cloudflare GitHub Actions secrets and verify deployment.
- [x] Verify Nuxt static generation in CI.\n- [ ] Verify Wrangler static assets deployment and custom domain attachment.
- [ ] Confirm production domain and HTTP isolation headers.
- [ ] Confirm PR preview URL and deletion on close.
- [ ] Ensure external fork PRs never receive privileged credentials.

### Phase 1: Abstract editor foundation (P0, next)

- [ ] Audit current Monaco integration points, parser composables and AST selection flow.
- [ ] Define typed editor adapter interfaces, lifecycle and command contract.
- [ ] Extract editor-independent source state, selection synchronization and diagnostics.
- [ ] Implement a Monaco adapter preserving current behavior.
- [ ] Introduce editor-provider preference and dynamic loading boundary.
- [ ] Update README and architecture documentation with adapter diagram.

### Phase 2: CodeMirror 6 integration (P0)

- [ ] Add CodeMirror 6 packages and Vue host component.
- [ ] Implement JavaScript, TypeScript and CSS language extensions with lazy loading.
- [ ] Add completion, search, undo/redo, keyboard shortcuts, clipboard, selection and themes.
- [ ] Synchronize CodeMirror cursor/ranges with AST tree without update loops.
- [ ] Make CodeMirror the mobile-first default, retaining Monaco as a selectable provider.
- [ ] Verify behavior and bundle loading in iPhone Safari and desktop browsers.

### Phase 3: Transform workspace (P1)

- [ ] Add resizable/dockable Transform panel and execution controls.
- [ ] Add JavaScript/TypeScript transform runner and error reporting.
- [ ] Add CSS transform runner using PostCSS and structured output.
- [ ] Move heavy execution off the main thread when supported.
- [ ] Connect transformed output to AST refresh, source ranges and apply/revert.

### Phase 4: Polish and extension points (P2)

- [ ] Improve parser/language package discovery and lazy loading.
- [ ] Profile initial bundle, editor startup and parser latency.
- [ ] Add shareable state and persistence only after privacy and scope decisions.
- [ ] Improve mobile gestures, pane layout, accessibility and visual consistency.
- [ ] Document extension APIs for new editor adapters, parsers and transforms.

## Next implementation batch

**Editor abstraction + Monaco compatibility**. Inventory existing components and composables, add the adapter contract, route source/selection synchronization through it, preserve current Monaco behavior, and document the extension point. Follow with CodeMirror integration as a separate substantial batch.

## Definition of done

A work item is complete only when code is committed to the correct active branch, applicable CI checks pass, its user-visible behavior is verified, and the README/workboard reflect the actual result. Cloudflare publication must be verified from the live URL.

## Decision log

- **2026-11-20:** Retain Vue/Nuxt and the existing parser ecosystem.
- **2026-11-20:** Use an editor-neutral adapter supporting both Monaco and CodeMirror 6.
- **2026-11-20:** Prefer CodeMirror 6 for mobile-first editing.
- **2026-11-20:** Plan JavaScript, TypeScript and CSS transforms with a dedicated Transform panel.
- **2026-11-20:** Use Cloudflare production and ephemeral PR-specific custom domains.
- **2026-11-20:** Make this English-language workboard the durable source of project planning.
