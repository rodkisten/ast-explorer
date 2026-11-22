<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CodeEditor from '~/components/CodeEditor.vue'
import { supportsTransform } from '~/transform/engine'
import { getTransformPlugin, transformPlugins } from '~/transform/plugins'
import { executeTransform } from '~/transform/runner'
import { runRemoteBabel } from '~/transform/remote'
import type { TransformChange } from '~/transform/runner'
import { code } from '~/state/editor'
import type { MonacoLanguage } from '~/parser'

const props = defineProps<{ language: MonacoLanguage }>()
const emit = defineEmits<{ close: [] }>()
const pluginId = ref('rename-symbols')
const remoteEnabled = ref(false)
const plugin = computed(() => getTransformPlugin(pluginId.value))
const availablePlugins = computed(() => transformPlugins.filter(item => item.languages.includes(props.language as 'javascript' | 'typescript' | 'css')))
const rules = ref('[\n  { "find": "oldName", "replace": "newName" }\n]')
const output = ref('')
const outputMode = ref<'preview' | 'source'>('preview')
const diagnostics = ref<string[]>([])
const changes = ref<TransformChange[]>([])
const elapsedMs = ref(0)
let controller: AbortController | undefined
const busy = ref(false)
const dirty = ref(false)
const previewSource = ref('')
const previewRules = ref('')
const previewLanguage = ref<MonacoLanguage>()
const supported = computed(() => supportsTransform(props.language))
const changed = computed(() => output.value !== previewSource.value)
const additions = computed(() => Math.max(0, output.value.split('\n').length - previewSource.value.split('\n').length))
const removals = computed(() => Math.max(0, previewSource.value.split('\n').length - output.value.split('\n').length))
let generation = 0

async function run() {
  if (!supportsTransform(props.language) || (!remoteEnabled.value && (!plugin.value || !plugin.value.languages.includes(props.language)))) return
  const id = ++generation
  controller?.abort()
  controller = new AbortController()
  busy.value = true
  diagnostics.value = []
  try {
    const result = remoteEnabled.value
      ? await runRemoteBabel({ source: code.value, language: props.language, signal: controller.signal })
      : await executeTransform({ pluginId: pluginId.value, source: code.value, language: props.language, config: rules.value, signal: controller.signal })
    if (id !== generation) return
    output.value = result.output
    diagnostics.value = result.diagnostics
    changes.value = result.changes
    elapsedMs.value = result.elapsedMs
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

watch(pluginId, () => { rules.value = plugin.value?.defaultConfig ?? '{}' })
watch([code, () => props.language, rules, pluginId, remoteEnabled], () => {
  generation++
  controller?.abort()
  changes.value = []
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
      <label flex="~ y-center" gap1 text-xs><input v-model="remoteEnabled" type="checkbox" /> CDN Babel (experimental)</label>
      <select v-if="!remoteEnabled" v-model="pluginId" aria-label="Transform plugin" rounded border border-base bg-base px2 py1 text-xs>
        <option v-for="item in availablePlugins" :key="item.id" :value="item.id">{{ item.label }}</option>
      </select>
      <span text-xs text-soft>Run AST transforms, inspect output, then apply</span>
      <div flex-1 />
      <button pill-button :disabled="!supported || (!remoteEnabled && !plugin) || (remoteEnabled && language === 'css') || busy" @click="run">
        {{ busy ? 'Running…' : 'Run transform' }}
      </button>
      <button pill-button :disabled="!dirty || !changed || diagnostics.length > 0 || code !== previewSource || rules !== previewRules || language !== previewLanguage" @click="apply">
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
        <div px3 py1 text-xs text-soft>{{ remoteEnabled ? 'Babel via esm.sh · fixed version · runs in a worker' : plugin?.label + ' · Configuration (JSON)' }}</div>
        <CodeEditor v-if="!remoteEnabled" v-model="rules" language="json" flex-1 min-h-0 />
        <p v-else p3 text-sm text-soft>Loads @babel/standalone on demand. React preset for JavaScript, TypeScript preset for TS. External code runs in a Worker, which is not a security sandbox. Requires CDN access and CSP permission.</p>
      </div>
      <div flex="~ col" min-h-0 min-w-0>
        <div flex="~ y-center" justify-between gap2 px3 py1 text-xs text-soft>
          <span>{{ outputMode === 'preview' ? 'Transformed output' : 'Original source' }}</span>
          <select v-model="outputMode" aria-label="Compare transform output" rounded border border-base bg-base px2 py1>
            <option value="preview">Output</option>
            <option value="source">Before</option>
          </select>
        </div>
        <CodeEditor v-if="outputMode === 'preview'" v-model="output" :language="language" flex-1 min-h-0 />
        <CodeEditor v-else :model-value="previewSource" :language="language" flex-1 min-h-0 />
      </div>
    </div>
    <div v-if="dirty" flex="~ y-center wrap" gap3 border-t border-base px3 py2 text-xs>
      <span>{{ changes.length }} changed region{{ changes.length === 1 ? '' : 's' }}</span>
      <span>{{ elapsedMs }} ms</span>
      <span text-green-600>+{{ additions }} lines</span>
      <span text-red-600>-{{ removals }} lines</span>
      <span text-soft>Apply updates the source and reparses the AST.</span>
    </div>
    <div v-if="changes.length && dirty" border-t border-base px3 py2 text-xs>
      <details>
        <summary cursor-pointer>Inspect changed source ranges</summary>
        <div v-for="(change, index) in changes" :key="index" mt2 flex="~ col" gap1>
          <span text-soft>Original offsets {{ change.beforeStart }}–{{ change.beforeEnd }} → output {{ change.afterStart }}–{{ change.afterEnd }}</span>
          <pre overflow-auto rounded bg-base p2 text-red-500>- {{ change.removed }}</pre>
          <pre overflow-auto rounded bg-base p2 text-green-500>+ {{ change.inserted }}</pre>
        </div>
      </details>
    </div>
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
