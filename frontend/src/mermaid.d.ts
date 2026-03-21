declare module 'mermaid' {
  type MermaidInitOptions = {
    startOnLoad?: boolean
    [key: string]: unknown
  }

  type MermaidRunOptions = {
    querySelector?: string
    [key: string]: unknown
  }

  const mermaid: {
    initialize: (options?: MermaidInitOptions) => void
    run: (options?: MermaidRunOptions) => Promise<void>
  }
  export default mermaid
}

