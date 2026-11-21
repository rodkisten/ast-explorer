import type { MonacoLanguage } from '~/parser'

export type EditorProvider = 'monaco' | 'codemirror'

export interface EditorSelection {
  anchor: number
  head: number
}

export interface EditorDiagnostic {
  from: number
  to: number
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface EditorAdapter {
  readonly provider: EditorProvider
  getValue(): string
  setValue(value: string): void
  getSelection(): EditorSelection
  setSelection(selection: EditorSelection): void
  focus(): void
  setLanguage(language: MonacoLanguage): void
  setDiagnostics(diagnostics: EditorDiagnostic[]): void
  dispose(): void
}

export interface EditorProviderDefinition {
  id: EditorProvider
  label: string
  load: () => Promise<unknown>
}

export const editorProviders: EditorProviderDefinition[] = [
  { id: 'monaco', label: 'Monaco', load: () => import('~/monaco/setup') },
  { id: 'codemirror', label: 'CodeMirror 6', load: () => import('~/editor/codemirror') },
]
