/** Persist uploaded analysis filenames for the Intelligence documents table (dashboard). */
export const INTEL_DOCS_KEY = 'tt_intel_docs'

export type IntelDocEntry = {
  file: string
  type: string
  processedAt: string
  sentiment: 'bullish' | 'neutral' | 'bearish'
}

export function pushIntelDocUpload(fileName: string, typeLabel = 'Uploaded analysis') {
  try {
    const prev = JSON.parse(localStorage.getItem(INTEL_DOCS_KEY) || '[]') as IntelDocEntry[]
    const entry: IntelDocEntry = {
      file: fileName,
      type: typeLabel,
      processedAt: new Date().toISOString(),
      sentiment: 'neutral',
    }
    localStorage.setItem(INTEL_DOCS_KEY, JSON.stringify([entry, ...prev].slice(0, 25)))
  } catch {
    /* ignore quota / private mode */
  }
}

export function readIntelDocs(): IntelDocEntry[] {
  try {
    const raw = localStorage.getItem(INTEL_DOCS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as IntelDocEntry[]) : []
  } catch {
    return []
  }
}
