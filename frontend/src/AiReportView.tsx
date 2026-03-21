import { useCallback, useEffect, useMemo, useState } from 'react'
import './AiReportView.css'

type BenchRow = {
  ticker: string
  name?: string
  price: number
  change_pct?: number
  market_cap?: number
  pe_ratio?: number
}

function formatUsd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function formatCap(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return formatUsd(n)
}

function pctStr(p?: number) {
  if (p == null || Number.isNaN(p)) return '—'
  const sign = p >= 0 ? '+' : ''
  return `${sign}${p.toFixed(2)}%`
}

function benchmarkTicker(raw: string): string {
  const t = raw.trim().toUpperCase()
  if (!t) return 'SPY'
  if (t === 'BTC') return 'BTC-USD'
  return t
}

function peerCsvFor(primary: string): string {
  const t = primary.toUpperCase().replace('-USD', '')
  if (t === 'BTC' || primary.includes('BTC')) return 'COIN,MSTR'
  const semis = new Set(['NVDA', 'AMD', 'INTC', 'AVGO', 'QCOM', 'MRVL', 'TXN', 'LRCX', 'KLAC'])
  if (semis.has(t)) return 'AMD,INTC,QCOM'
  return 'MSFT,GOOGL'
}

function rowKey(ticker: string): string {
  return ticker.toUpperCase().replace('-USD', '')
}

/** First paragraph of markdown-ish text for quote blocks */
function firstPlainParagraph(text: string | null | undefined, maxLen = 320): string {
  if (!text?.trim()) return ''
  const t = text
    .replace(/\r/g, '')
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .trim()
  const block = t.split(/\n\n+/).find((p) => p.trim().length > 0) ?? t
  const oneLine = block.replace(/\n/g, ' ').trim()
  return oneLine.length > maxLen ? `${oneLine.slice(0, maxLen)}…` : oneLine
}

/** Bullet lines from markdown lists */
function bulletLinesFromReport(text: string | null | undefined, max = 3): string[] {
  if (!text?.trim()) return []
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const bullets = lines.filter((l) => /^[-*•]\s/.test(l) || /^\d+\.\s/.test(l))
  const cleaned = bullets.map((l) => l.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
  if (cleaned.length > 0) return cleaned.slice(0, max)
  return lines
    .filter((l) => l.length > 12 && !l.startsWith('#'))
    .slice(0, max)
}

/** Sentiment badge from daily change % */
function sentimentFromChange(change?: number): 'high' | 'med' | 'low' {
  if (change == null || Number.isNaN(change)) return 'med'
  if (change >= 0.35) return 'high'
  if (change <= -0.35) return 'low'
  return 'med'
}

/** Market-cap share % across peer rows (sums to ~100) */
function peerSharePercentages(rows: BenchRow[]): number[] {
  if (rows.length === 0) return []
  const mcaps = rows.map((r) => Math.max(r.market_cap ?? 0, 1))
  const sum = mcaps.reduce((a, b) => a + b, 0)
  if (sum <= 0) return rows.map(() => Math.round(100 / Math.max(rows.length, 1)))
  return mcaps.map((m) => Math.round((m / sum) * 100))
}

/** Illustrative net-margin proxy from P/E when filing doesn't provide margin */
function marginProxyFromPe(pe?: number): number {
  if (pe == null || pe <= 0 || Number.isNaN(pe) || pe > 800) return 14
  return Math.round(Math.max(6, Math.min(42, 72 / Math.sqrt(pe / 12))))
}

/** Risk bar heights from |daily change| (visual only) */
function riskHeightsFromPeers(rows: BenchRow[]): number[] {
  if (rows.length === 0) return [45, 55, 60, 50, 48]
  return rows.slice(0, 5).map((r) => {
    const x = Math.abs(r.change_pct ?? 0)
    return Math.min(92, Math.max(28, 35 + x * 12))
  })
}

/** Simple “risk score” 0–10 from volatility of primary */
function riskScoreFromChange(change?: number): number {
  const c = Math.abs(change ?? 0)
  return Math.min(9.9, Math.max(3.5, 5.2 + c * 0.35))
}

function openAiReportPrint(titleName: string, titleTicker: string) {
  const el = document.getElementById('ai-report-print-root')
  if (!el) return
  const w = window.open('', '_blank', 'width=900,height=1200')
  if (!w) return
  const safe = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  w.document.write(
    `<!DOCTYPE html><html><head><title>AI Report — ${safe(titleName)} (${safe(titleTicker)})</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a;max-width:900px;margin:0 auto}</style>
    </head><body>${el.innerHTML}</body></html>`,
  )
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
}

/** Optional panels from Research → upload + run features (same source as sidebar cards). */
export type AiReportResearchPanels = {
  f1?: string | null
  f2?: string | null
  f3?: string | null
  f4?: string | null
  f5?: string | null
  f6?: string | null
}

type Props = {
  backendBase: string
  /** When set, shows KPI/Macro/Modeling/Risk text from the last research run. */
  reports?: AiReportResearchPanels | null
  /** Ticker from Research filer search (matches uploaded document context). */
  reportTicker?: string
  /** Company name from filer list when available. */
  reportCompanyName?: string
}

function ResearchPanel({ title, body }: { title: string; body: string | null | undefined }) {
  const t = body?.trim()
  if (!t) return null
  return (
    <section className="AiReport-card AiReport-aiPanel AiReport-span4">
      <h2 className="AiReport-cardTitle">{title}</h2>
      <pre className="AiReport-panelPre">{t}</pre>
    </section>
  )
}

export default function AiReportView({ backendBase, reports = null, reportTicker, reportCompanyName }: Props) {
  const [rows, setRows] = useState<BenchRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const base = backendBase.replace(/\/$/, '')
      const t = benchmarkTicker(reportTicker?.trim() || '')
      const peers = peerCsvFor(t)
      const url = `${base}/api/benchmark?ticker=${encodeURIComponent(t)}&peers=${encodeURIComponent(peers)}&limit=8`
      const r = await fetch(url)
      if (!r.ok) {
        const text = await r.text()
        throw new Error(text || r.statusText)
      }
      const data: unknown = await r.json()
      setRows(Array.isArray(data) ? (data as BenchRow[]) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load benchmark data')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [backendBase, tick, reportTicker])

  useEffect(() => {
    load()
  }, [load])

  const primarySym = useMemo(() => benchmarkTicker(reportTicker?.trim() || ''), [reportTicker])

  const primary = useMemo(() => {
    const want = rowKey(primarySym)
    const match = rows.find((r) => rowKey(r.ticker) === want)
    return match ?? rows[0]
  }, [rows, primarySym])

  const displayTicker = reportTicker?.trim() ? primarySym : '—'

  const displayCompanyName = useMemo(() => {
    const n = reportCompanyName?.trim()
    if (n) return n
    if (!reportTicker?.trim()) return 'Select a company in Research'
    return primary?.name ?? primarySym
  }, [reportCompanyName, primary, primarySym, reportTicker])

  const isSemiPeerSet = useMemo(() => peerCsvFor(primarySym).includes('QCOM'), [primarySym])

  const peers = useMemo(() => {
    if (rows.length > 0) return rows.slice(0, 5)
    if (!reportTicker?.trim()) {
      return [
        { ticker: 'SPY', name: 'SPDR S&P 500', price: 512, change_pct: 0.2, market_cap: 4e12, pe_ratio: 22 },
      ]
    }
    return [
      {
        ticker: primarySym,
        name: displayCompanyName,
        price: 150,
        change_pct: 0.5,
        market_cap: 2e12,
        pe_ratio: 25,
      },
    ]
  }, [rows, reportTicker, primarySym, displayCompanyName])

  const price = primary?.price ?? 0
  const chg = primary?.change_pct ?? 0
  const mcap = primary?.market_cap ?? 0
  const pe = primary?.pe_ratio ?? 0

  const capGauge = Math.min(100, (Math.log10(Math.max(mcap, 1e9)) / Math.log10(5e12)) * 100)
  const peGauge = Math.min(100, (pe / 80) * 100)
  const marginProxy = marginProxyFromPe(pe)
  const gmGauge = Math.min(100, marginProxy * 1.15)

  const hasResearchPanels = useMemo(() => {
    if (!reports) return false
    return [reports.f1, reports.f2, reports.f3, reports.f4, reports.f5, reports.f6].some(
      (x) => (x ?? '').trim().length > 0,
    )
  }, [reports])

  const quoteText = useMemo(() => {
    const fromF3 = firstPlainParagraph(reports?.f3)
    if (fromF3) return fromF3
    const fromF2 = firstPlainParagraph(reports?.f2)
    if (fromF2) return fromF2
    if (reportTicker?.trim()) {
      return `Live snapshot for ${displayTicker}. Upload a filing in Research and run features for narrative KPIs, macro context, and risk.`
    }
    return 'Select a company in Research, then upload a PDF or SEC HTML and run features to populate filing-grounded analysis.'
  }, [reports?.f3, reports?.f2, reportTicker, displayTicker])

  const summaryBullets = useMemo(() => {
    const b = bulletLinesFromReport(reports?.f3, 3)
    if (b.length >= 3) return b
    const b2 = bulletLinesFromReport(reports?.f1, 3)
    const merged = [...b, ...b2].filter((x, i, a) => a.indexOf(x) === i)
    if (merged.length >= 3) return merged.slice(0, 3)
    const symLabel = displayTicker !== '—' ? displayTicker : 'Your symbol'
    return [
      `${symLabel}: live price, market cap, and P/E from benchmark quotes.`,
      `Peers loaded: ${peerCsvFor(primarySym).replace(/,/g, ', ')} (sector-style set).`,
      hasResearchPanels
        ? 'Panels above summarize your uploaded filing via LLM features.'
        : 'After upload, run features 1–6 in Research to fill the document grid.',
    ]
  }, [reports?.f3, reports?.f1, displayTicker, primarySym, hasResearchPanels])

  const riskBulletItems = useMemo(() => {
    const b = bulletLinesFromReport(reports?.f4, 4)
    if (b.length >= 3) return b.slice(0, 3)
    return [
      'Use filing-based Risk & Red Flags (feature 4) for cited passages from the 10-K/10-Q.',
      'Benchmark data reflects market risk via daily moves — not a substitute for fundamental risk review.',
      'Macro, rates, and sector rotation affect multiples; combine with your own stress tests.',
    ]
  }, [reports?.f4])

  const riskHeights = useMemo(() => riskHeightsFromPeers(peers), [peers])
  const geoScore = useMemo(() => riskScoreFromChange(primary?.change_pct), [primary?.change_pct])

  const sharePcts = useMemo(() => peerSharePercentages(peers), [peers])

  const valLow = price > 0 ? price * 0.88 : 0
  const valHigh = price > 0 ? price * 1.14 : 0
  const valKnobPct = price > 0 ? Math.min(88, Math.max(12, 50 + (chg ?? 0) * 6)) : 50

  const conviction = useMemo(() => {
    let s = 52
    if (hasResearchPanels) s += 30
    if (!error && rows.length > 0) s += 10
    if (chg != null && chg > 0) s += 6
    return Math.min(98, s)
  }, [hasResearchPanels, error, rows.length, chg])

  const recLabel = useMemo(() => {
    if (conviction >= 82) return 'STRONG BUY'
    if (conviction >= 68) return 'BUY'
    if (conviction >= 55) return 'HOLD'
    return 'NEUTRAL'
  }, [conviction])

  const takeaways = useMemo(() => {
    const t = bulletLinesFromReport(reports?.f3, 3)
    if (t.length >= 3) return t
    const t2 = bulletLinesFromReport(reports?.f2, 3)
    const merged = [...t, ...t2].slice(0, 3)
    if (merged.length >= 3) return merged
    return [
      `Benchmark: ${displayTicker} session move ${pctStr(chg)}; compare peers in the table.`,
      hasResearchPanels
        ? 'Review LLM panels above for filing-based KPIs, macro, earnings, and model notes.'
        : 'Upload a filing and run all six features to unlock the full analysis grid.',
      pe > 0 ? `Trailing P/E ${pe.toFixed(1)}x — sanity-check vs. history and peers.` : 'Enable quotes to see P/E and peer context.',
    ]
  }, [reports?.f3, reports?.f2, displayTicker, chg, hasResearchPanels, pe])

  const rationaleText = useMemo(() => {
    const fromF6 = firstPlainParagraph(reports?.f6, 420)
    if (fromF6) return fromF6
    return `This dashboard merges live quotes (price, cap, P/E, peers) for ${displayTicker} with optional outputs from Research features. It is not investment advice — use filings and your own models for decisions.`
  }, [reports?.f6, displayTicker])

  const earningsSub = useMemo(() => firstPlainParagraph(reports?.f5, 240), [reports?.f5])

  const footerSentiment = chg >= 0.12 ? 'Bullish' : chg <= -0.12 ? 'Cautious' : 'Neutral'

  return (
    <div className="AiReport">
      <div className="AiReport-hero">
        <div>
          <div className="AiReport-kicker">Tech Titans analyst · AI Report</div>
          <div className="AiReport-titleRow">
            <h1 className="AiReport-title">{displayCompanyName}</h1>
            <span className="AiReport-ticker">{displayTicker}</span>
          </div>
          <p className="AiReport-sub">
            {reportTicker?.trim()
              ? `Market snapshot and document-grounded panels for ${displayTicker}.`
              : 'Search and select a company in Research to align quotes, benchmarks, and uploads with that filer.'}{' '}
            {loading
              ? 'Refreshing live quotes…'
              : error
                ? `Using illustrative figures (benchmark: ${error.length > 100 ? `${error.slice(0, 100)}…` : error}).`
                : 'Live benchmark data merged with model overlays.'}
            {hasResearchPanels ? (
              <>
                {' '}
                <strong>LLM panels below</strong> use your last upload while <strong>{displayTicker}</strong> was the
                selected filer.
              </>
            ) : (
              <>
                {' '}
                Run <strong>Research → upload a PDF or SEC HTML</strong> and generate features to populate the AI
                analysis grid.
              </>
            )}
          </p>
        </div>
        <div className="AiReport-actions">
          <button
            type="button"
            className="AiReport-btn"
            onClick={() =>
              openAiReportPrint(displayCompanyName, displayTicker === '—' ? 'Report' : displayTicker)
            }
          >
            Export PDF
          </button>
          <button
            type="button"
            className="AiReport-btn AiReport-btn--primary"
            onClick={() => setTick((n) => n + 1)}
            disabled={loading}
          >
            Refresh Insights
          </button>
        </div>
      </div>

      <div id="ai-report-print-root">
        {hasResearchPanels ? (
          <div className="AiReport-researchBlock">
            <p className="AiReport-researchIntro">
              Document-grounded analysis for <strong>{displayTicker}</strong> (upload SEC PDF/HTML in Research). All six
              feature outputs when generated:
            </p>
            <div className="AiReport-grid AiReport-grid--research">
              <ResearchPanel title="KPIs / Trends" body={reports?.f1} />
              <ResearchPanel title="Macro / Market Impact" body={reports?.f2} />
              <ResearchPanel title="Research Brief" body={reports?.f3} />
              <ResearchPanel title="Risk & Red Flags" body={reports?.f4} />
              <ResearchPanel title="Earnings Call Intelligence" body={reports?.f5} />
              <ResearchPanel title="Financial Modeling Copilot" body={reports?.f6} />
            </div>
          </div>
        ) : null}

        <div className="AiReport-grid">
          <section className="AiReport-card AiReport-span6">
            <h2 className="AiReport-cardTitle">Financial Summary</h2>
            <div className="AiReport-priceRow">
              <span className="AiReport-price">{price > 0 ? formatUsd(price) : '—'}</span>
              <span className="AiReport-pct">{pctStr(chg)}</span>
            </div>
            <div className="AiReport-gauge">
              <div className="AiReport-gaugeLabel">
                <span>Market cap scale</span>
                <span>{formatCap(mcap)}</span>
              </div>
              <div className="AiReport-gaugeBar">
                <div className="AiReport-gaugeFill" style={{ width: `${capGauge}%` }} />
              </div>
            </div>
            <div className="AiReport-gauge">
              <div className="AiReport-gaugeLabel">
                <span>P/E vs. {isSemiPeerSet ? 'semis ' : ''}peer set</span>
                <span>{pe.toFixed(1)}x</span>
              </div>
              <div className="AiReport-gaugeBar">
                <div className="AiReport-gaugeFill" style={{ width: `${peGauge}%` }} />
              </div>
            </div>
            <div className="AiReport-gauge">
              <div className="AiReport-gaugeLabel">
                <span>Net margin proxy (from P/E)*</span>
                <span>{marginProxy}%</span>
              </div>
              <div className="AiReport-gaugeBar">
                <div className="AiReport-gaugeFill" style={{ width: `${gmGauge}%` }} />
              </div>
            </div>
            <p className="AiReport-microNote">*Illustrative only — not from GAAP statements. Use KPI panel for filing text.</p>
            <div className="AiReport-quote">“{quoteText}”</div>
            <ul className="AiReport-checklist">
              {summaryBullets.map((line, i) => (
                <li key={`sum-${i}-${line.slice(0, 24)}`}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="AiReport-card AiReport-span6">
            <h2 className="AiReport-cardTitle">Risk Analysis</h2>
            <div className="AiReport-riskBars" aria-hidden>
              {riskHeights.map((h, i) => (
                <div key={i} className="AiReport-riskBar" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="AiReport-alert">
              <span>Geopolitical / export controls</span>
              <span className="AiReport-alertScore">{geoScore.toFixed(1)}/10</span>
            </div>
            <ul className="AiReport-riskList">
              {riskBulletItems.map((line, i) => (
                <li key={`risk-${i}`}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="AiReport-card AiReport-span6">
            <h2 className="AiReport-cardTitle">Earnings Insights</h2>
            <div className="AiReport-earnGrid">
              <div className="AiReport-earnCard">
                <div className="AiReport-earnVal">{pctStr(chg)}</div>
                <div className="AiReport-earnLbl">{displayTicker} · session / quote change</div>
                <div className="AiReport-pills">
                  <span className="AiReport-pill">Benchmark</span>
                  <span className="AiReport-pill">Live data</span>
                </div>
              </div>
              <div className="AiReport-earnCard">
                {peers.length > 1 ? (
                  <>
                    <div className="AiReport-earnVal">{pctStr(peers[1]?.change_pct)}</div>
                    <div className="AiReport-earnLbl">{peers[1]?.ticker ?? 'Peer'} · session move</div>
                    <div className="AiReport-pills">
                      <span className="AiReport-pill">Peer</span>
                      <span className="AiReport-pill">Benchmark set</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="AiReport-earnVal">{pe > 0 ? `${pe.toFixed(1)}x` : '—'}</div>
                    <div className="AiReport-earnLbl">Trailing P/E (quote)</div>
                    <div className="AiReport-pills">
                      <span className="AiReport-pill">Valuation</span>
                      <span className="AiReport-pill">Live</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <p className="AiReport-text" style={{ marginTop: 12 }}>
              {earningsSub ||
                (hasResearchPanels
                  ? 'Earnings Call Intelligence above is grounded in your uploaded excerpt when that feature was run.'
                  : 'Run feature 5 in Research after uploading a transcript or MD&A-heavy filing for call-style KPIs.')}
            </p>
          </section>

          <section className="AiReport-card AiReport-span6">
            <h2 className="AiReport-cardTitle">Competitor Comparison</h2>
            <table className="AiReport-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Share</th>
                  <th>Net margin</th>
                  <th>Sentiment</th>
                </tr>
              </thead>
              <tbody>
                {peers.map((r, idx) => {
                    const sharePct = sharePcts[idx] ?? Math.round(100 / peers.length)
                    const marginPct = marginProxyFromPe(r.pe_ratio)
                    const s = sentimentFromChange(r.change_pct)
                    return (
                      <tr key={`${r.ticker}-${idx}`}>
                        <td>
                          <strong>{r.name ?? r.ticker}</strong>{' '}
                          <span style={{ color: '#94a3b8' }}>{r.ticker}</span>
                        </td>
                        <td className="AiReport-barCell">
                          <div className="AiReport-miniBar">
                            <span style={{ width: `${Math.min(100, sharePct)}%` }} />
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{sharePct}%</span>
                        </td>
                        <td>
                          {marginPct}% <span style={{ fontSize: '10px', color: '#94a3b8' }}>(est.)</span>
                        </td>
                        <td>
                          <span className={`AiReport-sent AiReport-sent--${s}`}>
                            {s === 'high' ? 'HIGH' : s === 'med' ? 'MED' : 'LOW'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </section>

          <section className="AiReport-card AiReport-span4">
            <h2 className="AiReport-cardTitle">Valuation</h2>
            <p className="AiReport-text">Heuristic band from last price (not a DCF)</p>
            <div className="AiReport-slider">
              <div className="AiReport-gaugeLabel">
                <span>Bear / Base / Bull</span>
                <span>
                  {price > 0 ? `${formatUsd(valLow)} – ${formatUsd(valHigh)}` : '—'}
                </span>
              </div>
              <div className="AiReport-sliderTrack">
                <div className="AiReport-sliderKnob" style={{ left: `${valKnobPct}%` }} />
              </div>
            </div>
            <div className="AiReport-valBox">
              <strong>{recLabel}</strong>
              <div className="AiReport-conv">Conviction score: {conviction} / 100</div>
            </div>
          </section>

          <section className="AiReport-card AiReport-span4">
            <h2 className="AiReport-cardTitle">AI Model Rationale</h2>
            <p className="AiReport-text">{rationaleText}</p>
            <div className="AiReport-meta">
              <span>Data: {loading ? 'loading…' : error ? 'partial' : 'quotes ok'}</span>
              <span>Research: {hasResearchPanels ? 'filing features on' : 'quotes only'}</span>
            </div>
          </section>

          <section className="AiReport-card AiReport-span4">
            <h2 className="AiReport-cardTitle">Takeaways</h2>
            {takeaways.map((line, i) => (
              <div className="AiReport-takeaway" key={`tw-${i}`}>
                <span className="AiReport-num">{i + 1}</span>
                <span>{line}</span>
              </div>
            ))}
          </section>
        </div>
      </div>

      <div className="AiReport-footerBar">
        <span>
          Sentiment index: <strong>{footerSentiment}</strong>
        </span>
        <span>
          {displayTicker !== '—' ? (
            <>
              {displayTicker} Δ: <strong>{pctStr(chg)}</strong>
            </>
          ) : (
            <>Pick a filer in Research</>
          )}
        </span>
        <span>
          Conviction: <strong>{conviction}</strong>
        </span>
        <span>{new Date().toLocaleString()}</span>
      </div>
    </div>
  )
}
