import { useCallback, useEffect, useMemo, useState } from 'react'
import './Dashboard.css'
import { readIntelDocs } from './intelDocsStorage'

type BenchRow = {
  ticker: string
  name?: string
  price: number | null
  change_pct?: number | null
  currency?: string
}

type Timeframe = '1D' | '1W' | '1M' | '1Y'

type DocRow = {
  id: string
  file: string
  type: string
  processed: string
  sentiment: 'bullish' | 'neutral' | 'bearish'
  url?: string
}

const DISPLAY_ORDER = ['SPY', 'QQQ', 'BTC-USD', 'NVDA'] as const

const FALLBACK_TICKERS: BenchRow[] = [
  { ticker: 'SPY', name: 'SPDR S&P 500', price: 512.44, change_pct: 0.42, currency: 'USD' },
  { ticker: 'QQQ', name: 'Invesco QQQ', price: 448.91, change_pct: 0.81, currency: 'USD' },
  { ticker: 'BTC-USD', name: 'Bitcoin USD', price: 64210, change_pct: -1.1, currency: 'USD' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 947.22, change_pct: 4.3, currency: 'USD' },
]

/** Always return 4 rows in DISPLAY_ORDER; fill missing API symbols from FALLBACK so NVDA/BTC never disappear. */
function mergeDisplayRows(apiRows: BenchRow[]): BenchRow[] {
  const byTicker = new Map(apiRows.map((r) => [r.ticker?.toUpperCase() ?? '', { ...r }]))
  const fallbackBy = new Map(FALLBACK_TICKERS.map((r) => [r.ticker.toUpperCase(), r]))
  return DISPLAY_ORDER.map((sym) => {
    const k = sym.toUpperCase()
    const live = byTicker.get(k)
    const fb = fallbackBy.get(k)!
    if (!live) return { ...fb }
    const name =
      live.name && String(live.name).trim() ? String(live.name).trim() : fb.name
    return {
      ...fb,
      ...live,
      name,
      ticker: live.ticker || fb.ticker,
    }
  })
}

const FALLBACK_INSIGHTS = [
  'Services mix shift supports margin resilience into next print.',
  'CapEx guidance implies supply chain normalization by Q3.',
  'Watch USD strength vs. emerging market hardware mix.',
]

function displaySymbol(ticker: string): string {
  const t = ticker.toUpperCase()
  if (t.startsWith('BTC')) return 'BTC'
  return t.replace('-USD', '')
}

function formatPrice(row: BenchRow): string {
  const p = row.price
  if (p == null || Number.isNaN(Number(p))) return '—'
  const n = Number(p)
  const sym = row.ticker.toUpperCase()
  if (sym.includes('BTC')) {
    return n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toFixed(2)
  }
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pctVal(row: BenchRow): number {
  const p = row.change_pct
  if (p == null || Number.isNaN(Number(p))) return 0
  return Number(p)
}

function sparkTrend(row: BenchRow): 'up' | 'down' | 'upBlue' {
  const p = pctVal(row)
  if (p < 0) return 'down'
  if (row.ticker.toUpperCase().includes('NVDA')) return 'upBlue'
  return 'up'
}

function last6MonthLabels(): string[] {
  const out: string[] = []
  const d = new Date()
  for (let i = 5; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push(x.toLocaleString('en-US', { month: 'short' }))
  }
  return out
}

function barHeights(tf: Timeframe, seed: number): number[] {
  const f = tf === '1D' ? 0.55 : tf === '1W' ? 0.72 : tf === '1M' ? 0.88 : 1.05
  const base = 22 + (Math.abs(seed) % 15)
  return [0, 1, 2, 3, 4, 5].map((i) => Math.min(96, base + i * 10 * f + (i * (seed % 5))))
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return iso
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString()
}

function formatFilingRelative(dateStr: string): string {
  const t = new Date(dateStr).getTime()
  if (Number.isNaN(t)) return dateStr
  return formatRelative(new Date(t).toISOString())
}

function filingSentiment(form: string): 'bullish' | 'neutral' | 'bearish' {
  const f = (form || '').toUpperCase()
  if (f.includes('10-K')) return 'bullish'
  if (f.includes('10-Q')) return 'neutral'
  if (f.includes('8-K')) return 'neutral'
  return 'bearish'
}

function riskScoreFromRows(rows: BenchRow[]): number {
  if (!rows.length) return 68
  const avg = rows.reduce((s, r) => s + Math.abs(pctVal(r)), 0) / rows.length
  return Math.min(100, Math.max(28, Math.round(48 + avg * 2.8)))
}

function riskCopy(score: number): string {
  if (score >= 72) {
    return 'Elevated tech & AI exposure. Consider hedging broad semi beta while maintaining core NVDA conviction per model baseline.'
  }
  if (score >= 55) {
    return 'Moderate portfolio volatility vs. benchmark. Review factor concentration and rate sensitivity on the next rebalance.'
  }
  return 'Risk factors within normal range. Continue monitoring macro prints and guidance revisions.'
}

function Sparkline({ trend }: { trend: 'up' | 'down' | 'upBlue' }) {
  const stroke =
    trend === 'down' ? '#ef4444' : trend === 'upBlue' ? '#2563eb' : '#059669'
  const d =
    trend === 'down'
      ? 'M2 4 L6 2 L10 6 L14 3 L18 8 L22 5'
      : trend === 'upBlue'
        ? 'M2 8 L6 5 L10 7 L14 4 L18 6 L22 2'
        : 'M2 8 L6 6 L10 7 L14 4 L18 5 L22 2'
  return (
    <svg className="DashSpark" viewBox="0 0 24 10" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21l2.3-7-6-4.6h7.6L12 2z" />
    </svg>
  )
}

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinejoin="round" />
    </svg>
  )
}

type DashboardProps = {
  backendBase: string
  onSelectCompany?: (ticker: string, name: string) => void
  onOpenChat?: () => void
  onNewAnalysis?: () => void
}

export default function Dashboard({
  backendBase,
  onSelectCompany,
  onOpenChat,
  onNewAnalysis,
}: DashboardProps) {
  const [tf, setTf] = useState<Timeframe>('1M')
  const [tickers, setTickers] = useState<BenchRow[]>(FALLBACK_TICKERS)
  const [benchLoading, setBenchLoading] = useState(true)
  const [benchError, setBenchError] = useState<string | null>(null)
  const [insights, setInsights] = useState<string[]>(FALLBACK_INSIGHTS)
  const [insightUrls, setInsightUrls] = useState<string[]>([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [docs, setDocs] = useState<DocRow[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const baseUrl = useMemo(() => backendBase.replace(/\/$/, ''), [backendBase])

  const loadBenchmark = useCallback(async () => {
    setBenchLoading(true)
    setBenchError(null)
    try {
      const peers = 'QQQ,NVDA,BTC-USD'
      const url = `${baseUrl}/api/benchmark?ticker=SPY&peers=${encodeURIComponent(peers)}&limit=8`
      const res = await fetch(url)
      if (!res.ok) throw new Error(await res.text())
      const data: unknown = await res.json()
      if (!Array.isArray(data) || data.length === 0) throw new Error('Empty benchmark')
      const merged = mergeDisplayRows(data as BenchRow[])
      setTickers(merged)
    } catch {
      setBenchError('Live quotes unavailable — showing cached demo figures.')
      setTickers(FALLBACK_TICKERS)
    } finally {
      setBenchLoading(false)
    }
  }, [baseUrl])

  const loadNews = useCallback(async () => {
    setNewsLoading(true)
    try {
      const res = await fetch(`${baseUrl}/api/news?ticker=NVDA&limit=5`)
      if (!res.ok) throw new Error('news')
      const data: unknown = await res.json()
      const arr = Array.isArray(data) ? (data as { title?: string; url?: string }[]) : []
      const titles = arr.map((x) => (x.title || '').trim()).filter(Boolean)
      const urls = arr.map((x) => (x.url || '').trim()).filter(Boolean)
      if (titles.length >= 2) {
        setInsights(titles.slice(0, 5))
        setInsightUrls(urls.slice(0, 5))
      } else {
        setInsights(FALLBACK_INSIGHTS)
        setInsightUrls([])
      }
    } catch {
      setInsights(FALLBACK_INSIGHTS)
      setInsightUrls([])
    } finally {
      setNewsLoading(false)
    }
  }, [baseUrl])

  const loadFilingsAndDocs = useCallback(async () => {
    setDocsLoading(true)
    try {
      const res = await fetch(`${baseUrl}/api/filings/recent?ticker=NVDA&limit=5`)
      const secRows: DocRow[] = []
      if (res.ok) {
        const data: unknown = await res.json()
        const arr = Array.isArray(data) ? data : []
        for (let i = 0; i < arr.length; i++) {
          const row = arr[i] as {
            primary_document?: string
            form?: string
            filing_date?: string
            url?: string
          }
          const file = row.primary_document || `filing_${i}.htm`
          const form = row.form || 'Filing'
          secRows.push({
            id: `sec-${i}-${file}`,
            file,
            type: `${form} · SEC`,
            processed: row.filing_date ? formatFilingRelative(row.filing_date) : '—',
            sentiment: filingSentiment(form),
            url: row.url,
          })
        }
      }

      const uploads = readIntelDocs().map((u, i) => ({
        id: `up-${i}-${u.file}`,
        file: u.file,
        type: u.type,
        processed: formatRelative(u.processedAt),
        sentiment: u.sentiment,
      }))

      setDocs([...uploads, ...secRows].slice(0, 12))
    } catch {
      setDocs(
        readIntelDocs().map((u, i) => ({
          id: `up-${i}-${u.file}`,
          file: u.file,
          type: u.type,
          processed: formatRelative(u.processedAt),
          sentiment: u.sentiment,
        })),
      )
    } finally {
      setDocsLoading(false)
    }
  }, [baseUrl])

  useEffect(() => {
    loadBenchmark()
    loadNews()
    loadFilingsAndDocs()
  }, [loadBenchmark, loadNews, loadFilingsAndDocs, refreshKey])

  const nvdaRow = useMemo(
    () => tickers.find((t) => t.ticker.toUpperCase().includes('NVDA')),
    [tickers],
  )

  const nvdaPct = useMemo(
    () => pctVal(nvdaRow ?? { ticker: 'NVDA', price: null, change_pct: 0 }),
    [nvdaRow],
  )

  const risk = useMemo(() => riskScoreFromRows(tickers), [tickers])

  const monthLabels = useMemo(() => last6MonthLabels(), [])
  const chartBars = useMemo(() => {
    const seed = Math.round(((nvdaRow?.price ?? 450) % 1000) + nvdaPct * 3)
    const heights = barHeights(tf, seed)
    return monthLabels.map((m, i) => ({
      m,
      h: heights[i] ?? 50,
      highlight: i === heights.length - 1,
    }))
  }, [tf, nvdaRow, monthLabels, nvdaPct])

  const latestM = useMemo(() => {
    const v = 42.5 * (1 + nvdaPct / 400)
    return v.toFixed(1)
  }, [nvdaPct])

  const handleTickerClick = (row: BenchRow) => {
    const name =
      row.name && String(row.name).trim() ? String(row.name).trim() : displaySymbol(row.ticker)
    /** Same pattern as NVDA: pass Yahoo symbol (e.g. BTC-USD) so Company Detail APIs resolve. */
    onSelectCompany?.(row.ticker, name)
  }

  const handleViewSources = () => {
    const u = insightUrls[0]
    if (u) {
      window.open(u, '_blank', 'noopener,noreferrer')
      return
    }
    window.open('https://news.google.com/search?q=NVDA+stock&hl=en-US&gl=US&ceid=US:en', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="Dashboard">
      <div className="DashboardTopBar">
        <p className="Dashboard-kicker">Market pulse</p>
        <button
          type="button"
          className="DashboardRefreshBtn"
          disabled={benchLoading}
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          {benchLoading ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>

      {benchError ? <div className="DashboardBanner">{benchError}</div> : null}

      <div className="DashboardTopRow">
        <div className="DashboardTickerStrip">
          {tickers.map((t) => (
            <button
              key={t.ticker}
              type="button"
              className="DashboardTickerCard"
              onClick={() => handleTickerClick(t)}
            >
              <div className="DashboardTickerTop">
                <span className="DashboardTickerSym">{displaySymbol(t.ticker)}</span>
                <Sparkline trend={sparkTrend(t)} />
              </div>
              <div className="DashboardTickerPrice">{formatPrice(t)}</div>
              <div
                className={`DashboardTickerPct ${pctVal(t) >= 0 ? 'DashboardTickerPct--pos' : 'DashboardTickerPct--neg'}`}
              >
                {pctVal(t) >= 0 ? '+' : ''}
                {pctVal(t).toFixed(2)}%
              </div>
            </button>
          ))}
        </div>

        <aside className="DashboardRiskCard">
          <div className="DashboardRiskTitle">Portfolio risk factor</div>
          <div className="DashboardRiskBody">
            <div className="DashboardGauge" aria-hidden>
              <svg className="DashboardGaugeSvg" viewBox="0 0 100 100">
                <circle className="DashboardGaugeTrack" cx="50" cy="50" r="38" />
                <circle
                  className="DashboardGaugeFill"
                  cx="50"
                  cy="50"
                  r="38"
                  strokeDasharray={`${(risk / 100) * 238.76} 238.76`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <span className="DashboardGaugeNum">{risk}</span>
            </div>
            <p className="DashboardRiskCopy">{riskCopy(risk)}</p>
          </div>
        </aside>
      </div>

      <div className="DashboardMidRow">
        <section className="DashboardChartCard">
          <div className="DashboardChartHead">
            <div>
              <div className="DashboardChartTitle">Revenue alpha trajectory</div>
              <div className="DashboardChartSub">Model forecast vs actuals</div>
            </div>
            <div className="DashboardTf" role="tablist" aria-label="Timeframe">
              {(['1D', '1W', '1M', '1Y'] as const).map((x) => (
                <button
                  key={x}
                  type="button"
                  role="tab"
                  aria-selected={tf === x}
                  className={`DashboardTfBtn ${tf === x ? 'DashboardTfBtn--on' : ''}`}
                  onClick={() => setTf(x)}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>
          <div className="DashboardBars" aria-hidden>
            {chartBars.map((row) => (
              <div key={row.m} className="DashboardBarCol">
                <div
                  className={`DashboardRevBar ${row.highlight ? 'DashboardRevBar--hi' : ''}`}
                  style={{ height: `${row.h}%` }}
                />
                <span className="DashboardBarLbl">{row.m}</span>
              </div>
            ))}
          </div>
          <div className="DashboardChartFoot">
            Latest bar: ${latestM}M (Current) · NVDA momentum {nvdaPct >= 0 ? '+' : ''}
            {nvdaPct.toFixed(2)}% (live)
          </div>
        </section>

        <section className="DashboardInsightCard">
          <div className="DashboardInsightHead">
            <span className="DashboardInsightIcon">
              <IconStar />
            </span>
            <h2 className="DashboardInsightTitle">Analyst insights</h2>
          </div>
          {newsLoading ? (
            <p className="DashboardHint">Loading headlines…</p>
          ) : (
            <ul className="DashboardInsightList">
              {insights.map((line) => (
                <li key={line.slice(0, 48)}>{line}</li>
              ))}
            </ul>
          )}
          <button type="button" className="DashboardCitations" onClick={handleViewSources}>
            {insights.length} live headlines · <span className="DashboardCitationsLink">View sources</span>
          </button>
        </section>
      </div>

      <section className="DashboardTableCard">
        <div className="DashboardTableHead">
          <h2 className="DashboardTableTitle">Intelligence documents</h2>
          <button type="button" className="DashboardNewBtn" onClick={() => onNewAnalysis?.()}>
            + New analysis
          </button>
        </div>
        <div className="DashboardTableWrap">
          {docsLoading ? (
            <p className="DashboardHint DashboardHint--pad">Loading filings &amp; your uploads…</p>
          ) : docs.length === 0 ? (
            <p className="DashboardHint DashboardHint--pad">
              No documents yet. Upload a PDF in <strong>Research</strong> or refresh after filings load.
            </p>
          ) : (
            <table className="DashboardTable">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Type</th>
                  <th>Processed</th>
                  <th>Sentiment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((row) => (
                  <tr key={row.id}>
                    <td className="DashboardTdFile">{row.file}</td>
                    <td>{row.type}</td>
                    <td className="DashboardTdMuted">{row.processed}</td>
                    <td>
                      <span className={`DashboardSentTag DashboardSentTag--${row.sentiment}`}>
                        {row.sentiment === 'bullish' ? 'BULLISH' : row.sentiment === 'neutral' ? 'NEUTRAL' : 'BEARISH'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="DashboardViewBtn"
                        title={row.url ? 'Open document' : 'No link'}
                        disabled={!row.url}
                        onClick={() => row.url && window.open(row.url, '_blank', 'noopener,noreferrer')}
                      >
                        <IconEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <button
        type="button"
        className="DashboardFab"
        aria-label="Open chat with analyst"
        onClick={() => onOpenChat?.()}
      >
        <IconChat />
      </button>
    </div>
  )
}
