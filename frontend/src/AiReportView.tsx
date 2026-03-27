import { useCallback, useEffect, useMemo, useState } from 'react'
import html2pdf from 'html2pdf.js'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import './AiReportView.css'

type BenchRow = {
  ticker: string
  name?: string
  price: number
  change_pct?: number
  market_cap?: number
  pe_ratio?: number
}

/** Feature outputs from Research → upload + run (same shape as sidebar cards). */
export type AiReportResearchPanels = {
  f1?: string | null
  f2?: string | null
  f3?: string | null
  f4?: string | null
  f5?: string | null
  f6?: string | null
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

function firstPercent(text: string | null | undefined): string | null {
  if (!text?.trim()) return null
  const m = text.match(/[-+]?\d+(?:\.\d+)?%/)
  return m ? m[0] : null
}

function firstMoney(text: string | null | undefined): string | null {
  if (!text?.trim()) return null
  const m = text.match(/\$ ?\d[\d,]*(?:\.\d+)?\s*(?:[BMKT])?/i)
  return m ? m[0].replace(/\s+/g, '') : null
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

/** Combined text from all feature outputs for cross-report parsing */
function combineReports(r: AiReportResearchPanels | null | undefined): string {
  if (!r) return ''
  return [r.f1, r.f2, r.f3, r.f4, r.f5, r.f6]
    .map((x) => (x ?? '').trim())
    .filter(Boolean)
    .join('\n\n')
}

function parsePercentToken(s: string): number | null {
  const m = s.match(/(\d+(?:\.\d+)?)\s*%/)
  if (!m) return null
  const n = parseFloat(m[1])
  return Number.isFinite(n) ? n : null
}

function parseMoneyBillions(s: string): number | null {
  const t = s.trim()
  const m = t.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*([BMK])?/i)
  if (!m) return null
  let v = parseFloat(m[1].replace(/,/g, ''))
  if (!Number.isFinite(v)) return null
  const u = (m[2] || '').toUpperCase()
  if (u === 'B') v *= 1e9
  else if (u === 'M') v *= 1e6
  else if (u === 'K') v *= 1e3
  return v
}

export type ParsedReportInsights = {
  notFiling: boolean
  revenueDisplay: string | null
  netIncomeDisplay: string | null
  operatingMarginPct: number | null
  netMarginPct: number | null
  peFromReport: number | null
  marketCapValue: number | null
  marketCapDisplay: string | null
  riskScoreFromReport: number | null
  riskHeadline: string | null
  valuationLow: number | null
  valuationHigh: number | null
  valuationDisplay: string | null
  earningsOneLiner: string | null
}

/** Pull structured hints from uploaded LLM feature text (tables, labels, filing-quality flags). */
export function parseReportInsights(reports: AiReportResearchPanels | null | undefined): ParsedReportInsights {
  const out: ParsedReportInsights = {
    notFiling: false,
    revenueDisplay: null,
    netIncomeDisplay: null,
    operatingMarginPct: null,
    netMarginPct: null,
    peFromReport: null,
    marketCapValue: null,
    marketCapDisplay: null,
    riskScoreFromReport: null,
    riskHeadline: null,
    valuationLow: null,
    valuationHigh: null,
    valuationDisplay: null,
    earningsOneLiner: null,
  }
  if (!reports) return out

  const full = combineReports(reports)
  if (!full.trim()) return out

  const notFiling =
    /NOT_A_FILING|not a filing|html and javascript|unsuitable for financial|mostly HTML/i.test(full)

  // Markdown / pipe tables: | Metric | value | ...
  const lines = full.split(/\n/)
  for (const line of lines) {
    if (!line.includes('|')) continue
    const cells = line
      .split('|')
      .map((c) => c.replace(/\*\*/g, '').trim())
      .filter((c) => c.length > 0 && !/^[-:]+$/.test(c))
    if (cells.length < 2) continue
    const key = cells[0].toLowerCase()
    const val = cells[1]

    if (/revenue/i.test(key) && !/per share/i.test(key)) {
      if (!out.revenueDisplay && (/\$/.test(val) || /\d/.test(val))) {
        out.revenueDisplay = val.replace(/\s+/g, ' ').slice(0, 48)
      }
    }
    if (/net income|net profit/i.test(key)) {
      if (!out.netIncomeDisplay && /\$/.test(val)) {
        out.netIncomeDisplay = val.replace(/\s+/g, ' ').slice(0, 48)
      }
    }
    if (/operating margin/i.test(key)) {
      const p = parsePercentToken(val)
      if (p != null) out.operatingMarginPct = p
    }
    if (/net margin/i.test(key)) {
      const p = parsePercentToken(val)
      if (p != null) out.netMarginPct = p
    }
    if (/p\/?e|price\s*\/\s*earnings/i.test(key)) {
      const m = val.match(/(\d+(?:\.\d+)?)\s*x?/i)
      if (m) {
        const n = parseFloat(m[1])
        if (Number.isFinite(n) && n > 0 && n < 500) out.peFromReport = n
      }
    }
    if (/market cap/i.test(key)) {
      const mv = parseMoneyBillions(val)
      if (mv != null && mv > 0) {
        out.marketCapValue = mv
        out.marketCapDisplay = val.replace(/\s+/g, ' ').slice(0, 32)
      }
    }
  }

  // Inline patterns when table layout differs
  if (!out.revenueDisplay) {
    const m = full.match(/(?:revenue|total revenue)\s*[|:]\s*(\$[\d,]+(?:\.\d+)?(?:\s*[BM])?)/i)
    if (m) out.revenueDisplay = m[1].replace(/\s+/g, '')
  }
  if (out.netMarginPct == null && out.operatingMarginPct == null) {
    const m = full.match(/(?:net margin|operating margin)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%/i)
    if (m) {
      const p = parseFloat(m[1])
      if (Number.isFinite(p)) out.netMarginPct = p
    }
  }

  // Risk score like 5.4/10 in feature 4
  const f4 = (reports.f4 ?? '').trim()
  const scoreM = f4.match(/(\d+(?:\.\d+)?)\s*\/\s*10\b/)
  if (scoreM) {
    const s = parseFloat(scoreM[1])
    if (Number.isFinite(s)) out.riskScoreFromReport = Math.min(10, Math.max(0, s))
  }

  // First substantive risk bullet as headline (trim length)
  const riskBullets = bulletLinesFromReport(reports.f4, 5)
  if (riskBullets[0] && riskBullets[0].length > 8) {
    const head = riskBullets[0].replace(/^#+\s*/, '').slice(0, 72)
    out.riskHeadline = head.length < riskBullets[0].length ? `${head}…` : head
  }

  // Valuation band in modeling / brief
  const f6 = (reports.f6 ?? '') + '\n' + (reports.f3 ?? '')
  const bandM = f6.match(
    /\$\s*([\d,]+(?:\.\d{2})?)\s*[–\-]\s*\$\s*([\d,]+(?:\.\d{2})?)/,
  )
  if (bandM) {
    const low = parseFloat(bandM[1].replace(/,/g, ''))
    const high = parseFloat(bandM[2].replace(/,/g, ''))
    if (Number.isFinite(low) && Number.isFinite(high) && high > low) {
      out.valuationLow = low
      out.valuationHigh = high
      out.valuationDisplay = `$${low.toFixed(2)} – $${high.toFixed(2)}`
    }
  }

  const f5 = (reports.f5 ?? '').trim()
  if (f5) {
    const one = firstPlainParagraph(f5, 200)
    if (one) out.earningsOneLiner = one
  }

  out.notFiling = notFiling
  return out
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

function openAiReportPrint(_titleName: string, titleTicker: string) {
  const el = document.getElementById('ai-report-print-root')
  if (!el) return

  // Create a new div with the content
  const reportContainer = document.createElement('div')
  reportContainer.innerHTML = el.innerHTML
  reportContainer.style.padding = '24px'
  reportContainer.style.fontFamily = 'system-ui, sans-serif'
  reportContainer.style.color = '#0f172a'
  reportContainer.style.maxWidth = '900px'

  // Generate PDF with html2pdf
  const filename = `AI_Report_${titleTicker}_${new Date().toISOString().split('T')[0]}.pdf`
  const opt: Record<string, unknown> = {
    margin: 10,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, allowTaint: true, useCORS: true },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
  }

  setTimeout(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(html2pdf() as any).set(opt).from(reportContainer).save()
  }, 100)
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
  const pe = primary?.pe_ratio ?? 0

  const hasResearchPanels = useMemo(() => {
    if (!reports) return false
    return [reports.f1, reports.f2, reports.f3, reports.f4, reports.f5, reports.f6].some(
      (x) => (x ?? '').trim().length > 0,
    )
  }, [reports])

  const parsed = useMemo(() => parseReportInsights(reports), [reports])

  const headlineFromReport = useMemo(() => {
    if (!hasResearchPanels) {
      return {
        value: price > 0 ? formatUsd(price) : '—',
        caption: 'Last price (live quote)',
      }
    }
    if (parsed.revenueDisplay) {
      return { value: parsed.revenueDisplay, caption: 'Revenue (from uploaded report)' }
    }
    if (parsed.netIncomeDisplay) {
      return { value: parsed.netIncomeDisplay, caption: 'Net income (from uploaded report)' }
    }
    const fallback = firstMoney(reports?.f1) ?? firstMoney(reports?.f3)
    if (fallback) return { value: fallback, caption: 'From KPI / research brief' }
    return {
      value: price > 0 ? formatUsd(price) : '—',
      caption: 'Last price (live quote)',
    }
  }, [hasResearchPanels, parsed, reports?.f1, reports?.f3, price])

  const effectivePe = parsed.peFromReport ?? pe
  const marginFromReport =
    parsed.netMarginPct ?? parsed.operatingMarginPct ?? marginProxyFromPe(effectivePe)

  const quoteText = useMemo(() => {
    if (parsed.notFiling) {
      return firstPlainParagraph(reports?.f2, 360) || firstPlainParagraph(reports?.f3, 360) ||
        'Uploaded text does not look like filing narrative (e.g. HTML/JS). Upload a 10-K/10-Q PDF or SEC viewer HTML for full KPI extraction.'
    }
    const fromF1 = firstPlainParagraph(reports?.f1, 360)
    if (fromF1) return fromF1
    const fromF3 = firstPlainParagraph(reports?.f3)
    if (fromF3) return fromF3
    const fromF2 = firstPlainParagraph(reports?.f2)
    if (fromF2) return fromF2
    if (reportTicker?.trim()) {
      return `Live snapshot for ${displayTicker}. Upload a filing in Research and run features for narrative KPIs, macro context, and risk.`
    }
    return 'Select a company in Research, then upload a PDF or SEC HTML and run features to populate filing-grounded analysis.'
  }, [parsed.notFiling, reports?.f1, reports?.f3, reports?.f2, reportTicker, displayTicker])

  const reportChangeLabel = useMemo(() => {
    const fromF5 = firstPercent(reports?.f5)
    const fromF1 = firstPercent(reports?.f1)
    const fromF3 = firstPercent(reports?.f3)
    return fromF5 ?? fromF1 ?? fromF3
  }, [reports?.f5, reports?.f1, reports?.f3])

  const summaryBullets = useMemo(() => {
    const b1 = bulletLinesFromReport(reports?.f1, 3)
    const b = bulletLinesFromReport(reports?.f3, 3)
    if (b1.length >= 2) {
      const merged = [...b1, ...b].filter((x, i, a) => a.indexOf(x) === i)
      if (merged.length >= 3) return merged.slice(0, 3)
    }
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
  }, [reports?.f1, reports?.f3, displayTicker, primarySym, hasResearchPanels])

  const riskBulletItems = useMemo(() => {
    const b = bulletLinesFromReport(reports?.f4, 4)
    if (b.length >= 3) return b.slice(0, 3)
    return [
      'Use filing-based Risk & Red Flags (feature 4) for cited passages from the 10-K/10-Q.',
      'Benchmark data reflects market risk via daily moves — not a substitute for fundamental risk review.',
      'Macro, rates, and sector rotation affect multiples; combine with your own stress tests.',
    ]
  }, [reports?.f4])

  const riskHeights = useMemo(() => {
    if (parsed.notFiling) return [32, 38, 42, 36, 34]
    return riskHeightsFromPeers(peers)
  }, [parsed.notFiling, peers])
  const geoScore = useMemo(() => {
    if (parsed.riskScoreFromReport != null) return parsed.riskScoreFromReport
    return riskScoreFromChange(primary?.change_pct)
  }, [parsed.riskScoreFromReport, primary?.change_pct])

  const sharePcts = useMemo(() => peerSharePercentages(peers), [peers])

  const valLow = parsed.valuationLow ?? (price > 0 ? price * 0.88 : 0)
  const valHigh = parsed.valuationHigh ?? (price > 0 ? price * 1.14 : 0)
  const valKnobPct = useMemo(() => {
    if (
      parsed.valuationLow != null &&
      parsed.valuationHigh != null &&
      price > 0 &&
      parsed.valuationHigh > parsed.valuationLow
    ) {
      const t = (price - parsed.valuationLow) / (parsed.valuationHigh - parsed.valuationLow)
      return Math.min(88, Math.max(12, 12 + t * 76))
    }
    if (price > 0) return Math.min(88, Math.max(12, 50 + (chg ?? 0) * 6))
    return 50
  }, [parsed.valuationLow, parsed.valuationHigh, price, chg])

  const conviction = useMemo(() => {
    let s = 48
    if (hasResearchPanels) s += 22
    if (parsed.notFiling) s -= 28
    if (parsed.revenueDisplay || parsed.netIncomeDisplay || parsed.netMarginPct != null) s += 18
    if (parsed.riskHeadline && !parsed.notFiling) s += 6
    if (!error && rows.length > 0) s += 10
    if (chg != null && chg > 0) s += 6
    return Math.min(98, Math.max(22, s))
  }, [
    hasResearchPanels,
    parsed.notFiling,
    parsed.revenueDisplay,
    parsed.netIncomeDisplay,
    parsed.netMarginPct,
    parsed.riskHeadline,
    error,
    rows.length,
    chg,
  ])

  const recLabel = useMemo(() => {
    if (parsed.notFiling) return 'REVIEW SOURCE'
    if (conviction >= 82) return 'STRONG BUY'
    if (conviction >= 68) return 'BUY'
    if (conviction >= 55) return 'HOLD'
    return 'NEUTRAL'
  }, [conviction, parsed.notFiling])

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

  const earningsSub = useMemo(
    () => parsed.earningsOneLiner ?? firstPlainParagraph(reports?.f5, 240),
    [parsed.earningsOneLiner, reports?.f5],
  )

  const earningsValPrimary = useMemo(() => {
    if (hasResearchPanels && reportChangeLabel) return reportChangeLabel
    return pctStr(chg)
  }, [hasResearchPanels, reportChangeLabel, chg])

  const earningsValSecondary = useMemo(() => {
    if (hasResearchPanels) {
      const x = firstPercent(reports?.f4) ?? firstPercent(reports?.f2)
      if (x) return x
    }
    if (peers.length > 1) return pctStr(peers[1]?.change_pct)
    return pe > 0 ? `${pe.toFixed(1)}x` : '—'
  }, [hasResearchPanels, reports?.f4, reports?.f2, peers, pe])

  const footerSentiment = parsed.notFiling
    ? 'Uncertain'
    : chg >= 0.12
      ? 'Bullish'
      : chg <= -0.12
        ? 'Cautious'
        : 'Neutral'

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
            ⬇ Download Full Analysis Report (PDF)
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
        <div className="AiReport-grid">
          <section className="AiReport-card AiReport-span6">
            <h2 className="AiReport-cardTitle">Financial Summary</h2>
            <div className="AiReport-priceRow">
              <span className="AiReport-price">{headlineFromReport.value}</span>
              <span className="AiReport-pct">{hasResearchPanels ? (reportChangeLabel ?? pctStr(chg)) : pctStr(chg)}</span>
            </div>
            <p className="AiReport-microNote" style={{ marginTop: 4, marginBottom: 10 }}>
              {headlineFromReport.caption}
            </p>
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
              <span>{parsed.riskHeadline ?? 'Filing-based risk themes'}</span>
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
                <div className="AiReport-earnVal">{earningsValPrimary}</div>
                <div className="AiReport-earnLbl">
                  {hasResearchPanels
                    ? 'From uploaded analysis report'
                    : `${displayTicker} · session / quote change`}
                </div>
                <div className="AiReport-pills">
                  <span className="AiReport-pill">{hasResearchPanels ? 'Feature output' : 'Benchmark'}</span>
                  <span className="AiReport-pill">{hasResearchPanels ? 'Document based' : 'Live data'}</span>
                </div>
              </div>
              <div className="AiReport-earnCard">
                {peers.length > 1 ? (
                  <>
                    <div className="AiReport-earnVal">{earningsValSecondary}</div>
                    <div className="AiReport-earnLbl">
                      {hasResearchPanels ? 'Risk/Macro signal from report' : `${peers[1]?.ticker ?? 'Peer'} · session move`}
                    </div>
                    <div className="AiReport-pills">
                      <span className="AiReport-pill">{hasResearchPanels ? 'Feature output' : 'Peer'}</span>
                      <span className="AiReport-pill">{hasResearchPanels ? 'LLM analysis' : 'Benchmark set'}</span>
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

          <section className="AiReport-card AiReport-span12">
            <h2 className="AiReport-cardTitle">Peer Comparison & Market Analysis</h2>
            <div className="AiReport-chartsRow">
              {peers.length > 0 && (
                <div className="AiReport-chartContainer">
                  <h3 className="AiReport-chartTitle">P/E Ratio Comparison</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={peers.map((p) => ({
                        name: p.ticker,
                        pe: p.pe_ratio ?? 0,
                        fullName: p.name,
                      }))}
                      margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value) => (typeof value === 'number' ? value.toFixed(1) + 'x' : value)}
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #4b5563',
                          borderRadius: '6px',
                          color: '#e5e7eb',
                        }}
                      />
                      <Bar dataKey="pe" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {peers.length > 0 && (
                <div className="AiReport-chartContainer">
                  <h3 className="AiReport-chartTitle">Market Cap Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={peers.map((p) => ({
                          name: p.ticker,
                          value: Math.max(p.market_cap ?? 1e9, 1e9) / 1e12,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name} $${value.toFixed(1)}T`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          '#3b82f6',
                          '#ef4444',
                          '#10b981',
                          '#f59e0b',
                          '#8b5cf6',
                          '#ec4899',
                        ].map((color, idx) => (
                          <Cell key={`cell-${idx}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: unknown) => {
                          const num = typeof value === 'number' ? value : 0
                          return `$${num.toFixed(2)}T`
                        }}
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #4b5563',
                          borderRadius: '6px',
                          color: '#e5e7eb',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="AiReport-tableWrapper">
              <table className="AiReport-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Price</th>
                    <th>Share</th>
                    <th>Market Cap</th>
                    <th>Net Margin</th>
                    <th>Sentiment</th>
                  </tr>
                </thead>
                <tbody>
                  {peers.map((r, idx) => {
                    const sharePct = sharePcts[idx] ?? Math.round(100 / peers.length)
                    const isPrimaryRow =
                      displayTicker !== '—' && rowKey(r.ticker) === rowKey(displayTicker)
                    const marginPct = isPrimaryRow && (parsed.netMarginPct != null || parsed.operatingMarginPct != null)
                      ? Math.round(marginFromReport)
                      : marginProxyFromPe(r.pe_ratio)
                    const marginTag =
                      isPrimaryRow && (parsed.netMarginPct != null || parsed.operatingMarginPct != null)
                        ? '(report)'
                        : '(est.)'
                    const s = sentimentFromChange(r.change_pct)
                    return (
                      <tr key={`${r.ticker}-${idx}`} className={isPrimaryRow ? 'AiReport-rowHighlight' : ''}>
                        <td className="AiReport-companyCell">
                          <strong>{r.name ?? r.ticker}</strong>{' '}
                          <span className="AiReport-tickerSpan">{r.ticker}</span>
                        </td>
                        <td className="AiReport-numCell">{formatUsd(r.price)}</td>
                        <td className="AiReport-barCell">
                          <div className="AiReport-miniBar">
                            <span style={{ width: `${Math.min(100, sharePct)}%` }} />
                          </div>
                          <span className="AiReport-pctLabel">{sharePct}%</span>
                        </td>
                        <td className="AiReport-numCell">{formatCap(r.market_cap ?? 0)}</td>
                        <td className="AiReport-numCell">
                          <span className="AiReport-marginBadge">{marginPct}%</span>
                          <span className="AiReport-marginTag">{marginTag}</span>
                        </td>
                        <td>
                          <span className={`AiReport-sent AiReport-sent--${s}`}>
                            {s === 'high' ? '📈 HIGH' : s === 'med' ? '→ MED' : '📉 LOW'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="AiReport-card AiReport-span4">
            <h2 className="AiReport-cardTitle">Valuation</h2>
            <p className="AiReport-text">
              {parsed.valuationDisplay
                ? 'Range parsed from modeling / brief output when present (not a DCF).'
                : 'Heuristic band from last price (not a DCF)'}
            </p>
            <div className="AiReport-slider">
              <div className="AiReport-gaugeLabel">
                <span>Bear / Base / Bull</span>
                <span>
                  {parsed.valuationDisplay ??
                    (price > 0 ? `${formatUsd(valLow)} – ${formatUsd(valHigh)}` : '—')}
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
              <span>
                Research:{' '}
                {hasResearchPanels
                  ? parsed.notFiling
                    ? 'features on (non-filing text)'
                    : 'filing features + parsed KPIs'
                  : 'quotes only'}
              </span>
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

          {hasResearchPanels && (
            <>
              <section className="AiReport-card AiReport-span6">
                <h2 className="AiReport-cardTitle">KPIs/Trends</h2>
                <div className="AiReport-panelContent">
                  {reports?.f1 ? <p>{firstPlainParagraph(reports.f1)}</p> : <p className="AiReport-emptyPanel">No data available</p>}
                </div>
              </section>

              <section className="AiReport-card AiReport-span6">
                <h2 className="AiReport-cardTitle">Macro/Market Impact</h2>
                <div className="AiReport-panelContent">
                  {reports?.f2 ? <p>{firstPlainParagraph(reports.f2)}</p> : <p className="AiReport-emptyPanel">No data available</p>}
                </div>
              </section>

              <section className="AiReport-card AiReport-span6">
                <h2 className="AiReport-cardTitle">Financial Modeling Copilot</h2>
                <div className="AiReport-panelContent">
                  {reports?.f4 ? <p>{firstPlainParagraph(reports.f4)}</p> : <p className="AiReport-emptyPanel">No data available</p>}
                </div>
              </section>

              <section className="AiReport-card AiReport-span6">
                <h2 className="AiReport-cardTitle">Risk & Red Flags</h2>
                <div className="AiReport-panelContent">
                  {reports?.f6 ? <p>{firstPlainParagraph(reports.f6)}</p> : <p className="AiReport-emptyPanel">No data available</p>}
                </div>
              </section>

              <section className="AiReport-card AiReport-span12">
                <h2 className="AiReport-cardTitle">Research Brief</h2>
                <div className="AiReport-panelContent">
                  {reports?.f3 ? <p>{reports.f3}</p> : <p className="AiReport-emptyPanel">No data available</p>}
                </div>
              </section>
            </>
          )}
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
