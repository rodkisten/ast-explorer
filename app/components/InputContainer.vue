<script setup lang="ts">
import { computed, ref } from 'vue'
import AppTooltip from '~/components/AppTooltip.vue'
import CodeEditor from '~/components/CodeEditor.vue'
import EditorSettings from '~/components/EditorSettings.vue'
import TransformWorkspace from '~/components/TransformWorkspace.vue'
import { code, showEditorSettings } from '~/state/editor'
import { parserOptions } from '~/state/parser/options'
import { currentParser } from '~/state/parser/parser'

const showTransforms = ref(false)

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
    <button
      pill-button
      absolute
      left-3
      top-2
      z-100
      text-xs
      @click="showTransforms = !showTransforms"
    >
      {{ showTransforms ? 'Hide transforms' : 'Transforms' }}
    </button>
    <AppTooltip text="Editor Settings">
      <button
        aria-label="Editor Settings"
        p="0.8"
        absolute
        right-5
        top-2
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
