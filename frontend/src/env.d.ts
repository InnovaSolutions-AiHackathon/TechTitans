/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANTHROPIC_API_KEY: string
  readonly VITE_ANTHROPIC_MODEL: string
  readonly VITE_ANTHROPIC_API_BASE: string
  readonly VITE_API_NINJAS_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
