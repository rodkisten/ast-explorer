/// <reference lib="webworker" />

import { setupTypeAcquisition } from '@typescript/ata'
import ts from 'typescript'

interface TypeLibrary { filename: string; content: string }
interface TypeRequest { id: number; source: string }

const logger = {
  log: () => undefined,
  error: () => undefined,
  groupCollapsed: () => undefined,
  groupEnd: () => undefined,
}

addEventListener('message', (event: MessageEvent<TypeRequest>) => {
  const { id, source } = event.data
  const libraries: TypeLibrary[] = []
  let completed = false
  const finish = (error?: string) => {
    if (completed) return
    completed = true
    clearTimeout(timeout)
    postMessage({ id, libraries, error })
  }
  const timeout = setTimeout(() => finish('Type acquisition timed out'), 20000)
  try {
    const acquire = setupTypeAcquisition({
      projectName: 'AST Explorer transformers',
      typescript: ts,
      logger,
      delegate: {
        receivedFile: (content: string, filename: string) => {
          if (!completed) libraries.push({ filename, content })
        },
        started: () => undefined,
        progress: () => undefined,
        finished: () => finish(),
      },
    })
    void acquire(source).catch((error: unknown) =>
      finish(error instanceof Error ? error.message : String(error)),
    )
  } catch (error) {
    finish(error instanceof Error ? error.message : String(error))
  }
})
