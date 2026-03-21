/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import './CompareModule.css'

type BenchmarkItem = {
  ticker: string
  name: string
  price: number | null
  change_pct: number | null
  market_cap: number | null
  pe_ratio: number | null
  volume: number | null
}

type FilingItem = {
  ticker: string
  form: string
  filing_date: string
  accession_number: string
  primary_document: string
  url: string
}

type RiskItem = {
  severity: 'Low' | 'Medium' | 'High'
  category: string
  text: string
}

const RISK_MOCK_BY_TICKER: Record<string, { added: RiskItem[]; removed: RiskItem[]; changed: RiskItem[] }> = {
  AMZN: {
    added: [
      { severity: 'Medium', category: 'Market', text: 'Added risk item 1 for AMZN (mock).' },
      { severity: 'High', category: 'Operations', text: 'Added risk item 2 for AMZN (mock).' },
      { severity: 'Low', category: 'Cyber', text: 'Added risk item 3 for AMZN (mock).' },
    ],
    removed: [
      { severity: 'Medium', category: 'Market', text: 'Removed risk item 1 for AMZN (mock).' },
      { severity: 'High', category: 'Operations', text: 'Removed risk item 2 for AMZN (mock).' },
    ],
    changed: [{ severity: 'Medium', category: 'Market', text: 'Changed risk item 1 for AMZN (mock).' }],
  },
  NVDA: {
    added: [
      { severity: 'High', category: 'Supply Chain', text: 'Supplier concentration language strengthened (mock).' },
      { severity: 'Medium', category: 'Regulatory', text: 'Export-control uncertainty disclosure expanded (mock).' },
    ],
    removed: [{ severity: 'Low', category: 'FX', text: 'Reduced explicit FX volatility wording (mock).' }],
    changed: [{ severity: 'Medium', category: 'Demand', text: 'AI demand cyclicality language revised (mock).' }],
  },
}

type Props = {
  backendBase: string
}

const UNIVERSE = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA']
const YEARS = ['2021', '2022', '2023', '2024', '2025']

type DemoKpis = {
  revenue: number
  margin: number
  cashflow: number
  revenueSeries: number[]
  marginSeries: number[]
}

const DEMO_KPI_BY_TICKER: Record<string, DemoKpis> = {
  AMZN: { revenue: 130.0, margin: 38.0, cashflow: 32.0, revenueSeries: [130, 138, 146, 155, 163], marginSeries: [20.0, 21.2, 22.4, 23.6, 24.8] },
  MSFT: { revenue: 134.0, margin: 42.0, cashflow: 36.0, revenueSeries: [134, 140, 147, 154, 160], marginSeries: [24.0, 25.1, 26.0, 26.8, 27.5] },
  AAPL: { revenue: 122.0, margin: 40.0, cashflow: 34.0, revenueSeries: [122, 129, 136, 141, 149], marginSeries: [23.0, 23.8, 24.6, 25.1, 25.8] },
  GOOGL: { revenue: 118.0, margin: 35.0, cashflow: 30.0, revenueSeries: [118, 124, 131, 137, 144], marginSeries: [18.0, 19.1, 20.3, 21.0, 21.8] },
  META: { revenue: 110.0, margin: 33.0, cashflow: 28.0, revenueSeries: [110, 114, 120, 127, 133], marginSeries: [17.0, 18.1, 19.0, 19.8, 20.5] },
  NVDA: { revenue: 108.0, margin: 45.0, cashflow: 29.0, revenueSeries: [108, 118, 132, 149, 170], marginSeries: [26.0, 27.8, 29.5, 31.1, 32.4] },
  TSLA: { revenue: 96.0, margin: 29.0, cashflow: 21.0, revenueSeries: [96, 104, 111, 117, 123], marginSeries: [14.0, 15.2, 16.0, 16.6, 17.1] },
}

function toFixedOrDash(v: number | null | undefined, digits = 1): string {
  return typeof v === 'number' && Number.isFinite(v) ? v.toFixed(digits) : '-'
}

function metricDiffPct(a: number | null | undefined, b: number | null | undefined): string {
  if (typeof a !== 'number' || typeof b !== 'number' || a === 0) return '-'
  const d = ((b - a) / Math.abs(a)) * 100
  return `${d > 0 ? '+' : ''}${d.toFixed(1)}%`
}

function tinySeries(v: number | null | undefined): number[] {
  if (typeof v !== 'number' || !Number.isFinite(v)) return [0, 0, 0, 0, 0]
  return [v * 0.82, v * 0.88, v * 0.93, v * 0.97, v]
}

function TinyLineChart({
  left,
  right,
  leftLabel,
  rightLabel,
  xLabels,
}: {
  left: number[]
  right: number[]
  leftLabel: string
  rightLabel: string
  xLabels: string[]
}) {
  const w = 520
  const h = 220
  const all = [...left, ...right]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const range = max - min || 1
  const step = 110
  const x = (i: number) => 40 + i * step
  const y = (v: number) => 180 - ((v - min) / range) * 130
  const mk = (arr: number[]) => arr.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="CompareChartSvg" role="img" aria-label="Comparison chart">
      <line x1="40" y1="180" x2="500" y2="180" className="CompareAxis" />
      <polyline points={mk(left)} className="CompareLine CompareLineA" />
      <polyline points={mk(right)} className="CompareLine CompareLineB" />
      {left.map((v, i) => (
        <circle key={`a-${i}`} cx={x(i)} cy={y(v)} r="3" className="CompareDot CompareDotA" />
      ))}
      {right.map((v, i) => (
        <circle key={`b-${i}`} cx={x(i)} cy={y(v)} r="3" className="CompareDot CompareDotB" />
      ))}
      <text x="16" y="184" className="CompareAxisLabel">
        0
      </text>
      {xLabels.map((xl, i) => (
        <text key={xl} x={x(i) - 10} y="195" className="CompareAxisLabel">
          {xl}
        </text>
      ))}
      <text x="60" y="210" className="CompareLegend CompareLegendA">
        {leftLabel}
      </text>
      <text x="140" y="210" className="CompareLegend CompareLegendB">
        {rightLabel}
      </text>
    </svg>
  )
}

export default function CompareModule({ backendBase }: Props) {
  const [selected, setSelected] = useState('AMZN')
  const [peer, setPeer] = useState('MSFT')
  const [items, setItems] = useState<BenchmarkItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filingsLoading, setFilingsLoading] = useState(false)
  const [filingsError, setFilingsError] = useState<string | null>(null)
  const [filings, setFilings] = useState<FilingItem[]>([])
  const [riskTicker, setRiskTicker] = useState('AMZN')

  const peersCsv = useMemo(
    () => UNIVERSE.filter((t) => t !== selected).join(','),
    [selected]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${backendBase}/api/benchmark?ticker=${encodeURIComponent(selected)}&peers=${encodeURIComponent(peersCsv)}&limit=8`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((data: BenchmarkItem[]) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load live comparison data.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [backendBase, selected, peersCsv])

  useEffect(() => {
    let cancelled = false
    setFilingsLoading(true)
    setFilingsError(null)
    fetch(`${backendBase}/api/filings/recent?ticker=${encodeURIComponent(selected)}&limit=8`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((data: FilingItem[]) => {
        if (!cancelled) setFilings(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setFilingsError('Unable to load recent filings.')
      })
      .finally(() => {
        if (!cancelled) setFilingsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [backendBase, selected])

  const selectedItem = items.find((x) => x.ticker === selected) || null
  const peerItem = items.find((x) => x.ticker === peer) || null
  const selectedDemo = DEMO_KPI_BY_TICKER[selected]
  const peerDemo = DEMO_KPI_BY_TICKER[peer]

  const fallbackRevenue = typeof selectedItem?.market_cap === 'number' ? selectedItem.market_cap / 14_000_000_000 : null
  const fallbackMargin = typeof selectedItem?.pe_ratio === 'number' ? selectedItem.pe_ratio : null
  const fallbackCash = typeof selectedItem?.volume === 'number' ? selectedItem.volume / 10_000_000 : null
  const fallbackPeerRevenue = typeof peerItem?.market_cap === 'number' ? peerItem.market_cap / 14_000_000_000 : null
  const fallbackPeerMargin = typeof peerItem?.pe_ratio === 'number' ? peerItem.pe_ratio : null
  const fallbackPeerCash = typeof peerItem?.volume === 'number' ? peerItem.volume / 10_000_000 : null

  const comparisonRows = [
    {
      metric: 'Revenue',
      left: selectedDemo?.revenue ?? fallbackRevenue,
      right: peerDemo?.revenue ?? fallbackPeerRevenue,
      format: (v: number | null) => toFixedOrDash(v, 1),
    },
    {
      metric: 'Margin',
      left: selectedDemo?.margin ?? fallbackMargin,
      right: peerDemo?.margin ?? fallbackPeerMargin,
      format: (v: number | null) => toFixedOrDash(v, 1),
    },
    {
      metric: 'Cashflow',
      left: selectedDemo?.cashflow ?? fallbackCash,
      right: peerDemo?.cashflow ?? fallbackPeerCash,
      format: (v: number | null) => toFixedOrDash(v, 1),
    },
  ]
  const riskPack =
    RISK_MOCK_BY_TICKER[riskTicker] ||
    {
      added: [{ severity: 'Medium', category: 'Market', text: `Added risk item 1 for ${riskTicker} (mock).` }],
      removed: [{ severity: 'Low', category: 'Operations', text: `Removed risk item 1 for ${riskTicker} (mock).` }],
      changed: [{ severity: 'Medium', category: 'Market', text: `Changed risk item 1 for ${riskTicker} (mock).` }],
    }

  return (
    <div className="CompareWrap">
      <h2 className="CompareTitle">Compare</h2>
      <div className="CompareSub">Compare live market metrics and trends against a peer.</div>

      <div className="CompareChipRow">
        {UNIVERSE.map((t) => (
          <button
            key={t}
            type="button"
            className={`CompareChip ${selected === t ? 'CompareChipActive' : ''}`}
            onClick={() => {
              setSelected(t)
              if (t === peer) {
                const fallback = UNIVERSE.find((x) => x !== t)
                if (fallback) setPeer(fallback)
              }
            }}
          >
            {t}
          </button>
        ))}
        <span className="ComparePeersLabel">Peers:</span>
        {UNIVERSE.filter((t) => t !== selected).map((t) => (
          <button
            key={`p-${t}`}
            type="button"
            className={`CompareChip ComparePeerChip ${peer === t ? 'CompareChipActive' : ''}`}
            onClick={() => setPeer(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="CompareTableCard">
        {loading ? <div className="CompareHint">Loading live data...</div> : null}
        {error ? <div className="CompareErr">{error}</div> : null}
        <table className="CompareTable">
          <thead>
            <tr>
              <th>Metric</th>
              <th>{selected}</th>
              <th>{peer}</th>
              <th>Diff %</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((r) => (
              <tr key={r.metric}>
                <td>{r.metric}</td>
                <td>{r.format(r.left)}</td>
                <td>{r.format(r.right)}</td>
                <td className="CompareDiff">{metricDiffPct(r.left, r.right)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="CompareCharts">
        <div className="CompareChartCard">
          <h3>Revenue</h3>
          <TinyLineChart
            left={selectedDemo?.revenueSeries ?? tinySeries(fallbackRevenue)}
            right={peerDemo?.revenueSeries ?? tinySeries(fallbackPeerRevenue)}
            leftLabel={selected}
            rightLabel={peer}
            xLabels={YEARS}
          />
        </div>
        <div className="CompareChartCard">
          <h3>Margin</h3>
          <TinyLineChart
            left={selectedDemo?.marginSeries ?? tinySeries(fallbackMargin)}
            right={peerDemo?.marginSeries ?? tinySeries(fallbackPeerMargin)}
            leftLabel={selected}
            rightLabel={peer}
            xLabels={YEARS}
          />
        </div>
      </div>

      <div className="CompareFilingsCard">
        <div className="CompareFilingsHeader">
          <h3>Recent SEC Filings ({selected})</h3>
          {filingsLoading ? <span className="CompareHint">Loading filings...</span> : null}
          {filingsError ? <span className="CompareErr">{filingsError}</span> : null}
        </div>
        <div className="CompareFilingsTableWrap">
          <table className="CompareFilingsTable">
            <thead>
              <tr>
                <th>Form</th>
                <th>Filing Date</th>
                <th>Accession</th>
                <th>Primary Document</th>
              </tr>
            </thead>
            <tbody>
              {filings.map((f) => (
                <tr key={`${f.accession_number}-${f.primary_document}`}>
                  <td>{f.form || '-'}</td>
                  <td>{f.filing_date || '-'}</td>
                  <td>{f.accession_number || '-'}</td>
                  <td>
                    {f.url ? (
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="CompareFilingLink">
                        {f.primary_document || 'Open'}
                      </a>
                    ) : (
                      f.primary_document || '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filingsLoading && !filingsError && filings.length === 0 ? (
            <div className="CompareHint">No recent filings found.</div>
          ) : null}
        </div>
      </div>

      <div className="RiskWrap">
        <div className="RiskHeader">
          <div>
            <h3 className="RiskTitle">Risk &amp; Red Flags</h3>
            <div className="RiskSub">Added, removed, and changed risks with severity and timeline.</div>
          </div>
          <div className="RiskTickerRow">
            {UNIVERSE.map((t) => (
              <button
                key={`risk-${t}`}
                type="button"
                className={`CompareChip ${riskTicker === t ? 'CompareChipActive' : ''}`}
                onClick={() => setRiskTicker(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="RiskColumns">
          <div className="RiskCol RiskColAdded">
            <div className="RiskColTitle">Added ({riskPack.added.length})</div>
            {riskPack.added.map((r, i) => (
              <div key={`a-${i}`} className="RiskCard">
                <span className={`RiskSeverity Risk${r.severity}`}>{r.severity}</span>
                <span className="RiskCategory">{r.category}</span>
                <div className="RiskText">{r.text}</div>
              </div>
            ))}
          </div>
          <div className="RiskCol RiskColRemoved">
            <div className="RiskColTitle">Removed ({riskPack.removed.length})</div>
            {riskPack.removed.map((r, i) => (
              <div key={`r-${i}`} className="RiskCard">
                <span className={`RiskSeverity Risk${r.severity}`}>{r.severity}</span>
                <span className="RiskCategory">{r.category}</span>
                <div className="RiskText">{r.text}</div>
              </div>
            ))}
          </div>
          <div className="RiskCol RiskColChanged">
            <div className="RiskColTitle">Changed ({riskPack.changed.length})</div>
            {riskPack.changed.map((r, i) => (
              <div key={`c-${i}`} className="RiskCard">
                <span className={`RiskSeverity Risk${r.severity}`}>{r.severity}</span>
                <span className="RiskCategory">{r.category}</span>
                <div className="RiskText">{r.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="RiskTimelineCard">
          <div className="RiskTimelineTitle">Risk timeline</div>
          <svg viewBox="0 0 960 230" className="RiskTimelineSvg" role="img" aria-label="Risk timeline">
            <rect x="60" y="20" width="860" height="170" className="RiskTimelineArea" />
            <line x1="60" y1="20" x2="60" y2="190" className="RiskAxis" />
            <line x1="60" y1="190" x2="920" y2="190" className="RiskAxis" />
            <text x="24" y="193" className="RiskAxisLabel">0%</text>
            <text x="24" y="148" className="RiskAxisLabel">25%</text>
            <text x="24" y="105" className="RiskAxisLabel">50%</text>
            <text x="24" y="62" className="RiskAxisLabel">75%</text>
            <text x="20" y="24" className="RiskAxisLabel">100%</text>
            <text x="60" y="205" className="RiskAxisLabel">2025-01-01</text>
            <text x="220" y="205" className="RiskAxisLabel">2025-02-01</text>
            <text x="390" y="205" className="RiskAxisLabel">2025-03-01</text>
            <text x="560" y="205" className="RiskAxisLabel">2025-04-01</text>
            <text x="730" y="205" className="RiskAxisLabel">2025-05-01</text>
            <text x="885" y="205" className="RiskAxisLabel">2025-06-01</text>
          </svg>
          <div className="RiskLegend"><span className="RiskLegendDot" /> Market</div>
        </div>
      </div>
    </div>
  )
}

