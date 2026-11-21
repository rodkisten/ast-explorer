import { useLocalStorage } from '@vueuse/core'
import { STORAGE_PREFIX } from '~/state/constants'
import type { EditorProvider } from '~/editor/adapter'

export const editorProvider = useLocalStorage<EditorProvider>(
  `${STORAGE_PREFIX}editor-provider`,
  'monaco',
)
