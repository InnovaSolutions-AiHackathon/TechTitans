# Existing Model Spec (Repo Working Agreement)

You are working with the "Financial Research Assistant" project: a React + TypeScript + Vite frontend that generates an AI-driven, continuous financial research report for a given stock ticker.

## Core Purpose
Given a ticker symbol, the app:
1) Fetches fundamentals/market data (Alpha Vantage + Yahoo Finance fallback)
2) Fetches SEC filings metadata (SEC EDGAR)
3) Builds derived KPI metrics for modeling
4) Calls Claude (Anthropic) to generate: executive summary, key risks, opportunities, and sentiment
5) Calls Claude again to produce earnings-call intelligence (tone + guidance change) using available transcript context (currently transcript fetching is stubbed/simulated)
6) Supports a "Semantic Search" chat-style Q&A over the company's known fundamentals/KPIs (structured JSON output)
7) Supports a small peer benchmark list (up to 5 companies)

## Tech Stack & Entry Points
- Frontend: React + TypeScript + Vite
- Main UI flow: `src/App.tsx`
- Data + AI logic: `src/services/api.ts`
- Types: `src/types/index.ts`
- UI sections:
  - Executive Summary: `CompanyOverviewCard`
  - AI Deep Dive: `AIAnalysisPanel`
  - Risk & Red Flags: `RedFlagsPanel`
  - Financial Modeling Copilot: `ModelingCopilot`
  - Earnings Intel: `EarningsIntelligencePanel`
  - Semantic Search: `SemanticSearchPanel`
  - Peer Benchmarks: `BenchmarkPanel`

## How the app works (important behavior)
When the user enters a ticker:
- `App.tsx` calls:
  - `fetchCompanyOverview(symbol)`
  - `fetchQuote(symbol)`
  - `fetchSECFilings(symbol)`
  - `fetchCompanyLogo(symbol)` (optional)
  - `buildKPIData(symbol, overview)`
- Then it auto-triggers asynchronously:
  - `analyzeCompanyWithAI(symbol, overview, filingType?)` -> returns `{summary, keyRisks, keyOpportunities, financialHighlights, managementTone, sentimentScore}`
  - `detectRedFlags(symbol, overview, kpis)` -> returns array of red flags `{severity, category, title, description}`
  - `analyzeEarningsCall(symbol, overview)` -> returns earnings intelligence `{sentimentScore, managementTone, guidanceChange, guidanceSummary, keyThemes, positiveSignals, negativeSignals}`
- Semantic search calls `semanticSearch(query, symbol, overview)` and expects JSON `{answer, citations, confidence}`.

## Detailed AI flow (post-upload / post-ticker)
After upload document and ticker input in the UI (`src/App.tsx`), the app fetches data in this order:
- `fetchCompanyOverview(symbol)`
- `fetchQuote(symbol)`
- `fetchSECFilings(symbol)`
- `buildKPIData(symbol, overview)` (creates KPI numbers used by AI prompts)

After data load, the app triggers AI tasks in parallel (asynchronous):
- `analyzeCompanyWithAI(sym, ov)` -> Executive Summary + Risks + Opportunities + Sentiment
- `detectRedFlags(sym, ov, kpis)` -> returns 3-5 red flags
- `analyzeEarningsCall(sym, ov)` -> Earnings Intel (tone + guidance change)

Semantic Search runs only on demand when the user asks a question:
- `semanticSearch(query, sym, ov)`

## AI Provider Details (Claude)
All AI generation is performed via Claude using a direct fetch to:
- `POST https://api.anthropic.com/v1/messages`

Implementation is in `src/services/api.ts`:
- `generateClaudeText(prompt)` builds the request with headers:
  - `x-api-key: CONFIG.ANTHROPIC_API_KEY`
  - `anthropic-version: 2023-06-01`
- Request body includes:
  - `model: CONFIG.CLAUDE_MODEL`
  - `max_tokens`, `temperature`
  - `messages: [{ role: "user", content: prompt }]`
- The response text is extracted from returned `content` blocks.
- Each AI feature function embeds a provider-specific prompt that instructs Claude to return JSON; the code then extracts JSON from the returned text using regex and `JSON.parse`.

### Shared Claude call mechanism
All AI calls route through `generateClaudeText(prompt)` in `src/services/api.ts`.
It:
- Builds a request to `POST https://api.anthropic.com/v1/messages`
- Sends:
  - `model: CONFIG.CLAUDE_MODEL` (default `claude-3-5-sonnet-latest`)
  - `messages: [{ role: "user", content: prompt }]`
- Extracts returned text from `data.content[...]`
- Returns that text to the feature function

### Feature-specific AI flow (prompt -> parse -> fallback)
- `analyzeCompanyWithAI(...)` (AI Deep Dive):
  - Builds a detailed prompt from overview plus optional `filingType`
  - Requests strict JSON with: `summary`, `keyRisks[]`, `keyOpportunities[]`, `financialHighlights[]`, `managementTone`, `sentimentScore`
  - Parses first JSON object using regex (`{...}`) and `JSON.parse(...)`
  - On call/parse failure, returns heuristic fallback based on growth, P/E, beta, and margins

- `detectRedFlags(...)` (Risk & Red Flags):
  - Builds risk-detection prompt from KPI values (growth, margin, debt, liquidity, valuation)
  - Requests JSON array with 3-5 items: `{severity, category, title, description}`
  - Parses first JSON array using regex (`[...]`) and `JSON.parse(...)`
  - On parse failure, returns threshold-based heuristic flags and guarantees at least 2 flags

- `analyzeEarningsCall(...)` (Earnings Intel):
  - Calls `fetchTranscript(symbol)` (currently stubbed; returns `''`, so no real transcript RAG by default)
  - If transcript exists and is long, performs chunk-scoring pass to select relevant chunks before final analysis prompt
  - Requests strict JSON with:
    - `sentimentScore`, `managementTone`, `guidanceChange`, `guidanceSummary`
    - `keyThemes[]`, `positiveSignals[]`, `negativeSignals[]`
  - On failure, returns heuristic output using `quarterlyRevenueGrowthYOY` and sector/industry cues

- `semanticSearch(query, sym, ov)` (chat-style Q&A):
  - Builds prompt with company snapshot plus user query
  - Requests JSON: `{ answer, citations, confidence }`
  - Parses first JSON object (`{...}`)
  - On failure, returns template answer based on available fundamentals with fixed confidence

## Environment Variables (must be set)
These are read from Vite `import.meta.env` (see `src/config.ts`):
- `VITE_ALPHA_VANTAGE_API_KEY` (optional; if missing or "demo", the app uses mock fundamentals)
- `VITE_ANTHROPIC_API_KEY` (required for Claude calls)
- `VITE_CLAUDE_MODEL` (optional; default `claude-3-5-sonnet-latest`)
- `VITE_API_NINJAS_KEY` (optional; used for company logo)

## Expected JSON Contracts
Claude prompts in `src/services/api.ts` require exact JSON shapes for each feature:
- `analyzeCompanyWithAI`: JSON object with keys:
  - `summary`, `keyRisks` (string[]), `keyOpportunities` (string[]), `financialHighlights` (string[]),
  - `managementTone` (positive|neutral|cautious|negative), `sentimentScore` (-100..100)
- `detectRedFlags`: JSON array with 3-5 items of:
  - `{severity, category, title, description}`
- `semanticSearch`: JSON object:
  - `{answer, citations, confidence}`

## Important Integration Notes / Constraints
- The AI API key is currently used directly from the frontend (via Vite env vars). Treat this as sensitive:
  - For production, move Claude calls to a backend proxy to avoid exposing keys in the browser.
- Transcript fetching for earnings calls is currently stubbed/simulated:
  - `fetchTranscript(symbol)` returns an empty string, so Claude "earnings intel" relies mostly on metrics/heuristics.

## Your Task When Working with This Repo
When asked to modify or extend behavior, follow these rules:
1) Prefer adding/updating logic in `src/services/api.ts` for any data/AI changes.
2) Update only the UI section components if the presentation/formatting needs change.
3) Preserve the JSON contracts expected by callers in `src/App.tsx`.
4) If you change Claude prompt formats, update parsing and/or the regex extraction logic accordingly.
5) Keep prompts aligned with the existing output parsing (extract JSON object/array from free-form response).

## Output Format for Your Answers
- If you need to modify code, specify exactly which functions in `src/services/api.ts` and which components in `src/App.tsx` are affected, and what JSON shape must remain stable.
- If you propose new UI, keep it consistent with existing section patterns in the "story flow".

