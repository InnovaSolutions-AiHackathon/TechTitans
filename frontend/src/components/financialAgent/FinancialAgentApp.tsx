import { useCallback, useState } from 'react'
import { hasAnthropicKey } from '../../config'
import {
  analyzeCompanyFull,
  buildKPIData,
  fetchCompanyLogo,
  fetchOverviewAndFilings,
  fetchQuote,
  modelingCopilotPrompt,
  semanticSearch,
} from '../../services/api'
import type {
  CompanyOverview,
  FullAnalysisResult,
  KPIData,
  OverviewAndFilingsPayload,
  QuoteData,
  SECFiling,
  SemanticSearchResult,
} from '../../types'
import AIAnalysisPanel from './AIAnalysisPanel'
import BenchmarkPanel from './BenchmarkPanel'
import CompanyOverviewCard from './CompanyOverviewCard'
import CompanySearch from './CompanySearch'
import EarningsIntelligencePanel from './EarningsIntelligencePanel'
import FinancialAgentHeader from './FinancialAgentHeader'
import ModelingCopilot from './ModelingCopilot'
import RedFlagsPanel from './RedFlagsPanel'
import SECFilingsPanel from './SECFilingsPanel'
import SemanticSearchPanel from './SemanticSearchPanel'

type Props = {
  onGoUpload?: () => void
  onGoReports?: () => void
  onGoChat?: () => void
}

export default function FinancialAgentApp({ onGoUpload, onGoReports, onGoChat }: Props) {
  const [symbol, setSymbol] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [loadingAsk, setLoadingAsk] = useState(false)
  const [loadingModel, setLoadingModel] = useState(false)

  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [overview, setOverview] = useState<CompanyOverview | null>(null)
  const [filings, setFilings] = useState<SECFiling[]>([])
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [full, setFull] = useState<FullAnalysisResult | null>(null)
  const [searchResult, setSearchResult] = useState<SemanticSearchResult | null>(null)
  const [modelOut, setModelOut] = useState<string | null>(null)

  const jump = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleSearch = async (sym: string) => {
    setError(null)
    setSymbol(sym)
    setFull(null)
    setSearchResult(null)
    setModelOut(null)
    setOverview(null)
    setFilings([])
    setKpis(null)
    setQuote(null)
    setLogoUrl(null)

    setLoadingQuote(true)
    let ofBundle: OverviewAndFilingsPayload | null = null
    try {
      const [q, logo, of] = await Promise.all([
        fetchQuote(sym),
        fetchCompanyLogo(sym),
        fetchOverviewAndFilings(sym),
      ])
      ofBundle = of
      setQuote(q)
      setLogoUrl(logo)
      setOverview(of.overview)
      setFilings(of.filings)
      const k = buildKPIData(sym, of.overview)
      setKpis(k)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingQuote(false)
    }

    if (!ofBundle) return

    if (!hasAnthropicKey()) {
      setFull({
        analysis: 'Add VITE_ANTHROPIC_API_KEY to .env and restart the dev server for AI panels.',
        redFlags: [],
        earnings: { sentiment: 'neutral', guidanceSummary: '—', themes: [], signals: [] },
        peers: [],
      })
      return
    }

    setLoadingAnalysis(true)
    try {
      const k = buildKPIData(sym, ofBundle.overview)
      const analysis = await analyzeCompanyFull(sym, ofBundle.overview, k)
      setFull(analysis)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const handleAsk = async (q: string) => {
    if (!overview) return
    setLoadingAsk(true)
    setSearchResult(null)
    try {
      const res = await semanticSearch(q, symbol || overview.symbol, overview)
      setSearchResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingAsk(false)
    }
  }

  const handleModel = async (prompt: string) => {
    if (!overview || !kpis) return
    setLoadingModel(true)
    setModelOut(null)
    try {
      const text = await modelingCopilotPrompt(symbol || overview.symbol, overview, kpis, prompt)
      setModelOut(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingModel(false)
    }
  }

  const busyInitial = loadingQuote
  const hasSymbol = Boolean(symbol && overview)

  return (
    <div className="min-h-0 text-slate-900">
      <FinancialAgentHeader onJump={jump} />

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
      ) : null}

      <div className="space-y-5">
        <CompanySearch loading={busyInitial} onSearch={handleSearch} />

        <CompanyOverviewCard quote={quote} overview={overview} logoUrl={logoUrl} loading={busyInitial} />

        <div className="grid gap-5 lg:grid-cols-2">
          <AIAnalysisPanel analysis={full?.analysis ?? null} loading={loadingAnalysis} />
          <RedFlagsPanel items={full?.redFlags ?? []} loading={loadingAnalysis} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <EarningsIntelligencePanel data={full?.earnings ?? null} loading={loadingAnalysis} />
          <BenchmarkPanel peers={full?.peers ?? []} loading={loadingAnalysis} />
        </div>

        <SECFilingsPanel filings={filings} />

        <SemanticSearchPanel
          disabled={!hasSymbol}
          loading={loadingAsk}
          onAsk={handleAsk}
          result={searchResult}
        />

        <ModelingCopilot
          disabled={!hasSymbol || !kpis}
          loading={loadingModel}
          onSubmit={handleModel}
          output={modelOut}
        />
      </div>

      <div className="mt-8 rounded-xl border border-amber-200/60 bg-amber-50/80 p-4 text-xs text-amber-950">
        <strong>Security:</strong> API keys in the browser are visible to users. For production, proxy Claude through your
        own backend. Keys in <code className="rounded bg-white/80 px-1">.env</code> are bundled at build time for Vite —
        never commit real keys.
      </div>

      {(onGoUpload || onGoReports || onGoChat) && (
        <footer className="mt-6 flex flex-wrap gap-2 border-t border-emerald-100 pt-4 text-sm">
          {onGoUpload ? (
            <button type="button" className="text-emerald-700 underline" onClick={onGoUpload}>
              Research / Upload
            </button>
          ) : null}
          {onGoReports ? (
            <button type="button" className="text-emerald-700 underline" onClick={onGoReports}>
              AI Reports
            </button>
          ) : null}
          {onGoChat ? (
            <button type="button" className="text-emerald-700 underline" onClick={onGoChat}>
              Chat with Analyst
            </button>
          ) : null}
        </footer>
      )}
    </div>
  )
}
