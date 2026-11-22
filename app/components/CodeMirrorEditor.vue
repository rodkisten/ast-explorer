<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { basicSetup, EditorView } from 'codemirror'
import { Compartment, EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { linter, setDiagnostics } from '@codemirror/lint'
import { Decoration, ViewPlugin } from '@codemirror/view'
import { StateEffect } from '@codemirror/state'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { editorCursor, outputHoverRange, showEditorSettings } from '~/state/editor'
import type { MonacoLanguage } from '~/parser'
import type { EditorAdapter, EditorDiagnostic, EditorSelection } from '~/editor/adapter'

const props = defineProps<{ language: MonacoLanguage; input?: boolean }>()
const code = defineModel<string>({ default: '' })
const element = shallowRef<HTMLElement>()
const view = shallowRef<EditorView>()
const adapter = shallowRef<EditorAdapter>()
const languageCompartment = new Compartment()
const hoverMark = Decoration.mark({ class: 'ast-highlight' })
const refreshHover = StateEffect.define<void>()
const hoverPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet
  constructor(view: EditorView) {
    this.decorations = this.compute(view)
  }
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.transactions.some(transaction => transaction.effects.some(effect => effect.is(refreshHover)))) this.decorations = this.compute(update.view)
  }
  compute(view: EditorView) {
    const range = outputHoverRange.value
    if (!props.input || !range) return Decoration.none
    const from = Math.min(view.state.doc.length, Math.max(0, range[0]))
    const to = Math.min(view.state.doc.length, Math.max(from, range[1]))
    return Decoration.set([hoverMark.range(from, to)])
  }
}, { decorations: plugin => plugin.decorations })

function languageExtension(language: MonacoLanguage) {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return javascript({ typescript: language === 'typescript' })
    case 'css': return css()
    case 'json': return json()
    case 'html': return html()
    case 'markdown': return markdown()
    case 'python': return python()
    case 'sql': return sql()
    default: return []
  }
}

function updateSelection(selection: EditorSelection) {
  const editor = view.value
  if (!editor) return
  const length = editor.state.doc.length
  editor.dispatch({ selection: { anchor: Math.min(length, Math.max(0, selection.anchor)), head: Math.min(length, Math.max(0, selection.head)) } })
}

onMounted(() => {
  if (!element.value) return
  const editor = new EditorView({
    parent: element.value,
    state: EditorState.create({
      doc: code.value,
      extensions: [
        basicSetup,
        hoverPlugin,
        EditorView.lineWrapping,
        languageCompartment.of(languageExtension(props.language)),
        linter(() => []),
        EditorView.theme({
          '&': { height: '100%', fontSize: '13px' },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-mono, monospace)' },
          '.cm-content': { minHeight: '100%' },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) code.value = update.state.doc.toString()
          if (props.input && (update.selectionSet || update.docChanged))
            editorCursor.value = update.state.selection.main.head
        }),
        EditorView.domEventHandlers({
          keydown(event) {
            if ((event.metaKey || event.ctrlKey) && event.key === ',') {
              event.preventDefault()
              showEditorSettings.value = true
              return true
            }
            return false
          },
        }),
      ],
    }),
  })
  view.value = editor
  adapter.value = {
    provider: 'codemirror',
    getValue: () => editor.state.doc.toString(),
    setValue: (value: string) => {
      if (value !== editor.state.doc.toString())
        editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } })
    },
    getSelection: () => ({ anchor: editor.state.selection.main.anchor, head: editor.state.selection.main.head }),
    setSelection: updateSelection,
    focus: () => editor.focus(),
    setLanguage: (language: MonacoLanguage) => editor.dispatch({ effects: languageCompartment.reconfigure(languageExtension(language)) }),
    setDiagnostics: (items: EditorDiagnostic[]) => editor.dispatch(setDiagnostics(editor.state, items.map(item => ({ from: item.from, to: item.to, message: item.message, severity: item.severity })))),
    dispose: () => editor.destroy(),
  }
})

watch(code, (value) => {
  const editor = view.value
  if (editor && value !== editor.state.doc.toString()) {
    const selection = editor.state.selection.main
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value }, selection: { anchor: Math.min(selection.anchor, value.length), head: Math.min(selection.head, value.length) } })
  }
})
watch(() => props.language, language => adapter.value?.setLanguage(language))
watch(() => outputHoverRange.value, () => {
  const editor = view.value
  if (!editor || !props.input) return
  // Inspector hover must never steal scroll, focus, selection, or the mobile keyboard.
  editor.dispatch({ effects: refreshHover.of() })
})
onBeforeUnmount(() => {
  adapter.value?.dispose()
  adapter.value = undefined
  view.value = undefined
})
defineExpose({ adapter })
</script>

<template>
  <div ref="element" class="codemirror-host" h-full min-h-0 w-full role="region" aria-label="CodeMirror 6 code editor" />
</template>

<style scoped>
.codemirror-host { overflow: hidden; }
.codemirror-host :deep(.ast-highlight) { background: rgba(124, 58, 237, 0.22); border-radius: 2px; }
</style>
