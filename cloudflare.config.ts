import { defineConfig } from 'cf/config'
export default defineConfig({
  worker: {
    name: process.env.AST_PR_NUMBER ? `ast-pr-${process.env.AST_PR_NUMBER}` : 'ast-explorer',
    compatibilityDate: '2026-11-20',
  },
})
