<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import CodeEditor from '~/components/CodeEditor.vue'
import { code } from '~/state/editor'
import { runCustomTransformer } from '~/transform/custom-runner'
import { supportsTransform } from '~/transform/engine'
import { getTransformPlugin, transformPlugins } from '~/transform/plugins'
import { runRemoteBabel } from '~/transform/remote'
import {
  calculateChanges,
  executeTransform,
  type TransformChange,
} from '~/transform/runner'
import type { MonacoLanguage } from '~/parser'

const props = defineProps<{ language: MonacoLanguage }>()
const emit = defineEmits<{ close: [] }>()
const pluginId = ref('rename-symbols')
const remoteEnabled = ref(false)
const customEnabled = ref(false)
const customCode = ref(`import postcss from 'postcss@8.5.3'
import autoprefixer from 'autoprefixer@10.4.21'

export default async function transform(source: string): Promise<string> {
  const result = await postcss([autoprefixer()]).process(source, { from: undefined })
  return result.css
}`)
const plugin = computed(() => getTransformPlugin(pluginId.value))
const availablePlugins = computed(() =>
  transformPlugins.filter((item) =>
    item.languages.includes(
      props.language as 'javascript' | 'typescript' | 'css',
    ),
  ),
)
const rules = ref('[\n  { "find": "oldName", "replace": "newName" }\n]')
const output = ref('')
const outputMode = ref<'preview' | 'source'>('preview')
const diagnostics = ref<string[]>([])
const changes = ref<TransformChange[]>([])
const elapsedMs = ref(0)
let controller: AbortController | undefined
const busy = ref(false)
const status = ref<
  'idle' | 'loading' | 'success' | 'unchanged' | 'error' | 'applied'
>('idle')
const showRawConfig = ref(false)
const isCdnPlugin = computed(() => pluginId.value.startsWith('css-'))
const showDetails = ref(false)
const renameFrom = ref('oldName')
const renameTo = ref('newName')
const isRename = computed(
  () =>
    !customEnabled.value &&
    !remoteEnabled.value &&
    pluginId.value === 'rename-symbols',
)
watch([renameFrom, renameTo], () => {
  if (isRename.value)
    rules.value = JSON.stringify(
      [{ find: renameFrom.value, replace: renameTo.value }],
      null,
      2,
    )
})
const dirty = ref(false)
const previewSource = ref('')
const previewRules = ref('')
const previewCustomCode = ref('')
const previewLanguage = ref<MonacoLanguage>()
const supported = computed(() => supportsTransform(props.language))
const changed = computed(() => output.value !== previewSource.value)
const additions = computed(() =>
  Math.max(
    0,
    output.value.split('\n').length - previewSource.value.split('\n').length,
  ),
)
const removals = computed(() =>
  Math.max(
    0,
    previewSource.value.split('\n').length - output.value.split('\n').length,
  ),
)
let generation = 0

async function loadExample() {
  remoteEnabled.value = false
  customEnabled.value = false
  pluginId.value = 'rename-symbols'
  if (props.language === 'css') {
    code.value =
      '.card { display: flex; user-select: none; color: rebeccapurple; }'
    renameFrom.value = 'color'
    renameTo.value = 'background-color'
    rules.value = JSON.stringify(
      [{ find: renameFrom.value, replace: renameTo.value }],
      null,
      2,
    )
  } else {
    code.value =
      'const oldName = 42;\\nconsole.log(oldName);\\nfunction read() { return oldName; }'.replaceAll(
        '\\n',
        '\n',
      )
    renameFrom.value = 'oldName'
    renameTo.value = 'newName'
    rules.value = JSON.stringify(
      [{ find: renameFrom.value, replace: renameTo.value }],
      null,
      2,
    )
  }
  await nextTick()
  await run()
}

async function run() {
  if (
    !supportsTransform(props.language) ||
    (!customEnabled.value &&
      !remoteEnabled.value &&
      (!plugin.value || !plugin.value.languages.includes(props.language)))
  )
    return
  const id = ++generation
  controller?.abort()
  controller = new AbortController()
  busy.value = true
  status.value = 'loading'
  diagnostics.value = []
  try {
    const result = customEnabled.value
      ? await runCustomTransformer(
          code.value,
          customCode.value,
          controller.signal,
        ).then((result) => ({
          ...result,
          changes: calculateChanges(code.value, result.output),
          elapsedMs: 0,
        }))
      : remoteEnabled.value
        ? await runRemoteBabel({
            source: code.value,
            language: props.language,
            signal: controller.signal,
          })
        : await executeTransform({
            pluginId: pluginId.value,
            source: code.value,
            language: props.language,
            config: rules.value,
            signal: controller.signal,
          })
    if (id !== generation) return
    output.value = result.output
    diagnostics.value = result.diagnostics
    changes.value = result.changes
    elapsedMs.value = result.elapsedMs
    previewSource.value = code.value
    previewRules.value = rules.value
    previewCustomCode.value = customCode.value
    previewLanguage.value = props.language
    dirty.value = result.diagnostics.length === 0
    status.value = result.diagnostics.length
      ? 'error'
      : result.output === code.value
        ? 'unchanged'
        : 'success'
  } catch (error) {
    if (id !== generation) return
    diagnostics.value = [error instanceof Error ? error.message : String(error)]
    dirty.value = false
    status.value = 'error'
  } finally {
    if (id === generation) busy.value = false
  }
}

function apply() {
  if (
    !dirty.value ||
    diagnostics.value.length ||
    code.value !== previewSource.value ||
    (customEnabled.value
      ? customCode.value !== previewCustomCode.value
      : rules.value !== previewRules.value) ||
    props.language !== previewLanguage.value
  )
    return
  code.value = output.value
  dirty.value = false
  status.value = 'applied'
}

watch(pluginId, () => {
  rules.value = plugin.value?.defaultConfig ?? '{}'
  showRawConfig.value = false
})
watch(
  [
    code,
    () => props.language,
    rules,
    pluginId,
    remoteEnabled,
    customEnabled,
    customCode,
  ],
  () => {
    generation++
    controller?.abort()
    changes.value = []
    dirty.value = false
    output.value = ''
    diagnostics.value = []
    busy.value = false
    status.value = 'idle'
  },
)
</script>

<template>
  <section
    class="transform-workspace"
    flex="~ col"
    min-h-0
    min-w-0
    overflow-hidden
    border-t
    border-base
  >
    <header
      class="transform-header"
      flex="~ col"
      gap2
      border-b
      border-base
      px3
      py2
    >
      <div flex="~ y-center wrap" gap2>
        <strong text-sm>Transform workspace</strong>
        <label flex="~ y-center" gap1 text-xs
          ><input
            v-model="customEnabled"
            type="checkbox"
            @change="remoteEnabled = false"
          />
          TypeScript transformer (CDN)</label
        >
        <label v-if="!customEnabled" flex="~ y-center" gap1 text-xs
          ><input v-model="remoteEnabled" type="checkbox" /> CDN Babel
          (experimental)</label
        >
        <select
          v-if="!remoteEnabled && !customEnabled"
          v-model="pluginId"
          aria-label="Transform plugin"
          border
          border-base
          rounded
          bg-base
          px2
          py1
          text-xs
        >
          <option
            v-for="item in availablePlugins"
            :key="item.id"
            :value="item.id"
          >
            {{ item.label }}
          </option>
        </select>
      </div>
      <div flex="~ y-center wrap" gap2>
        <button pill-button :disabled="!supported" @click="loadExample">
          Load example
        </button>
        <div flex-1 />
        <button
          pill-button
          :disabled="
            !supported ||
            (!customEnabled && !remoteEnabled && !plugin) ||
            (!customEnabled && remoteEnabled && language === 'css') ||
            busy
          "
          @click="run"
        >
          <span v-if="busy" i-ri:loader-4-line class="animate-spin" />
          {{ busy ? 'Running…' : 'Run transform' }}
        </button>
        <button
          pill-button
          :disabled="
            !dirty ||
            !changed ||
            diagnostics.length > 0 ||
            code !== previewSource ||
            (customEnabled
              ? customCode !== previewCustomCode
              : rules !== previewRules) ||
            language !== previewLanguage
          "
          @click="apply"
        >
          Apply
        </button>
        <button
          aria-label="Close transform workspace"
          nav-button
          @click="emit('close')"
        >
          <span i-ri:close-line />
        </button>
      </div>
    </header>
    <div
      v-if="status !== 'idle'"
      role="status"
      aria-live="polite"
      flex="~ y-center"
      gap2
      px3
      py1
      text-xs
      :class="status === 'error' ? 'text-red-500' : 'text-soft'"
    >
      <span
        v-if="status === 'loading'"
        i-ri:loader-4-line
        class="animate-spin"
      />
      <span v-else-if="status === 'error'" i-ri:error-warning-line />
      <span v-else i-ri:checkbox-circle-line />
      {{
        status === 'loading'
          ? 'Loading and running transform…'
          : status === 'success'
            ? `Transform ready · ${changes.length} changed region(s) · ${elapsedMs} ms`
            : status === 'unchanged'
              ? 'Transform completed · no changes'
              : status === 'applied'
                ? 'Changes applied to source'
                : 'Transform failed · see diagnostics below'
      }}
    </div>
    <p v-if="!supported" px3 py2 text-sm text-soft>
      Transform rules currently support JavaScript, TypeScript and CSS.
    </p>
    <div v-else class="transform-editors" min-h-0 min-w-0 flex-1>
      <div class="transform-editor-pane" flex="~ col" min-h-0 min-w-0>
        <div px3 py1 text-xs text-soft>
          {{
            customEnabled
              ? 'TypeScript transformer · npm imports via esm.sh'
              : remoteEnabled
                ? 'Babel via esm.sh · fixed version · runs in a worker'
                : `${plugin?.label} · Configuration (JSON)`
          }}
        </div>
        <CodeEditor
          v-if="customEnabled"
          v-model="customCode"
          language="typescript"
          min-h-0
          flex-1
        />
        <div v-if="isRename && !showRawConfig" flex="~ col" gap3 p3 text-xs>
          <label flex="~ col" gap1
            ><span text-soft>Find identifier / property</span
            ><input
              v-model="renameFrom"
              aria-label="Find name"
              border
              border-base
              rounded
              bg-base
              px2
              py2
          /></label>
          <label flex="~ col" gap1
            ><span text-soft>Replace with</span
            ><input
              v-model="renameTo"
              aria-label="Replacement name"
              border
              border-base
              rounded
              bg-base
              px2
              py2
          /></label>
          <button pill-button self-start @click="showRawConfig = true">
            <span i-ri:code-s-slash-line /> Advanced JSON
          </button>
        </div>
        <button
          v-if="isRename && showRawConfig"
          mx3
          pill-button
          self-start
          @click="showRawConfig = false"
        >
          Visual fields
        </button>
        <p v-if="isCdnPlugin && !customEnabled" p3 text-xs text-soft>
          Loads a pinned PostCSS transformer from esm.sh on demand. First run
          may take longer. CDN access and CSP permission required.
        </p>
        <CodeEditor
          v-if="
            !customEnabled &&
            !remoteEnabled &&
            !isCdnPlugin &&
            (!isRename || showRawConfig)
          "
          v-model="rules"
          language="json"
          min-h-0
          flex-1
        />
        <p v-else-if="remoteEnabled" p3 text-sm text-soft>
          Loads @babel/standalone on demand. React preset for JavaScript,
          TypeScript preset for TS. External code runs in a Worker, which is not
          a security sandbox. Requires CDN access and CSP permission.
        </p>
      </div>
      <div class="transform-editor-pane" flex="~ col" min-h-0 min-w-0>
        <div flex="~ y-center" justify-between gap2 px3 py1 text-xs text-soft>
          <span>{{
            outputMode === 'preview' ? 'Transformed output' : 'Original source'
          }}</span>
          <select
            v-model="outputMode"
            aria-label="Compare transform output"
            border
            border-base
            rounded
            bg-base
            px2
            py1
          >
            <option value="preview">Output</option>
            <option value="source">Before</option>
          </select>
        </div>
        <CodeEditor
          v-if="outputMode === 'preview'"
          v-model="output"
          :language="language"
          min-h-0
          flex-1
        />
        <CodeEditor
          v-else
          :model-value="previewSource"
          :language="language"
          min-h-0
          flex-1
        />
      </div>
    </div>
    <div
      v-if="dirty"
      flex="~ y-center wrap"
      gap3
      border-t
      border-base
      px3
      py2
      text-xs
    >
      <span
        >{{ changes.length }} changed region{{
          changes.length === 1 ? '' : 's'
        }}</span
      >
      <span>{{ elapsedMs }} ms</span>
      <span text-green-600>+{{ additions }} lines</span>
      <span text-red-600>-{{ removals }} lines</span>
    </div>
    <div
      v-if="changes.length && dirty"
      class="transform-details"
      border-t
      border-base
      px3
      py2
      text-xs
    >
      <details>
        <summary cursor-pointer>Inspect changed source ranges</summary>
        <div
          v-for="(change, index) in changes"
          :key="index"
          mt2
          flex="~ col"
          gap1
        >
          <span text-soft
            >Original offsets {{ change.beforeStart }}–{{ change.beforeEnd }} →
            output {{ change.afterStart }}–{{ change.afterEnd }}</span
          >
          <pre overflow-auto rounded bg-base p2 text-red-500>
- {{ change.removed }}</pre>
          <pre overflow-auto rounded bg-base p2 text-green-500>
+ {{ change.inserted }}</pre>
        </div>
      </details>
    </div>
    <div
      v-if="diagnostics.length"
      role="alert"
      px3
      py2
      text-sm
      text-red-600
      dark:text-red-400
    >
      <div v-for="(message, index) in diagnostics" :key="index">
        {{ message }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.transform-workspace {
  min-height: 0;
  max-width: 100%;
}
.transform-header {
  flex: 0 0 auto;
}
.transform-editor-pane {
  overflow: hidden;
}
.transform-editor-pane > :deep(.cm-editor) {
  min-height: 0;
  max-width: 100%;
}
.transform-details {
  max-height: 7rem;
  overflow-y: auto;
}

.transform-editors {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.transform-editors > div + div {
  border-left: 1px solid var(--c-border);
}
@media (max-width: 640px) {
  .transform-editors {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  }
  .transform-editors > div + div {
    border-left: 0;
    border-top: 1px solid var(--c-border);
  }
}
</style>
