# FinAI-Copilot

FinAI-Copilot is an end-to-end financial analyst platform prototype built with:
- **Backend:** FastAPI (Python)
- **Frontend:** React + Vite + TypeScript

It supports ingestion/indexing of filing text, hybrid search, grounded Q&A with citations, insight generation, benchmarking, news, and recent SEC filings.

## Folder Tree

```text
data/
├─ backend/
│  ├─ main.py
│  ├─ prompts.py
│  ├─ llm.py
│  ├─ auth.py
│  ├─ .env.example
│  └─ tests/
│     └─ test_finai_basics.py
├─ frontend/
│  └─ src/
│     ├─ FinancialApp.tsx
│     ├─ CompanyDetail.tsx
│     ├─ CompareModule.tsx
│     └─ ...
├─ prompts/
│  ├─ system.md
│  ├─ earnings_summary.md
│  └─ credit_scan.md
├─ docker-compose.yml
├─ Makefile
└─ .github/workflows/ci.yml
```

## Setup

1. Backend env:
   - Copy `backend/.env.example` to `backend/.env`
   - Fill `CLAUDE_API_KEY` if you want Claude fallback.

2. Start all services:

```bash
make up
```

3. Open:
- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:8000/docs](http://localhost:8000/docs)

## Runbook Commands

```bash
make up
make migrate
make seed

curl -F file=@samples/10K_acme.pdf localhost:8000/ingest/upload
curl -X POST "localhost:8000/ingest/index?filing_id=<id>"
curl -X POST localhost:8000/search/hybrid -H "Content-Type: application/json" -d '{"query":"Summarize liquidity position"}'
curl -X POST localhost:8000/qa/answer -H "Content-Type: application/json" -d '{"query":"What changed in guidance?"}'
curl -X POST localhost:8000/insights/generate -H "Content-Type: application/json" -d '{"ticker":"NVDA","period":"FY2025"}'
curl -X POST localhost:8000/bench/compare -H "Content-Type: application/json" -d '{"tickers":["NVDA","AMD","INTC"],"metric":"growth"}'
curl localhost:8000/company/NVDA/latest

make e2e
```

## API Surface Added

- `POST /ingest/upload`
- `POST /ingest/index?filing_id=...`
- `POST /search/hybrid`
- `POST /qa/answer`
- `POST /insights/generate`
- `POST /bench/compare`
- `GET /company/{ticker}/latest`
- `GET /api/filings/recent?ticker=...`

## Notes

- Citation discipline token format: `:{doc}:{page_or_section}|{hh:mm:ss_if_call}`.
- If missing evidence: `Data not provided—requires {doc}:{section/page}.`
- Footer on analysis outputs: `For information purposes only; not investment advice.`
