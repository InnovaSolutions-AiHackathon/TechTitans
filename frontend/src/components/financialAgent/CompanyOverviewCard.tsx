import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { CompanyOverview, QuoteData } from '../../types'

type Props = {
  quote: QuoteData | null
  overview: CompanyOverview | null
  logoUrl: string | null
  loading: boolean
}

function fmtUsd(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

export default function CompanyOverviewCard({ quote, overview, logoUrl, loading }: Props) {
  const chartData =
    quote?.sparkline?.map((y, i) => ({ i, y })) ??
    []

  if (loading && !overview) {
    return (
      <div className="rounded-2xl border border-emerald-200/50 bg-white/60 p-8 text-center text-sm text-slate-500 backdrop-blur-md">
        Loading company data…
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center text-sm text-slate-500">
        Enter a symbol to load overview and quote.
      </div>
    )
  }

  const tvHref = `https://www.tradingview.com/symbols/${encodeURIComponent(overview.symbol)}/`

  return (
    <motion.section
      id="fa-overview"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="scroll-mt-24 rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-white/90 to-emerald-50/40 p-5 shadow-lg shadow-emerald-900/5 backdrop-blur-md"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex flex-1 gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-emerald-100 text-lg font-bold text-emerald-800">
              {overview.symbol.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{overview.companyName}</h2>
            <p className="text-sm text-emerald-700">
              {overview.symbol} · {overview.exchange}
            </p>
            {quote && (
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-semibold text-slate-900">
                  {quote.price != null ? quote.price.toFixed(2) : '—'}
                </span>
                <span className="text-sm text-slate-500">{quote.currency}</span>
                {quote.changePercent != null && (
                  <span className={quote.changePercent >= 0 ? 'text-sm font-medium text-emerald-600' : 'text-sm font-medium text-rose-600'}>
                    {quote.changePercent >= 0 ? '+' : ''}
                    {quote.changePercent.toFixed(2)}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <a
          href={tvHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          TradingView <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {chartData.length > 1 ? (
        <div className="mt-4 h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="i" hide />
              <Tooltip
                formatter={(v) => (typeof v === 'number' && !Number.isNaN(v) ? v.toFixed(2) : String(v ?? ''))}
              />
              <Line type="monotone" dataKey="y" stroke="#059669" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      <p className="mt-4 text-sm leading-relaxed text-slate-600">{overview.description}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-white/60 px-3 py-2">
          <dt className="text-xs text-slate-500">Sector</dt>
          <dd className="font-medium text-slate-800">{overview.sector}</dd>
        </div>
        <div className="rounded-lg bg-white/60 px-3 py-2">
          <dt className="text-xs text-slate-500">Industry</dt>
          <dd className="font-medium text-slate-800">{overview.industry}</dd>
        </div>
        <div className="rounded-lg bg-white/60 px-3 py-2">
          <dt className="text-xs text-slate-500">Market cap</dt>
          <dd className="font-medium text-slate-800">{fmtUsd(overview.marketCapUsd)}</dd>
        </div>
        <div className="rounded-lg bg-white/60 px-3 py-2">
          <dt className="text-xs text-slate-500">Revenue</dt>
          <dd className="font-medium text-slate-800">{fmtUsd(overview.revenueUsd)}</dd>
        </div>
        <div className="rounded-lg bg-white/60 px-3 py-2">
          <dt className="text-xs text-slate-500">CEO</dt>
          <dd className="font-medium text-slate-800">{overview.ceo}</dd>
        </div>
        <div className="rounded-lg bg-white/60 px-3 py-2">
          <dt className="text-xs text-slate-500">HQ</dt>
          <dd className="font-medium text-slate-800">{overview.headquarters}</dd>
        </div>
      </dl>
    </motion.section>
  )
}
