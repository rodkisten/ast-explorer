import type * as Monaco from 'monaco-editor'
import type { EditorAdapter, EditorSelection } from '~/editor/adapter'

export function createMonacoAdapter(editor: Monaco.editor.IStandaloneCodeEditor): EditorAdapter {
  const model = () => editor.getModel()
  return {
    provider: 'monaco',
    getValue: () => editor.getValue(),
    setValue: (value: string) => editor.setValue(value),
    getSelection: (): EditorSelection => {
      const selection = editor.getSelection()
      const current = model()
      return {
        anchor: current && selection ? current.getOffsetAt(selection.getStartPosition()) : 0,
        head: current && selection ? current.getOffsetAt(selection.getEndPosition()) : 0,
      }
    },
    setSelection: (selection: EditorSelection) => {
      const current = model()
      if (!current) return
      editor.setSelection({
        startLineNumber: current.getPositionAt(selection.anchor).lineNumber,
        startColumn: current.getPositionAt(selection.anchor).column,
        endLineNumber: current.getPositionAt(selection.head).lineNumber,
        endColumn: current.getPositionAt(selection.head).column,
      })
    },
    focus: () => editor.focus(),
    setLanguage: () => {
      // The Vue Monaco host owns the language lifecycle.
    },
    setDiagnostics: () => {
      // Diagnostics are provided by the parser integration.
    },
    dispose: () => {
      // The Vue Monaco host owns disposal.
    },
  }
}
