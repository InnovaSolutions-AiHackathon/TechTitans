export type QuoteData = {
  symbol: string
  price: number | null
  change: number | null
  changePercent: number | null
  currency: string
  marketState?: string
  /** Last N closes for sparkline */
  sparkline?: number[]
}

export type CompanyOverview = {
  companyName: string
  symbol: string
  sector: string
  industry: string
  description: string
  employees: number | null
  headquarters: string
  website: string
  marketCapUsd: number | null
  revenueUsd: number | null
  netIncomeUsd: number | null
  fiscalYearEnd: string
  ceo: string
  exchange: string
}

export type SECFiling = {
  form: string
  filedAt: string
  description: string
  url: string
}

export type KPIData = {
  revenue: number | null
  revenueGrowthPct: number | null
  netMarginPct: number | null
  roePct: number | null
  debtToEquity: number | null
  freeCashFlowUsd: number | null
  eps: number | null
  peRatio: number | null
}

export type RedFlagItem = {
  severity: 'low' | 'medium' | 'high'
  title: string
  detail: string
}

export type EarningsIntelligence = {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  guidanceSummary: string
  themes: string[]
  signals: string[]
}

export type PeerBenchmarkRow = {
  ticker: string
  name: string
  metric: string
  vsSubject: string
}

export type FullAnalysisResult = {
  analysis: string
  redFlags: RedFlagItem[]
  earnings: EarningsIntelligence
  peers: PeerBenchmarkRow[]
}

export type SemanticSearchResult = {
  answer: string
  citations: string[]
  confidence: number
}

export type OverviewAndFilingsPayload = {
  overview: CompanyOverview
  filings: SECFiling[]
}
