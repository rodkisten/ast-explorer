<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CodeEditor from '~/components/CodeEditor.vue'
import { supportsTransform, transformSource } from '~/transform/engine'
import { code } from '~/state/editor'
import type { MonacoLanguage } from '~/parser'

const props = defineProps<{ language: MonacoLanguage }>()
const emit = defineEmits<{ close: [] }>()
const rules = ref('[\n  { "find": "oldName", "replace": "newName" }\n]')
const output = ref('')
const diagnostics = ref<string[]>([])
const busy = ref(false)
const dirty = ref(false)
const previewSource = ref('')
const previewRules = ref('')
const previewLanguage = ref<MonacoLanguage>()
const supported = computed(() => supportsTransform(props.language))
let generation = 0

async function run() {
  if (!supportsTransform(props.language)) return
  const id = ++generation
  busy.value = true
  diagnostics.value = []
  try {
    const result = await transformSource(code.value, props.language, rules.value)
    if (id !== generation) return
    output.value = result.output
    diagnostics.value = result.diagnostics
    previewSource.value = code.value
    previewRules.value = rules.value
    previewLanguage.value = props.language
    dirty.value = result.diagnostics.length === 0
  } catch (error) {
    if (id !== generation) return
    diagnostics.value = [error instanceof Error ? error.message : String(error)]
    dirty.value = false
  } finally {
    if (id === generation) busy.value = false
  }
}

function apply() {
  if (!dirty.value || diagnostics.value.length || code.value !== previewSource.value || rules.value !== previewRules.value || props.language !== previewLanguage.value) return
  code.value = output.value
  dirty.value = false
}

watch([code, () => props.language, rules], () => {
  generation++
  dirty.value = false
  output.value = ''
  diagnostics.value = []
  busy.value = false
})
</script>

<template>
  <section class="transform-workspace" flex="~ col" h-full min-h-0 min-w-0 border-t border-base>
    <header flex="~ y-center wrap" gap2 border-b border-base px3 py2>
      <strong text-sm>Transform workspace</strong>
      <span text-xs text-soft>AST-aware identifier / CSS property rules</span>
      <div flex-1 />
      <button pill-button :disabled="!supported || busy" @click="run">
        {{ busy ? 'Running…' : 'Run transform' }}
      </button>
      <button pill-button :disabled="!dirty || diagnostics.length > 0 || code !== previewSource || rules !== previewRules || language !== previewLanguage" @click="apply">
        Apply
      </button>
      <button aria-label="Close transform workspace" nav-button @click="emit('close')">
        <span i-ri:close-line />
      </button>
    </header>
    <p v-if="!supported" px3 py2 text-sm text-soft>
      Transform rules currently support JavaScript, TypeScript and CSS.
    </p>
    <div v-else class="transform-editors" flex-1 min-h-0 min-w-0>
      <div flex="~ col" min-h-0 min-w-0>
        <div px3 py1 text-xs text-soft>Rules (JSON)</div>
        <CodeEditor v-model="rules" language="json" flex-1 min-h-0 />
      </div>
      <div flex="~ col" min-h-0 min-w-0>
        <div px3 py1 text-xs text-soft>Output preview</div>
        <CodeEditor v-model="output" :language="language" flex-1 min-h-0 />
      </div>
    </div>
    <p v-if="dirty" px3 py1 text-xs text-soft>Preview ready. Apply updates the source editor and AST.</p>
    <div v-if="diagnostics.length" role="alert" px3 py2 text-sm text-red-600 dark:text-red-400>
      <div v-for="(message, index) in diagnostics" :key="index">{{ message }}</div>
    </div>
  </section>
</template>

<style scoped>
.transform-workspace { min-height: 18rem; }
.transform-editors { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.transform-editors > div + div { border-left: 1px solid var(--c-border); }
@media (max-width: 640px) {
  .transform-editors { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(10rem, 1fr) minmax(10rem, 1fr); }
  .transform-editors > div + div { border-left: 0; border-top: 1px solid var(--c-border); }
}
</style>
