<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, shallowRef, watch, watchEffect } from 'vue'
import { editorProvider } from '~/state/editor-provider'
import Loading from '~/components/Loading.vue'
import { loadedMonaco, useMonacoLanguage } from '~/composables/monaco'
import {
  editorCursor,
  getSharedMonacoOptions,
  outputHoverRange,
  showEditorSettings,
} from '~/state/editor'
import { MonacoEditor } from '#components'
import type * as Monaco from 'monaco-editor'
import { createMonacoAdapter } from '~/editor/monaco-adapter'
import type { EditorAdapter } from '~/editor/adapter'
import type { MonacoLanguage } from '~/parser'

const CodeMirrorEditor = defineAsyncComponent(() => import('~/components/CodeMirrorEditor.vue'))

const props = defineProps<{
  language: MonacoLanguage
  input?: boolean
}>()
const code = defineModel<string>()

const container = shallowRef<{
  $editor: Monaco.editor.IStandaloneCodeEditor | undefined
}>()

const adapter = shallowRef<EditorAdapter>()

defineExpose({ adapter })

const options = computed(() => getSharedMonacoOptions())
const editorLanguage = useMonacoLanguage(() => props.language)

onBeforeUnmount(() => {
  adapter.value?.dispose()
  adapter.value = undefined
})

watch(
  () => container.value?.$editor,
  (editor) => {
    if (!editor) return
    adapter.value = createMonacoAdapter(editor)
    const monaco = loadedMonaco.value!

    editor.addAction({
      id: 'show-settings-panel',
      label: 'Show Settings Panel',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma],
      run: () => {
        showEditorSettings.value = true
      },
    })

    if (props.input) {
      editor.onDidChangeCursorPosition((e) => {
        editorCursor.value = editor.getModel()!.getOffsetAt(e.position)
      })
    }
  },
  { immediate: true },
)

if (props.input) {
  let decorationsCollection:
    Monaco.editor.IEditorDecorationsCollection | undefined

  watchEffect(() => {
    const editor = container.value?.$editor
    if (!editor) return

    decorationsCollection?.clear()
    if (!outputHoverRange.value) return

    const model = editor.getModel()!
    const start = model.getPositionAt(outputHoverRange.value[0])
    const end = model.getPositionAt(outputHoverRange.value[1])
    decorationsCollection = editor.createDecorationsCollection([
      {
        range: loadedMonaco.value!.Range.fromPositions(start, end),
        options: {
          isWholeLine: false,
          className: 'ast-highlight',
        },
      },
    ])
  })
}
</script>

<template>
  <CodeMirrorEditor
    v-if="editorProvider === 'codemirror'"
    v-model="code"
    :language="language"
    :input="input"
  />
  <MonacoEditor
    v-else-if="editorLanguage"
    ref="container"
    v-model="code"
    :lang="editorLanguage"
    :options="options"
  >
    <Loading />
  </MonacoEditor>
  <Loading v-else />
</template>
