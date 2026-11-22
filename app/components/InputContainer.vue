<script setup lang="ts">
import { computed, ref } from 'vue'
import AppTooltip from '~/components/AppTooltip.vue'
import CodeEditor from '~/components/CodeEditor.vue'
import EditorSettings from '~/components/EditorSettings.vue'
import TransformWorkspace from '~/components/TransformWorkspace.vue'
import { code, showEditorSettings } from '~/state/editor'
import { editorProvider } from '~/state/editor-provider'
import { parserOptions } from '~/state/parser/options'
import { currentParser } from '~/state/parser/parser'

const showTransforms = ref(false)
const editorChoices = [
  { id: 'codemirror', label: 'CodeMirror 6' },
  { id: 'monaco', label: 'Monaco' },
] as const

const language = computed(() => {
  if (typeof currentParser.value.editorLanguage === 'string') {
    return currentParser.value.editorLanguage
  }
  return currentParser.value.editorLanguage(parserOptions.value)
})

function showSettings() {
  showEditorSettings.value = true
}
</script>

<template>
  <div relative flex="~ col" h-full min-h-0>
    <div class="editor-toolbar" flex="~ y-center wrap" gap2 border-b border-base px3 py2>
      <label flex="~ y-center" gap2 text-xs>
        <span>Editor</span>
        <select v-model="editorProvider" aria-label="Editor provider" rounded border border-base bg-base px2 py1>
          <option v-for="choice in editorChoices" :key="choice.id" :value="choice.id">{{ choice.label }}</option>
        </select>
      </label>
      <button pill-button text-xs :aria-expanded="showTransforms" @click="showTransforms = !showTransforms">
        {{ showTransforms ? 'Hide transforms' : 'Transform workspace' }}
      </button>
      <span text-xs text-soft>{{ editorProvider === 'codemirror' ? 'CodeMirror 6 active' : 'Monaco active' }}</span>
    </div>
    <AppTooltip text="Editor Settings">
      <button
        aria-label="Editor Settings"
        p="0.8"
        absolute
        right-5
        top-14
        z-100
        nav-button
        text-sm
        @click="showSettings"
      >
        <div i-ri:settings-line />
      </button>
    </AppTooltip>
    <div flex-1 min-h-0>
      <CodeEditor v-model="code" :language input h-full w-full />
    </div>
    <TransformWorkspace
      v-if="showTransforms"
      :language="language"
      class="h-45vh max-h-120 min-h-72"
      @close="showTransforms = false"
    />
    <EditorSettings />
  </div>
</template>
