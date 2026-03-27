/** Client-side config (VITE_* env). Never commit real keys in .env to git. */
export const CONFIG = {
  anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY ?? '',
  anthropicModel: import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  /** When set, used on non-localhost hosts instead of direct api.anthropic.com (CORS caveat). */
  anthropicApiBase: import.meta.env.VITE_ANTHROPIC_API_BASE ?? '',
  apiNinjasKey: import.meta.env.VITE_API_NINJAS_KEY ?? '',
  secBaseUrl: 'https://www.sec.gov',
  secDataBaseUrl: 'https://data.sec.gov',
  /** Polite delay between repeated SEC proxy calls if you batch (ms). */
  secRateLimitMs: 120,
} as const

export function getAnthropicBaseURL(): string {
  if (typeof window === 'undefined') {
    return CONFIG.anthropicApiBase || 'https://api.anthropic.com'
  }
  const h = window.location.hostname
  if (h === 'localhost' || h === '127.0.0.1') {
    return `${window.location.origin}/api/anthropic`
  }
  return CONFIG.anthropicApiBase || 'https://api.anthropic.com'
}

export function hasAnthropicKey(): boolean {
  return CONFIG.anthropicApiKey.length > 0
}
