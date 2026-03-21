/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import './CompanyDetail.css'

const TABS = [
  { id: 'sentiment', label: 'Sentiment Chart', icon: '📊' },
  { id: 'rev-eps', label: 'Rev vs EPS' },
  { id: 'overview', label: 'Overview' },
  { id: 'benchmarking', label: 'Benchmarking' },
  { id: 'calls', label: 'Calls' },
  { id: 'news', label: 'News' },
  { id: 'filings', label: 'Filings' },
] as const

const PERIODS = ['4Q', '6Q', '8Q', 'All'] as const

// Mock: sentiment score over time (score, price for area)
const SENTIMENT_TREND = [
  { period: 'Apr 25', score: 81, positive: 24, negative: 4, price: 168 },
  { period: 'Jul 25', score: 90, positive: 26, negative: 2, price: 228 },
  { period: 'Oct 25', score: 94, positive: 27, negative: 1, price: 278 },
  { period: 'Mar 26', score: 96, positive: 28, negative: 1, price: 298 },
]

// Mock: quarterly stacked sentiment (positive %, negative %, neutral rest)
const QUARTERLY_SENTIMENT = [
  { quarter: 'Q1', positive: 70, negative: 8 },
  { quarter: 'Q2', positive: 75, negative: 5 },
  { quarter: 'Q3', positive: 82, negative: 3 },
  { quarter: 'Q4', positive: 88, negative: 2 },
]

// Mock: earnings data by quarter (Revenue in billions, EPS in dollars) — actual vs estimate
const EARNINGS_QUARTERS = ["Q4 '23", "Q1 '24", "Q2 '24", "Q3 '24", "Q4 '24", "Q1 '25", "Q2 '25", "Q3 '25", "Q4 '25", "Q1 '26"]
const REVENUE_DATA: { actual: number; estimate: number }[] = [
  { actual: 89.5, estimate: 89.0 },
  { actual: 90.8, estimate: 90.2 },
  { actual: 85.8, estimate: 84.5 },
  { actual: 94.9, estimate: 94.0 },
  { actual: 119.6, estimate: 118.0 },
  { actual: 90.8, estimate: 90.0 },
  { actual: 85.8, estimate: 84.2 },
  { actual: 94.9, estimate: 93.8 },
  { actual: 119.6, estimate: 118.5 },
  { actual: 91.0, estimate: 90.5 },
]
const EPS_DATA: { actual: number; estimate: number }[] = [
  { actual: 1.64, estimate: 1.60 },
  { actual: 1.53, estimate: 1.50 },
  { actual: 1.40, estimate: 1.38 },
  { actual: 1.64, estimate: 1.62 },
  { actual: 2.18, estimate: 2.10 },
  { actual: 1.52, estimate: 1.48 },
  { actual: 1.40, estimate: 1.36 },
  { actual: 1.64, estimate: 1.60 },
  { actual: 2.18, estimate: 2.12 },
  { actual: 1.55, estimate: 1.52 },
]
const REVENUE_Y_MAX = 160
const EPS_Y_MAX = 3

// Mock: earnings call sentiment cards (quarter, date, score, positive %, negative %, neutral %)
const EARNINGS_CALLS = [
  { quarter: 'Q4-2026', date: 'Feb 25', score: 92, positive: 16, negative: 1, neutral: 82 },
  { quarter: 'Q3-2026', date: 'Nov 20', score: 90, positive: 15, negative: 2, neutral: 83 },
  { quarter: 'Q2-2026', date: 'Aug 28', score: 88, positive: 14, negative: 2, neutral: 84 },
  { quarter: 'Q1-2026', date: 'May 22', score: 91, positive: 17, negative: 1, neutral: 81 },
  { quarter: 'Q4-2025', date: 'Feb 26', score: 89, positive: 15, negative: 2, neutral: 83 },
  { quarter: 'Q3-2025', date: 'Nov 19', score: 87, positive: 13, negative: 3, neutral: 84 },
  { quarter: 'Q2-2025', date: 'Aug 27', score: 85, positive: 12, negative: 3, neutral: 85 },
  { quarter: 'Q1-2025', date: 'May 21', score: 86, positive: 14, negative: 2, neutral: 84 },
  { quarter: 'Q4-2024', date: 'Feb 24', score: 84, positive: 11, negative: 4, neutral: 85 },
  { quarter: 'Q3-2024', date: 'Nov 18', score: 82, positive: 10, negative: 5, neutral: 85 },
  { quarter: 'Q2-2024', date: 'Aug 26', score: 80, positive: 9, negative: 5, neutral: 86 },
  { quarter: 'Q1-2024', date: 'May 20', score: 81, positive: 10, negative: 4, neutral: 86 },
  { quarter: 'Q4-2023', date: 'Feb 22', score: 78, positive: 8, negative: 6, neutral: 86 },
]

// Mock: Overview tab — profile, description, and metric cards (can be keyed by ticker later)
const OVERVIEW_PROFILE: Record<string, string> = {
  'Market Cap': '$4.38T',
  'P/E Ratio': '36.52',
  '52W Range': '$86.62 - $212.19',
  'Website': 'https://www.nvidia.com',
  'Employees': '42,000 (as of 01/24/2026)',
  'Industry': 'Semiconductors',
  'IPO Date': '01/21/1999',
  'Current Price': '$180.40',
  'EV/EBITDA': '30.34',
  'Dividend': 'N/A',
  'CEO': 'Jen-Hsun Huang',
  'Exchange': 'NASDAQ',
  'Sector': 'Technology',
  'Headquarters': 'Santa Clara, CA',
}

const OVERVIEW_DESCRIPTION = `NVIDIA provides graphics, compute, and networking solutions. The company's GeForce NOW game streaming and related infrastructure serve gaming platforms. Quadro and NVIDIA RTX GPUs power enterprise workstations, with vGPU software enabling cloud-based visual computing. Automotive platforms support infotainment; Omniverse software supports 3D design and virtual worlds. Data Center platforms address AI, HPC, and accelerated computing. Mellanox networking, autonomous driving development, Jetson for robotics, and NVIDIA AI Enterprise software round out the portfolio. The company sells to original equipment manufacturers (OEMs), system builders, retailers, and independent software vendors.`

const OVERVIEW_PROFITABILITY: [string, string][] = [
  ['Gross Margin', '71.1%'],
  ['Operating Margin', '60.4%'],
  ['Net Margin', '55.6%'],
  ['EBITDA Margin', '51.1%'],
  ['FCF Margin', '44.8%'],
  ['Return on Equity', '104.4%'],
  ['Return on Assets', '58.1%'],
  ['Return on Invested Capital', '62.9%'],
  ['Return on Capital', '74.7%'],
]

const OVERVIEW_FINANCIAL_STRENGTH: [string, string][] = [
  ['Cash-to-Debt Ratio', '9.00'],
  ['Debt-to-Equity Ratio', '0.07'],
  ['Debt-to-EBITDA', '0.01'],
  ['Interest Coverage', '503.4x'],
  ['Altman Z-Score', '58.46'],
  ['Piotroski F-Score', '6 / 9'],
]

const OVERVIEW_VALUATION: [string, string][] = [
  ['P/E Ratio', '36.52'],
  ['PEG Ratio', '1.70'],
  ['Price-to-Sales', '20.31'],
  ['Price-to-Book', '27.87'],
  ['EV/EBITDA', '30.34'],
  ['EV/Revenue', '20.31'],
  ['Price-to-FCF', '45.35'],
  ['FCF Yield', '2.2%'],
  ['Earnings Yield', '2.7%'],
]

const OVERVIEW_EFFICIENCY: [string, string][] = [
  ['Current Ratio', '3.91'],
  ['Quick Ratio', '3.24'],
  ['Cash Ratio', '0.33'],
  ['Inventory Days', '125 days'],
  ['Sales Days', '65 days'],
  ['Payable Days', '57 days'],
  ['Cash Conversion Cycle', '133 days'],
  ['Working Capital', '$93.44B'],
]

const OVERVIEW_MOMENTUM: [string, string][] = [
  ['5-Day RSI', '40.17'],
  ['9-Day RSI', '43.87'],
  ['14-Day RSI', '45.62'],
  ['3-Month Momentum', '-0.33%'],
  ['6-Month Momentum', '2.11%'],
  ['12-Month Momentum', '53.51%'],
]

type Props = {
  ticker: string
  companyName: string
  backendBase: string
  onBack: () => void
}

type NewsItem = {
  title: string
  url: string
  source: string
  published_at: string
}

type BenchmarkItem = {
  ticker: string
  name: string
  price: number | null
  change_pct: number | null
  market_cap: number | null
  pe_ratio: number | null
  fifty_two_week_low: number | null
  fifty_two_week_high: number | null
  volume: number | null
  avg_volume_3m: number | null
  exchange: string
  currency: string
}

const NEWS_FALLBACK: NewsItem[] = [
  {
    title: 'Company highlights strong earnings momentum and AI growth',
    url: 'https://example.com/earnings',
    source: 'FinAI Demo',
    published_at: new Date().toISOString(),
  },
  {
    title: 'Management discusses capital allocation and shareholder returns',
    url: 'https://example.com/capital-allocation',
    source: 'FinAI Demo',
    published_at: new Date().toISOString(),
  },
  {
    title: 'Analysts react to updated long-term guidance range',
    url: 'https://example.com/guidance',
    source: 'FinAI Demo',
    published_at: new Date().toISOString(),
  },
]

type FilingRow = {
  ticker?: string
  form: string
  filing_date: string
  accession_number: string
  primary_document: string
  url: string
}

const DEFAULT_PEERS_BY_TICKER: Record<string, string[]> = {
  NVDA: ['AMD', 'INTC', 'TSM', 'AVGO', 'QCOM'],
  AAPL: ['MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA'],
  TSLA: ['RIVN', 'NIO', 'F', 'GM', 'LI'],
  MSFT: ['AAPL', 'GOOGL', 'AMZN', 'META', 'ORCL'],
}

function formatNewsDate(isoOrRaw: string): string {
  const s = (isoOrRaw || '').trim()
  if (!s) return ''
  const d = new Date(s)
  if (!Number.isFinite(d.getTime())) return s
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function domainFromUrl(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export default function CompanyDetail({ ticker, companyName, backendBase, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<string>('sentiment')
  const [period, setPeriod] = useState<string>('4Q')
  const [favorited, setFavorited] = useState(false)
  const [searchTranscripts, setSearchTranscripts] = useState('')
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsError, setNewsError] = useState<string | null>(null)
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [benchmarkLoading, setBenchmarkLoading] = useState(false)
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null)
  const [benchmarkItems, setBenchmarkItems] = useState<BenchmarkItem[]>([])
  const [peerInput, setPeerInput] = useState('')
  const [filingsTab, setFilingsTab] = useState<'insider' | 'edgar' | 'exec'>('insider')
  const [filingsLoading, setFilingsLoading] = useState(false)
  const [filingsError, setFilingsError] = useState<string | null>(null)
  const [filings, setFilings] = useState<FilingRow[]>([])

  const avgScore = SENTIMENT_TREND.length
    ? Math.round(
        SENTIMENT_TREND.reduce((a, b) => a + b.score, 0) / SENTIMENT_TREND.length
      )
    : 0
  const scorePct = Math.min(100, Math.max(0, avgScore))

  const newsQueryTicker = useMemo(() => (ticker || '').trim().toUpperCase(), [ticker])
  const resolvedPeerInput = useMemo(() => {
    if (peerInput.trim()) return peerInput
    const defaults = DEFAULT_PEERS_BY_TICKER[newsQueryTicker] || ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META']
    return defaults.join(', ')
  }, [peerInput, newsQueryTicker])

  useEffect(() => {
    if (activeTab !== 'news') return
    if (!newsQueryTicker) return
    let cancelled = false
    setNewsLoading(true)
    setNewsError(null)
    fetch(`${backendBase}/api/news?ticker=${encodeURIComponent(newsQueryTicker)}&limit=12`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((items: NewsItem[]) => {
        if (!cancelled) setNewsItems(Array.isArray(items) ? items : [])
      })
      .catch(() => {
        if (cancelled) return
        // Frontend demo fallback if backend is unreachable.
        setNewsError(null)
        setNewsItems(NEWS_FALLBACK)
      })
      .finally(() => {
        if (!cancelled) setNewsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeTab, newsQueryTicker, backendBase])

  useEffect(() => {
    if (activeTab !== 'benchmarking') return
    if (!newsQueryTicker) return
    let cancelled = false
    setBenchmarkLoading(true)
    setBenchmarkError(null)
    const peersCsv = resolvedPeerInput
      .split(',')
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean)
      .join(',')
    fetch(
      `${backendBase}/api/benchmark?ticker=${encodeURIComponent(newsQueryTicker)}&peers=${encodeURIComponent(peersCsv)}&limit=8`
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((items: BenchmarkItem[]) => {
        if (!cancelled) setBenchmarkItems(Array.isArray(items) ? items : [])
      })
      .catch(() => {
        if (!cancelled) setBenchmarkError('Could not load benchmark data. Try again later.')
      })
      .finally(() => {
        if (!cancelled) setBenchmarkLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeTab, newsQueryTicker, resolvedPeerInput, backendBase])

  const bestByChange = useMemo(() => {
    const valid = benchmarkItems.filter((x) => typeof x.change_pct === 'number')
    if (!valid.length) return null
    return [...valid].sort((a, b) => (b.change_pct as number) - (a.change_pct as number))[0]
  }, [benchmarkItems])

  const bestByMarketCap = useMemo(() => {
    const valid = benchmarkItems.filter((x) => typeof x.market_cap === 'number')
    if (!valid.length) return null
    return [...valid].sort((a, b) => (b.market_cap as number) - (a.market_cap as number))[0]
  }, [benchmarkItems])

  const bestByPE = useMemo(() => {
    const valid = benchmarkItems.filter((x) => typeof x.pe_ratio === 'number' && (x.pe_ratio as number) > 0)
    if (!valid.length) return null
    return [...valid].sort((a, b) => (a.pe_ratio as number) - (b.pe_ratio as number))[0]
  }, [benchmarkItems])

  // Load latest EDGAR filings when Filings tab → "EDGAR Filings" is active.
  useEffect(() => {
    if (activeTab !== 'filings' || filingsTab !== 'edgar') return
    let cancelled = false
    setFilingsLoading(true)
    setFilingsError(null)
    fetch(`${backendBase}/api/filings/recent?ticker=${encodeURIComponent(ticker)}&limit=20`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((items: FilingRow[]) => {
        if (!cancelled) setFilings(Array.isArray(items) ? items : [])
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFilingsError(err instanceof Error ? err.message : 'Could not load filings.')
        }
      })
      .finally(() => {
        if (!cancelled) setFilingsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeTab, filingsTab, backendBase, ticker])

  return (
    <div className="CompanyDetail">
      <aside className="CompanyDetailSidebar">
        <button type="button" className="CompanyDetailBack" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <div className="CompanyDetailHeader">
          <span className="CompanyDetailLogo">{ticker.slice(0, 2)}</span>
          <div>
            <div className="CompanyDetailTicker">{ticker}</div>
            <div className="CompanyDetailName">{companyName}</div>
          </div>
        </div>
        <button
          type="button"
          className={`CompanyDetailBtnFav ${favorited ? 'CompanyDetailBtnFavActive' : ''}`}
          onClick={() => setFavorited(!favorited)}
        >
          ★ {favorited ? 'In favorites' : 'Add to favorites'}
        </button>
        <div className="CompanyDetailCard">
          <div className="CompanyDetailCardTitle">Average Earnings Call Sentiment</div>
            <div className="CompanyDetailGaugeWrap">
            <div className="CompanyDetailGauge">
              <div
                className="CompanyDetailGaugeFill"
                style={{ height: `${scorePct}%` }}
              />
              <span className="CompanyDetailGaugeScore">{avgScore}</span>
              <span className="CompanyDetailGaugeLabel">Average Score</span>
            </div>
          </div>
          <button type="button" className="CompanyDetailBtnChart">
            View Price vs Sentiment chart
          </button>
        </div>
      </aside>

      <main className="CompanyDetailMain">
        <div className="CompanyDetailToolbar">
          <nav className="CompanyDetailTabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`CompanyDetailTab ${activeTab === tab.id ? 'CompanyDetailTabActive' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {'icon' in tab && tab.icon ? <span aria-hidden>{tab.icon}</span> : null}
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="CompanyDetailSearchWrap">
            <span className="CompanyDetailSearchIcon" aria-hidden>🔍</span>
            <input
              type="search"
              className="CompanyDetailSearch"
              placeholder="Search the company transcripts"
              value={searchTranscripts}
              onChange={(e) => setSearchTranscripts(e.target.value)}
            />
          </div>
        </div>

        {activeTab === 'sentiment' && (
          <>
            <section className="CompanyDetailChartSection">
              <div className="CompanyDetailChartHeader">
                <h2 className="CompanyDetailChartTitle">
                  Earnings Sentiment Score Trend for {ticker}
                </h2>
                <div className="CompanyDetailPeriods">
                  {PERIODS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`CompanyDetailPeriod ${period === p ? 'CompanyDetailPeriodActive' : ''}`}
                      onClick={() => setPeriod(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button type="button" className="CompanyDetailExpand" title="Expand">⤢</button>
                </div>
              </div>
              <div className="CompanyDetailTrendChart">
                <div className="CompanyDetailTrendYAxis">Sentiment 0–100</div>
                <div className="CompanyDetailTrendInner">
                  {/* Price area (light green) - simplified */}
                  <div className="CompanyDetailTrendPriceArea" />
                  {/* Line trend: dots and line */}
                  <div className="CompanyDetailTrendLineWrap">
                    {SENTIMENT_TREND.map((point, i) => (
                      <div
                        key={point.period}
                        className="CompanyDetailTrendPoint"
                        style={{
                          left: `${(i / (SENTIMENT_TREND.length - 1)) * 100}%`,
                          bottom: `${point.score}%`,
                        }}
                        title={`Score: ${point.score} | +ve ${point.positive}% | -ve ${point.negative}%`}
                      >
                        <span className="CompanyDetailTrendDot" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="CompanyDetailTrendXAxis">
                  {SENTIMENT_TREND.map((p) => (
                    <span key={p.period}>{p.period}</span>
                  ))}
                </div>
                <div className="CompanyDetailTrendPriceAxis">$160 – $320</div>
              </div>
            </section>

            <section className="CompanyDetailChartSection">
              <h2 className="CompanyDetailChartTitle">Quarterly Sentiment Trend</h2>
              <div className="CompanyDetailQuarterlyBars">
                {QUARTERLY_SENTIMENT.map((q) => (
                  <div key={q.quarter} className="CompanyDetailQuarterBarWrap">
                    <div className="CompanyDetailQuarterBar">
                      <div
                        className="CompanyDetailQuarterSegment CompanyDetailQuarterNeutral"
                        style={{ height: `${100 - q.positive - q.negative}%` }}
                      />
                      <div
                        className="CompanyDetailQuarterSegment CompanyDetailQuarterNegative"
                        style={{ height: `${q.negative}%` }}
                      />
                      <div
                        className="CompanyDetailQuarterSegment CompanyDetailQuarterPositive"
                        style={{ height: `${q.positive}%` }}
                      />
                    </div>
                    <span className="CompanyDetailQuarterLabel">{q.quarter}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === 'rev-eps' && (
          <section className="EarningsDataSection">
            <div className="EarningsDataHeader">
              <h2 className="EarningsDataTitle">Earnings Data</h2>
              <div className="EarningsDataIcons">
                <button type="button" className="EarningsDataIconBtn" title="Line chart">📈</button>
                <button type="button" className="EarningsDataIconBtn" title="Grid view">⊞</button>
              </div>
            </div>
            <div className="EarningsDataCharts">
              <div className="EarningsDataPanel">
                <h3 className="EarningsDataPanelTitle">Revenue</h3>
                <div className="EarningsDataScatterWrap">
                  <div className="EarningsDataYAxis">
                    {[0, 40, 80, 120, 160].map((v) => (
                      <span key={v}>{v === 0 ? '0' : `${v}.0B`}</span>
                    ))}
                  </div>
                  <div className="EarningsDataChartArea">
                    <div className="EarningsDataGrid" />
                    <div className="EarningsDataScatter">
                      {REVENUE_DATA.map((d, i) => (
                        <div
                          key={i}
                          className="EarningsDataScatterRow"
                          style={{ left: `${(i / (EARNINGS_QUARTERS.length - 1)) * 100}%` }}
                        >
                          <span
                            className="EarningsDataDot EarningsDataDotActual"
                            style={{ bottom: `${(d.actual / REVENUE_Y_MAX) * 100}%` }}
                            title={`Actual: ${d.actual}B`}
                          />
                          <span
                            className="EarningsDataDot EarningsDataDotEstimate"
                            style={{ bottom: `${(d.estimate / REVENUE_Y_MAX) * 100}%` }}
                            title={`Estimate: ${d.estimate}B`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="EarningsDataXAxis EarningsDataXAxisQuarters">
                    {EARNINGS_QUARTERS.map((q) => (
                      <span key={q}>{q}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="EarningsDataPanel">
                <h3 className="EarningsDataPanelTitle">EPS</h3>
                <div className="EarningsDataScatterWrap">
                  <div className="EarningsDataYAxis">
                    {['$0.00', '$0.75', '$1.50', '$2.25', '$3.00'].map((v) => (
                      <span key={v}>{v}</span>
                    ))}
                  </div>
                  <div className="EarningsDataChartArea">
                    <div className="EarningsDataGrid" />
                    <div className="EarningsDataScatter">
                      {EPS_DATA.map((d, i) => (
                        <div
                          key={i}
                          className="EarningsDataScatterRow"
                          style={{ left: `${(i / (EARNINGS_QUARTERS.length - 1)) * 100}%` }}
                        >
                          <span
                            className="EarningsDataDot EarningsDataDotActual"
                            style={{ bottom: `${(d.actual / EPS_Y_MAX) * 100}%` }}
                            title={`Actual: $${d.actual.toFixed(2)}`}
                          />
                          <span
                            className="EarningsDataDot EarningsDataDotEstimate"
                            style={{ bottom: `${(d.estimate / EPS_Y_MAX) * 100}%` }}
                            title={`Estimate: $${d.estimate.toFixed(2)}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="EarningsDataXAxis EarningsDataXAxisQuarters">
                    {EARNINGS_QUARTERS.map((q) => (
                      <span key={q}>{q}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'overview' && (
          <section className="CompanyDetailOverviewSection">
            <div className="CompanyDetailOverviewGrid">
              {Object.entries(OVERVIEW_PROFILE).map(([label, value]) => (
                <div key={label} className="CompanyDetailOverviewProfileRow">
                  <span className="CompanyDetailOverviewLabel">{label}</span>
                  <span className="CompanyDetailOverviewValue">
                    {label === 'Website' ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="CompanyDetailOverviewLink">{value}</a>
                    ) : (
                      value
                    )}
                  </span>
                </div>
              ))}
            </div>
            <h2 className="CompanyDetailOverviewHeading">Company Description</h2>
            <div className="CompanyDetailOverviewDescription">{OVERVIEW_DESCRIPTION}</div>
            <div className="CompanyDetailOverviewCardsRow">
              <div className="CompanyDetailOverviewCard">
                <h3 className="CompanyDetailOverviewCardTitle">Profitability Metrics (TTM)</h3>
                <div className="CompanyDetailOverviewCardRows">
                  {OVERVIEW_PROFITABILITY.map(([label, value]) => (
                    <div key={label} className="CompanyDetailOverviewCardRow">
                      <span className="CompanyDetailOverviewCardLabel">{label}</span>
                      <span className="CompanyDetailOverviewCardValue">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="CompanyDetailOverviewCard">
                <h3 className="CompanyDetailOverviewCardTitle">Financial Strength</h3>
                <div className="CompanyDetailOverviewCardRows">
                  {OVERVIEW_FINANCIAL_STRENGTH.map(([label, value]) => (
                    <div key={label} className="CompanyDetailOverviewCardRow">
                      <span className="CompanyDetailOverviewCardLabel">{label}</span>
                      <span className="CompanyDetailOverviewCardValue">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="CompanyDetailOverviewCardsRow">
              <div className="CompanyDetailOverviewCard">
                <h3 className="CompanyDetailOverviewCardTitle">Valuation</h3>
                <div className="CompanyDetailOverviewCardRows">
                  {OVERVIEW_VALUATION.map(([label, value]) => (
                    <div key={label} className="CompanyDetailOverviewCardRow">
                      <span className="CompanyDetailOverviewCardLabel">{label}</span>
                      <span className="CompanyDetailOverviewCardValue">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="CompanyDetailOverviewCard">
                <h3 className="CompanyDetailOverviewCardTitle">Efficiency & Liquidity</h3>
                <div className="CompanyDetailOverviewCardRows">
                  {OVERVIEW_EFFICIENCY.map(([label, value]) => (
                    <div key={label} className="CompanyDetailOverviewCardRow">
                      <span className="CompanyDetailOverviewCardLabel">{label}</span>
                      <span className="CompanyDetailOverviewCardValue">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="CompanyDetailOverviewCardsRow CompanyDetailOverviewCardsRowSingle">
              <div className="CompanyDetailOverviewCard">
                <h3 className="CompanyDetailOverviewCardTitle">Momentum & Technicals</h3>
                <div className="CompanyDetailOverviewCardRows">
                  {OVERVIEW_MOMENTUM.map(([label, value]) => (
                    <div key={label} className="CompanyDetailOverviewCardRow">
                      <span className="CompanyDetailOverviewCardLabel">{label}</span>
                      <span className="CompanyDetailOverviewCardValue">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'benchmarking' && (
          <section className="CompanyDetailBenchmarkSection">
            <div className="CompanyDetailBenchmarkHeader">
              <h2 className="CompanyDetailBenchmarkTitle">Cross-Company Benchmarking</h2>
              <div className="CompanyDetailBenchmarkControls">
                <label className="CompanyDetailBenchmarkLabel">
                  Peers
                  <input
                    className="CompanyDetailBenchmarkInput"
                    value={peerInput}
                    onChange={(e) => setPeerInput(e.target.value)}
                    placeholder="AAPL, MSFT, AMZN, GOOGL, META"
                  />
                </label>
              </div>
            </div>

            <div className="CompanyDetailBenchmarkHighlights">
              <div className="CompanyDetailBenchmarkHighlight">
                <span className="CompanyDetailBenchmarkHighlightLabel">Top 1D Change</span>
                <span className="CompanyDetailBenchmarkHighlightValue">
                  {bestByChange ? `${bestByChange.ticker} (${(bestByChange.change_pct as number).toFixed(2)}%)` : 'N/A'}
                </span>
              </div>
              <div className="CompanyDetailBenchmarkHighlight">
                <span className="CompanyDetailBenchmarkHighlightLabel">Largest Market Cap</span>
                <span className="CompanyDetailBenchmarkHighlightValue">
                  {bestByMarketCap ? bestByMarketCap.ticker : 'N/A'}
                </span>
              </div>
              <div className="CompanyDetailBenchmarkHighlight">
                <span className="CompanyDetailBenchmarkHighlightLabel">Lowest P/E</span>
                <span className="CompanyDetailBenchmarkHighlightValue">
                  {bestByPE ? `${bestByPE.ticker} (${(bestByPE.pe_ratio as number).toFixed(2)})` : 'N/A'}
                </span>
              </div>
            </div>

            {benchmarkLoading ? <div className="CompanyDetailBenchmarkHint">Loading live benchmark data…</div> : null}
            {benchmarkError ? <div className="CompanyDetailBenchmarkError">{benchmarkError}</div> : null}

            <div className="CompanyDetailBenchmarkTableWrap">
              <table className="CompanyDetailBenchmarkTable">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>1D %</th>
                    <th>Market Cap</th>
                    <th>P/E</th>
                    <th>52W Range</th>
                    <th>Volume</th>
                    <th>Exchange</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkItems.map((b) => (
                    <tr key={b.ticker} className={b.ticker === newsQueryTicker ? 'CompanyDetailBenchmarkRowPrimary' : ''}>
                      <td>{b.ticker}</td>
                      <td title={b.name}>{b.name}</td>
                      <td>{typeof b.price === 'number' ? b.price.toFixed(2) : '—'}</td>
                      <td className={typeof b.change_pct === 'number' && b.change_pct >= 0 ? 'Pos' : 'Neg'}>
                        {typeof b.change_pct === 'number' ? `${b.change_pct >= 0 ? '+' : ''}${b.change_pct.toFixed(2)}%` : '—'}
                      </td>
                      <td>{typeof b.market_cap === 'number' ? `${(b.market_cap / 1_000_000_000).toFixed(2)}B` : '—'}</td>
                      <td>{typeof b.pe_ratio === 'number' ? b.pe_ratio.toFixed(2) : '—'}</td>
                      <td>
                        {typeof b.fifty_two_week_low === 'number' && typeof b.fifty_two_week_high === 'number'
                          ? `${b.fifty_two_week_low.toFixed(2)} - ${b.fifty_two_week_high.toFixed(2)}`
                          : '—'}
                      </td>
                      <td>{typeof b.volume === 'number' ? b.volume.toLocaleString() : '—'}</td>
                      <td>{b.exchange || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!benchmarkLoading && !benchmarkError && benchmarkItems.length === 0 ? (
                <div className="CompanyDetailBenchmarkEmpty">No benchmark data available.</div>
              ) : null}
            </div>
          </section>
        )}

        {activeTab === 'calls' && (
          <section className="CompanyDetailCallsSection">
            <div className="CompanyDetailCallsBar">
              <p className="CompanyDetailCallsNextEarnings">
                Next earnings call on <strong>20th May 2026</strong> for <strong>Q1-2027</strong>
              </p>
              <div className="CompanyDetailCallsBarRight">
                <div className="CompanyDetailSearchWrap CompanyDetailCallsSearch">
                  <span className="CompanyDetailSearchIcon" aria-hidden>🔍</span>
                  <input
                    type="search"
                    className="CompanyDetailSearch"
                    placeholder="Search the company transcripts"
                    value={searchTranscripts}
                    onChange={(e) => setSearchTranscripts(e.target.value)}
                  />
                </div>
                <button type="button" className="CompanyDetailCallsEmailAlert">
                  ★ Add {ticker} to favorites for email alerts
                </button>
              </div>
            </div>
            <h2 className="CompanyDetailCallsGridTitle">Earnings Call Sentiment</h2>
            <div className="CompanyDetailCallsGrid">
              {EARNINGS_CALLS.map((call) => (
                <div key={call.quarter} className="CompanyDetailCallCard">
                  <div className="CompanyDetailCallCardHeader">
                    <div>
                      <span className="CompanyDetailCallQuarter">{call.quarter}</span>
                      <span className="CompanyDetailCallDate"> {call.date}</span>
                    </div>
                    <span className="CompanyDetailCallScoreBadge">{call.score}</span>
                  </div>
                  <div className="CompanyDetailCallSentimentRow">
                    <span className="CompanyDetailCallSentimentItem CompanyDetailCallPositive">
                      <span className="CompanyDetailCallDot CompanyDetailCallDotPositive" /> {call.positive}% Positive
                    </span>
                    <span className="CompanyDetailCallSentimentItem CompanyDetailCallNegative">
                      <span className="CompanyDetailCallDot CompanyDetailCallDotNegative" /> {call.negative}% Negative
                    </span>
                    <span className="CompanyDetailCallSentimentItem CompanyDetailCallNeutral">
                      <span className="CompanyDetailCallDot CompanyDetailCallDotNeutral" /> {call.neutral}% Neutral
                    </span>
                  </div>
                  <button type="button" className="CompanyDetailCallExpand" title="View details">↗</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'filings' && (
          <section className="CompanyDetailFilingsSection">
            <div className="CompanyDetailFilingsTopBar">
              <div className="CompanyDetailFilingsTabs" role="tablist" aria-label="Filings views">
                <button
                  type="button"
                  className={`CompanyDetailFilingsTab ${filingsTab === 'insider' ? 'CompanyDetailFilingsTabActive' : ''}`}
                  onClick={() => setFilingsTab('insider')}
                >
                  Insider Trading
                </button>
                <button
                  type="button"
                  className={`CompanyDetailFilingsTab ${filingsTab === 'edgar' ? 'CompanyDetailFilingsTabActive' : ''}`}
                  onClick={() => setFilingsTab('edgar')}
                >
                  EDGAR Filings
                </button>
                <button
                  type="button"
                  className={`CompanyDetailFilingsTab ${filingsTab === 'exec' ? 'CompanyDetailFilingsTabActive' : ''}`}
                  onClick={() => setFilingsTab('exec')}
                >
                  Key Executives
                </button>
              </div>
              <button type="button" className="CompanyDetailFilingsDateRange">
                Jun 2, 2025 – Mar 19, 2026
              </button>
            </div>

            {filingsTab === 'insider' && (
              <div className="CompanyDetailFilingsInsiderList">
                {[
                  {
                    name: 'Taneja Vaibhav',
                    role: 'officer: Chief Financial Officer',
                    action: 'Sell',
                    delta: '-6.5K',
                    price: '$397.03',
                    remaining: '65.4K',
                    date: 'Mar 05, 2026',
                  },
                  {
                    name: 'Taneja Vaibhav',
                    role: 'officer: Chief Financial Officer',
                    action: 'Buy',
                    delta: '+6.5K',
                    price: '$397.03',
                    remaining: '20.4K',
                    date: 'Mar 05, 2026',
                  },
                  {
                    name: 'Wilson-Thompson Kathleen',
                    role: 'director',
                    action: 'Sell',
                    delta: '-40.0K',
                    price: '$14.99',
                    remaining: '80.9K',
                    date: 'Feb 25, 2026',
                  },
                  {
                    name: 'Wilson-Thompson Kathleen',
                    role: 'director',
                    action: 'Buy',
                    delta: '+40.0K',
                    price: '$14.99',
                    remaining: '45.3K',
                    date: 'Feb 25, 2026',
                  },
                ].map((row) => (
                  <article key={`${row.name}-${row.action}-${row.date}`} className="CompanyDetailInsiderCard">
                    <header className="CompanyDetailInsiderHeader">
                      <div>
                        <div className="CompanyDetailInsiderName">{row.name}</div>
                        <div className="CompanyDetailInsiderRole">{row.role}</div>
                      </div>
                      <button
                        type="button"
                        className={`CompanyDetailInsiderTag ${row.action === 'Buy' ? 'Buy' : 'Sell'}`}
                      >
                        {row.action}
                      </button>
                    </header>
                    <p className="CompanyDetailInsiderMeta">
                      <span className={row.action === 'Buy' ? 'Pos' : 'Neg'}>
                        {row.action === 'Buy' ? 'Bought' : 'Sold'} {row.delta}
                      </span>{' '}
                      @ {row.price} • Remaining: {row.remaining} shares on {row.date}
                    </p>
                    <div className="CompanyDetailInsiderForm">Form 4 ↗</div>
                  </article>
                ))}
              </div>
            )}

            {filingsTab === 'edgar' && (
              <div className="CompanyDetailFilingsEdgar">
                <header className="CompanyDetailFilingsEdgarHeader">
                  <h2 className="CompanyDetailFilingsTitle">EDGAR Filings</h2>
                  {filingsLoading ? <span className="CompanyDetailFilingsHint">Loading…</span> : null}
                  {filingsError ? <span className="CompanyDetailFilingsError">{filingsError}</span> : null}
                </header>
                <div className="CompanyDetailFilingsTableWrap">
                  <table className="CompanyDetailFilingsTable">
                    <thead>
                      <tr>
                        <th>Form</th>
                        <th>Filing date</th>
                        <th>Accession</th>
                        <th>Primary document</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filings.map((f) => (
                        <tr key={f.accession_number}>
                          <td>{f.form}</td>
                          <td>{f.filing_date}</td>
                          <td>{f.accession_number}</td>
                          <td>
                            <a href={f.url} target="_blank" rel="noopener noreferrer">
                              {f.primary_document}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filingsLoading && !filingsError && filings.length === 0 ? (
                    <div className="CompanyDetailFilingsEmpty">No filings found for {ticker}.</div>
                  ) : null}
                </div>
              </div>
            )}

            {filingsTab === 'exec' && (
              <div className="CompanyDetailFilingsExec">
                <h2 className="CompanyDetailFilingsTitle">Key Executives</h2>
                <div className="CompanyDetailExecGrid">
                  {[
                    { name: 'Satya Nadella', title: 'Chief Executive Officer', tenure: '10.2 yrs' },
                    { name: 'Amy Hood', title: 'Chief Financial Officer', tenure: '10.9 yrs' },
                    { name: 'Brad Smith', title: 'Vice Chair & President', tenure: '9.5 yrs' },
                  ].map((e) => (
                    <article key={e.name} className="CompanyDetailExecCard">
                      <div className="CompanyDetailExecAvatar">{e.name.slice(0, 2)}</div>
                      <div className="CompanyDetailExecBody">
                        <div className="CompanyDetailExecName">{e.name}</div>
                        <div className="CompanyDetailExecTitle">{e.title}</div>
                        <div className="CompanyDetailExecTenure">Tenure: {e.tenure}</div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'news' && (
          <section className="CompanyDetailNewsSection">
            <div className="CompanyDetailNewsHeader">
              <h2 className="CompanyDetailNewsTitle">Latest News</h2>
              {newsLoading ? <span className="CompanyDetailNewsHint">Loading…</span> : null}
              {newsError ? <span className="CompanyDetailNewsError">{newsError}</span> : null}
            </div>
            <div className="CompanyDetailNewsGrid">
              {newsItems.map((n) => {
                const domain = domainFromUrl(n.url)
                const favicon = domain
                  ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
                  : ''
                return (
                  <a
                    key={n.url}
                    className="CompanyDetailNewsCard"
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={n.title}
                  >
                    <div className="CompanyDetailNewsThumb" aria-hidden />
                    <div className="CompanyDetailNewsOverlay">
                      <div className="CompanyDetailNewsCardTitle">{n.title}</div>
                      <div className="CompanyDetailNewsMeta">
                        {favicon ? <img className="CompanyDetailNewsFavicon" src={favicon} alt="" /> : null}
                        <span className="CompanyDetailNewsSource">{n.source || domain || 'News'}</span>
                        <span className="CompanyDetailNewsDotSep">•</span>
                        <span className="CompanyDetailNewsDate">{formatNewsDate(n.published_at)}</span>
                      </div>
                    </div>
                  </a>
                )
              })}
              {!newsLoading && !newsError && newsItems.length === 0 ? (
                <div className="CompanyDetailNewsEmpty">No news found for {newsQueryTicker}.</div>
              ) : null}
            </div>
          </section>
        )}

        {activeTab !== 'sentiment' && activeTab !== 'rev-eps' && activeTab !== 'calls' && activeTab !== 'overview' && activeTab !== 'news' && activeTab !== 'benchmarking' && activeTab !== 'filings' && (
          <section className="CompanyDetailPlaceholder">
            <p>{TABS.find((t) => t.id === activeTab)?.label ?? activeTab} view — coming soon.</p>
          </section>
        )}
      </main>
    </div>
  )
}
