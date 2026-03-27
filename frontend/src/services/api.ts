import Anthropic from '@anthropic-ai/sdk'
import { CONFIG, getAnthropicBaseURL, hasAnthropicKey } from '../config'
import type {
  CompanyOverview,
  EarningsIntelligence,
  FullAnalysisResult,
  KPIData,
  OverviewAndFilingsPayload,
  PeerBenchmarkRow,
  QuoteData,
  RedFlagItem,
  SECFiling,
  SemanticSearchResult,
} from '../types'

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!hasAnthropicKey()) {
    throw new Error('VITE_ANTHROPIC_API_KEY is not set. Add it to .env and restart the dev server.')
  }
  if (!_client) {
    _client = new Anthropic({
      apiKey: CONFIG.anthropicApiKey,
      baseURL: getAnthropicBaseURL(),
      dangerouslyAllowBrowser: true,
    })
  }
  return _client
}

export function extractAssistantText(
  content: Anthropic.Messages.Message['content'],
): string {
  return content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
}

export function parseFirstJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1]!.trim() : trimmed
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end < start) return null
  try {
    return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseMs = 500): Promise<T> {
  let last: unknown
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, baseMs * Math.pow(2, i)))
      }
    }
  }
  throw last
}

async function claudeComplete(system: string, user: string, maxTokens = 4096): Promise<string> {
  const client = getClient()
  const res = await client.messages.create({
    model: CONFIG.anthropicModel,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
  return extractAssistantText(res.content)
}

function defaultOverview(symbol: string): CompanyOverview {
  const s = symbol.toUpperCase()
  return {
    companyName: s,
    symbol: s,
    sector: '—',
    industry: '—',
    description: '—',
    employees: null,
    headquarters: '—',
    website: '',
    marketCapUsd: null,
    revenueUsd: null,
    netIncomeUsd: null,
    fiscalYearEnd: '—',
    ceo: '—',
    exchange: '—',
  }
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  return null
}

function str(v: unknown, fb = ''): string {
  return typeof v === 'string' ? v : fb
}

function mapOverview(raw: Record<string, unknown>, symbol: string): CompanyOverview {
  const d = defaultOverview(symbol)
  return {
    companyName: str(raw.companyName, d.companyName),
    symbol: str(raw.symbol, d.symbol).toUpperCase(),
    sector: str(raw.sector, d.sector),
    industry: str(raw.industry, d.industry),
    description: str(raw.description, d.description),
    employees: num(raw.employees),
    headquarters: str(raw.headquarters, d.headquarters),
    website: str(raw.website, d.website),
    marketCapUsd: num(raw.marketCapUsd),
    revenueUsd: num(raw.revenueUsd),
    netIncomeUsd: num(raw.netIncomeUsd),
    fiscalYearEnd: str(raw.fiscalYearEnd, d.fiscalYearEnd),
    ceo: str(raw.ceo, d.ceo),
    exchange: str(raw.exchange, d.exchange),
  }
}

function mapFiling(x: unknown): SECFiling | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const form = str(o.form)
  const filedAt = str(o.filedAt || o.filed)
  const url = str(o.url)
  if (!form || !url) return null
  return {
    form,
    filedAt: filedAt || '—',
    description: str(o.description, form),
    url,
  }
}

async function fallbackQuoteViaClaude(symbol: string): Promise<QuoteData> {
  const sys =
    'Reply with a single JSON object only: {"price":number,"change":number,"changePercent":number,"currency":"USD"}. Use best-effort public knowledge for last close; if unknown use null for numbers.'
  const text = await withRetry(() => claudeComplete(sys, `Ticker: ${symbol.toUpperCase()}`, 512))
  const j = parseFirstJsonObject(text)
  return {
    symbol: symbol.toUpperCase(),
    price: j ? num(j.price) : null,
    change: j ? num(j.change) : null,
    changePercent: j ? num(j.changePercent) : null,
    currency: j && typeof j.currency === 'string' ? j.currency : 'USD',
    sparkline: undefined,
  }
}

export async function fetchQuote(symbol: string): Promise<QuoteData> {
  const sym = symbol.toUpperCase().trim()
  try {
    const url = `/api/yahoo2/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`yahoo ${res.status}`)
    const j = (await res.json()) as {
      chart?: { result?: Array<{
        meta?: {
          symbol?: string
          currency?: string
          regularMarketPrice?: number
          chartPreviousClose?: number
          previousClose?: number
        }
        indicators?: { quote?: Array<{ close?: Array<number | null> }> }
      }> }
    }
    const r = j.chart?.result?.[0]
    if (!r?.meta) throw new Error('no chart meta')
    const meta = r.meta
    const closes =
      r.indicators?.quote?.[0]?.close?.filter((c): c is number => typeof c === 'number' && !Number.isNaN(c)) ?? []
    const last =
      closes.length > 0 ? closes[closes.length - 1]! : (meta.regularMarketPrice ?? null)
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? last
    const change = last != null && prev != null ? last - prev : null
    const changePercent =
      last != null && prev != null && prev !== 0 ? ((last - prev) / prev) * 100 : null
    return {
      symbol: meta.symbol ?? sym,
      price: last,
      change,
      changePercent,
      currency: meta.currency ?? 'USD',
      marketState: 'REGULAR',
      sparkline: closes.slice(-30),
    }
  } catch {
    if (!hasAnthropicKey()) {
      return {
        symbol: sym,
        price: null,
        change: null,
        changePercent: null,
        currency: 'USD',
      }
    }
    return fallbackQuoteViaClaude(sym)
  }
}

export async function fetchCompanyLogo(symbol: string): Promise<string | null> {
  const key = CONFIG.apiNinjasKey
  if (!key) return null
  try {
    const q = encodeURIComponent(symbol.toUpperCase())
    const res = await fetch(`/api/ninjas/v1/logo?ticker=${q}`, { headers: { 'X-Api-Key': key } })
    if (!res.ok) return null
    const j = (await res.json()) as { image?: string }
    return typeof j.image === 'string' ? j.image : null
  } catch {
    return null
  }
}

export async function fetchOverviewAndFilings(symbol: string): Promise<OverviewAndFilingsPayload> {
  const sym = symbol.toUpperCase().trim()
  if (!hasAnthropicKey()) {
    return { overview: defaultOverview(sym), filings: [] }
  }
  const sys = `You are a financial data assistant. Output ONE JSON object only (no markdown fences) with this shape:
{"overview":{...},"filings":[...]}
overview fields: companyName,symbol,sector,industry,description,employees (number|null),headquarters,website,marketCapUsd,revenueUsd,netIncomeUsd,fiscalYearEnd,ceo,exchange
filings: array of {form,filedAt,description,url} for recent 10-K,10-Q,8-K if plausible; urls should start with https://www.sec.gov/ when possible. Use best-effort public knowledge for ${sym}.`

  const text = await withRetry(() => claudeComplete(sys, `Ticker: ${sym}`, 8192))
  const root = parseFirstJsonObject(text) ?? {}
  const ovRaw = root.overview
  const overview =
    ovRaw && typeof ovRaw === 'object'
      ? mapOverview(ovRaw as Record<string, unknown>, sym)
      : defaultOverview(sym)
  overview.symbol = sym
  const filingsRaw = root.filings
  const filings: SECFiling[] = []
  if (Array.isArray(filingsRaw)) {
    for (const f of filingsRaw) {
      const m = mapFiling(f)
      if (m) filings.push(m)
    }
  }
  return { overview, filings }
}

export function buildKPIData(_symbol: string, overview: CompanyOverview): KPIData {
  const revenue = overview.revenueUsd
  const net = overview.netIncomeUsd
  const margin =
    revenue != null && revenue !== 0 && net != null ? (net / revenue) * 100 : null
  return {
    revenue,
    revenueGrowthPct: null,
    netMarginPct: margin,
    roePct: null,
    debtToEquity: null,
    freeCashFlowUsd: null,
    eps: null,
    peRatio: null,
  }
}

function mapRedFlag(x: unknown): RedFlagItem | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const sev = str(o.severity, 'medium').toLowerCase()
  const severity =
    sev === 'high' || sev === 'low' ? (sev as RedFlagItem['severity']) : 'medium'
  const title = str(o.title)
  const detail = str(o.detail, str(o.description))
  if (!title) return null
  return { severity, title, detail: detail || title }
}

function mapPeer(x: unknown): PeerBenchmarkRow | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const ticker = str(o.ticker).toUpperCase()
  if (!ticker) return null
  return {
    ticker,
    name: str(o.name, ticker),
    metric: str(o.metric, '—'),
    vsSubject: str(o.vsSubject, str(o.note, '—')),
  }
}

function defaultEarnings(): EarningsIntelligence {
  return {
    sentiment: 'neutral',
    guidanceSummary: '—',
    themes: [],
    signals: [],
  }
}

export async function analyzeCompanyFull(
  symbol: string,
  overview: CompanyOverview,
  kpis: KPIData,
): Promise<FullAnalysisResult> {
  if (!hasAnthropicKey()) {
    return {
      analysis: 'Set VITE_ANTHROPIC_API_KEY in .env to enable AI analysis.',
      redFlags: [],
      earnings: defaultEarnings(),
      peers: [],
    }
  }
  const sys = `You are an equity research assistant. Reply with ONE JSON object only (no markdown):
{"analysis":"markdown string narrative","redFlags":[{"severity":"low|medium|high","title":"","detail":""}],"earnings":{"sentiment":"positive|neutral|negative|mixed","guidanceSummary":"","themes":[],"signals":[]},"peers":[{"ticker":"","name":"","metric":"","vsSubject":""}]}
Base insights on the provided facts; flag uncertainty.`

  const payload = JSON.stringify({ symbol, overview, kpis })
  const text = await withRetry(() => claudeComplete(sys, payload, 8192))
  const j = parseFirstJsonObject(text) ?? {}
  const analysis = str(j.analysis, '—')
  const redFlags: RedFlagItem[] = []
  if (Array.isArray(j.redFlags)) {
    for (const r of j.redFlags) {
      const m = mapRedFlag(r)
      if (m) redFlags.push(m)
    }
  }
  let earnings = defaultEarnings()
  if (j.earnings && typeof j.earnings === 'object') {
    const e = j.earnings as Record<string, unknown>
    const sent = str(e.sentiment, 'neutral').toLowerCase()
    earnings = {
      sentiment:
        sent === 'positive' || sent === 'negative' || sent === 'mixed' ? sent : 'neutral',
      guidanceSummary: str(e.guidanceSummary, '—'),
      themes: Array.isArray(e.themes) ? e.themes.filter((t): t is string => typeof t === 'string') : [],
      signals: Array.isArray(e.signals)
        ? e.signals.filter((t): t is string => typeof t === 'string')
        : [],
    }
  }
  const peers: PeerBenchmarkRow[] = []
  if (Array.isArray(j.peers)) {
    for (const p of j.peers) {
      const m = mapPeer(p)
      if (m) peers.push(m)
    }
  }
  return { analysis, redFlags, earnings, peers }
}

export async function semanticSearch(
  query: string,
  symbol: string,
  overview: CompanyOverview,
): Promise<SemanticSearchResult> {
  if (!hasAnthropicKey()) {
    return { answer: 'API key not configured.', citations: [], confidence: 0 }
  }
  const sys = `Answer using the company context. Reply with ONE JSON only:
{"answer":"","citations":[],"confidence":0.0}
citations: short strings (sources or reasoning notes). confidence 0-1.`

  const user = JSON.stringify({ query, symbol: symbol.toUpperCase(), overview })
  const text = await withRetry(() => claudeComplete(sys, user, 2048))
  const j = parseFirstJsonObject(text) ?? {}
  return {
    answer: str(j.answer, '—'),
    citations: Array.isArray(j.citations)
      ? j.citations.filter((c): c is string => typeof c === 'string')
      : [],
    confidence: num(j.confidence) ?? 0.5,
  }
}

export async function modelingCopilotPrompt(
  symbol: string,
  overview: CompanyOverview,
  kpis: KPIData,
  userPrompt: string,
): Promise<string> {
  if (!hasAnthropicKey()) return 'Configure VITE_ANTHROPIC_API_KEY first.'
  const sys =
    'You are a financial modeling copilot. Give concise, structured guidance (assumptions, formulas, sanity checks). Plain text or light markdown, no JSON.'
  const body = JSON.stringify({ symbol, overview, kpis, userPrompt })
  return withRetry(() => claudeComplete(sys, body, 4096))
}
