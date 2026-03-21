# Project Analysis: AI and Features

This document explains how the **Financial Research Assistant** project works end-to-end: architecture, AI/LLM usage, and each feature.

---

## 1. Project Structure

```
data/
├── backend/          # FastAPI Python app
│   ├── main.py       # API routes, upload, run-feature, Q&A, companies
│   ├── prompts.py    # All LLM prompts (6 features + analyst copilot)
│   ├── llm.py        # Ollama + Claude client wrappers
│   ├── auth.py       # Simple in-memory login/token
│   └── .env.example  # APP_USERNAME, APP_PASSWORD, OLLAMA_*, CLAUDE_*
└── frontend/         # React (Vite) app
    └── src/
        ├── FinancialApp.tsx   # Login, Research (upload, features, Q&A), company list
        ├── Dashboard.tsx      # Home: indices, top-searched, sentiment, top movers
        └── CompanyDetail.tsx  # Company view: sentiment gauge, Rev vs EPS, etc.
```

- **Backend** runs on port **8002** (configurable via env). It stores extracted PDF text per user session (token + upload_id).
- **Frontend** calls the backend for login, upload, run-feature, Q&A, and company list. No database; PDF text lives in memory.

---

## 2. How AI Is Used (LLM Flow)

The app uses **two AI providers** in a primary/fallback pattern:

| Provider | Role | When used |
|----------|------|-----------|
| **Ollama** | Primary | All 6 features and Q&A by default. Runs locally (e.g. `http://localhost:11434`). |
| **Claude** | Fallback | When “Use Claude fallback” is on and Ollama fails or is unavailable. Also **preferred for Feature 3** (Research Brief) when fallback is on. |

**Configuration (backend `.env`):**

- `OLLAMA_HOST` – e.g. `http://localhost:11434`
- `OLLAMA_MODEL` – e.g. `llama3.2:1b`
- `CLAUDE_API_KEY` – Anthropic API key for Claude
- `CLAUDE_MODEL` – e.g. `claude-3-5-haiku-20241022`

**Behavior:**

1. **Feature 1, 2, 4, 5, 6:** Ollama runs the prompt. If Ollama fails and Claude fallback is enabled, the same prompt is sent to Claude.
2. **Feature 3 (Research Brief):** If Claude fallback is on, Claude is tried first; if it fails, Ollama is used.
3. **Q&A:** Same as features: Ollama first, then Claude if fallback is on. The prompt is either the simple Q&A prompt or the **Analyst Copilot** prompt when extra context (e.g. task mode, primary ticker) is provided.

**Context limit:** PDF text is truncated to **2,500 characters** before being sent to the LLM (`DEFAULT_CONTEXT_LIMIT` in `llm.py`). This keeps responses fast and within model limits.

---

## 3. The Six Features (What Each One Does)

Each feature is a **single LLM call** with a different prompt. The prompt is built in `prompts.py` and the PDF text (truncated) is appended.

| Feature | Purpose | Prompt summary |
|---------|--------|----------------|
| **1 – KPIs/Trends** | Extract core financial metrics from the filing | “Extract Net Income, Revenue, and Operating Margin from this filing.” |
| **2 – Macro/Market** | Macro and market context | “Analyze for macro exposure, sector rotation signals, and event impact simulation.” |
| **3 – Research Brief** | Executive summary | “Create a structured ‘Research Brief’ summarizing key takeaways.” (Often run with Claude.) |
| **4 – Risk & Red Flags** | Risk and red-flag detection | “Detect financial risks and red flags… Severity, Category, Why it matters, CITED PASSAGES.” |
| **5 – Earnings Call Intel** | Management discussion / earnings call | “Extract performance highlights, KPIs, guidance, themes, tone, risks; CITED PASSAGES.” |
| **6 – Modeling Copilot** | Financial modeling plan | “Build a plan: Model Overview, Inputs/Assumptions, Driver-based Forecast, 3-Statement, Sensitivity, CITED PASSAGES.” |

**Flow in the app:**

1. User uploads a PDF → backend extracts text with **PyPDF** and stores it under `token + upload_id`.
2. Frontend calls **`POST /api/run-feature`** for each feature (e.g. 1, 2, 4, 5, 6 first; then 3).
3. Backend runs `_run_feature(feature_id, pdf_text, use_gemini_fallback)` and returns the LLM output.
4. Frontend shows each result in a card (Feature 1 … Feature 6). User can also download a full report (all six) or only Feature 3.

So: **AI = one LLM call per feature**, with the same PDF snippet and a feature-specific prompt.

---

## 4. Analyst Copilot and Q&A

**Custom Analyst Q&A** can run in two modes:

### Simple Q&A

- Prompt: “Using this text: … Answer the following question: ‘…’ Include a section titled CITED PASSAGES.”
- No extra context (ticker, task mode, etc.).

### Analyst Copilot mode

Used when any of these are sent in the request: `task_mode`, `subtasks`, `inputs_provided`, `primary_ticker`, `peers`, `sector`, `geography`, `reporting_period`, `comparison_periods`, `output_format`, `depth`.

The prompt is built from a **system-style instruction** in `prompts.py` that defines six modules:

1. **Automated Filing Ingestion** – Treat context as SEC/earnings/annual reports; use tables and sections.
2. **Semantic Search** – Answer questions by retrieving and citing sections (`:source_id`).
3. **Financial Insight Generation** – Trends, revenue CAGR, margins, R&D/capex; quantify.
4. **Risk Intelligence** – Risk factors, emerging risks, severity; cite.
5. **Management Commentary (MD&A)** – Priorities, tone, guidance; cite.
6. **Cross-Company Benchmarking** – Compare peers; normalize and explain outliers.

The instruction also includes:

- Task mode and subtasks
- Inputs (e.g. 10-K/10-Q/transcripts)
- Universe: `primary_ticker`, peers, sector, geography
- Timeframe and comparison periods
- Output format and depth
- Requirement to cite with `:source_id` and to add: “For information purposes only; not investment advice.”

**In the UI:** When the user selects a **Filer Name** (SEC company) in the Research sidebar, that company’s ticker is sent as `primary_ticker` in the Q&A request, so the copilot answers in the context of that company.

**Disclaimer:** Every Q&A response is appended with:  
`For information purposes only; not investment advice.` (if not already present).

---

## 5. End-to-End Data Flow (Detailed)

### Where data lives

| Location | What is stored | Lifetime |
|----------|----------------|----------|
| **Backend: `auth_service._tokens`** | `token → username` | Until server restart |
| **Backend: `pdf_store`** | `token → { upload_id → pdf_text }` | Until server restart (no TTL) |
| **Backend: `_SEC_COMPANIES_CACHE`** | `(timestamp, list of {ticker, filer_name})` | 1 hour TTL |
| **Frontend: React state** | `token`, `uploadId`, `reports` (f1–f6), `answer`, `companyList`, `selectedCompany`, etc. | Until page refresh or sign out |

All API calls (except login and health) require header: **`Authorization: Bearer <token>`**. Missing or invalid token → **401**; frontend clears session and shows "Session expired."

### Step 1: Login

| Direction | Data |
|-----------|------|
| **Request** | `POST /api/login` |
| **Body** | `{ "username": "tecttitans", "password": "Tt2026" }` |
| **Response (200)** | `{ "token": "a1b2c3..." }` |
| **Response (401)** | Invalid username or password |

**Backend:** Compares credentials to `APP_USERNAME` / `APP_PASSWORD` (from `.env`). On success, creates a random token and stores it in `AuthService._tokens`.  
**Frontend:** Saves `token` in state; uses it in `Authorization` for all subsequent requests.

### Step 2: Company list (Filer Name dropdown)

| Direction | Data |
|-----------|------|
| **Request** | `GET /api/companies` |
| **Headers** | `Authorization: Bearer <token>` |
| **Response (200)** | `[ { "ticker": "AAPL", "filer_name": "Apple Inc." }, ... ]` |
| **Response (401)** | Invalid/missing token |
| **Response (502)** | SEC fetch failed |

**Backend:** Fetches `https://www.sec.gov/files/company_tickers.json`, maps to `{ ticker, filer_name }` (SEC "title" = filer name), sorts by name, caches for 1 hour.  
**Frontend:** Stores list in `companyList`; user can filter and select; selected ticker is sent as `primary_ticker` in Q&A.

### Step 3: Upload PDF

| Direction | Data |
|-----------|------|
| **Request** | `POST /api/upload-and-run` |
| **Headers** | `Authorization: Bearer <token>` |
| **Body (multipart/form-data)** | `file` (PDF), `auto_1_3` (bool), `auto_4_6` (bool), `use_gemini_fallback` (bool) |
| **Response (200)** | `{ "upload_id": "uuid-...", "reports": { "f1": null, "f2": null, "f3": null, "f4": null, "f5": null, "f6": null } }` |
| **Response (400)** | Not a PDF |
| **Response (401)** | Invalid/missing token |

**Backend:** Reads PDF bytes → `PdfReader` (PyPDF) → concatenates `page.extract_text()` for all pages → `pdf_text`. Generates `upload_id` (UUID), then: `pdf_store.setdefault(token, {})[upload_id] = pdf_text`; returns `upload_id` and empty `reports`. **No LLM calls in this step.**  
**Frontend:** Saves `uploadId` and `reports`; clears `answer`. Then, based on `auto_1_3` / `auto_4_6`, it will call Step 4 for each missing feature.

### Step 4: Run feature (per feature)

| Direction | Data |
|-----------|------|
| **Request** | `POST /api/run-feature` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | `{ "upload_id": "uuid-...", "feature_id": 1..6, "use_gemini_fallback": true }` |
| **Response (200)** | `{ "output": "Net Income: ... Revenue: ..." }` or `{ "output": null }` |
| **Response (404)** | `upload_id` not found for this token |
| **Response (401)** | Invalid/missing token |

**Backend:** (1) `pdf_text = pdf_store[token][upload_id]`; if missing → 404. (2) `pdf_text` truncated to **2,500 chars**. (3) Prompt = `feature_X(pdf_text)` from `prompts.py`. (4) **Feature 3:** If `use_gemini_fallback`: try Gemini first; else Ollama. (5) **Features 1,2,4,5,6:** Ollama first; if failure and fallback, try Gemini. (6) Return `{ "output": "<text or error message>" }`.  
**Frontend:** For each feature in phase A (1,2,4,5,6) then phase B (3), if that report is empty, calls `POST /api/run-feature` and merges `runData.output` into `reports`. UI cards update as each call completes.

### Step 5: Q&A

| Direction | Data |
|-----------|------|
| **Request** | `POST /api/qa` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | `{ "upload_id": "uuid-...", "question": "What are the main risks?", "use_gemini_fallback": true, "primary_ticker": "AAPL" }` plus optional: `task_mode`, `subtasks`, `inputs_provided`, `peers`, `sector`, `geography`, `reporting_period`, `comparison_periods`, `output_format`, `depth` |
| **Response (200)** | `{ "answer": "..." }` (disclaimer appended if not present) |
| **Response (404)** | `upload_id` not found |
| **Response (401)** | Invalid/missing token |

**Backend:** (1) Load `pdf_text` for `token` + `upload_id`; truncate to 2,500 chars. (2) If any copilot field set: `qa_answer_copilot(...)` else `qa_answer(...)`. (3) Ollama then Gemini if fallback. (4) Append disclaimer if missing. (5) Return `{ "answer": "<text>" }`.  
**Frontend:** Sends selected filer as `primary_ticker` when set. Displays `answer`. On 401, clears session and shows "Session expired."

### Data flow diagram

```
[User] → Login → [Frontend: token]
       → GET /api/companies → [Frontend: companyList]
       → Upload PDF → POST /api/upload-and-run → [Backend: pdf_store[token][upload_id]]
       → [Frontend: uploadId, reports = { f1..f6: null }]

       → For each feature 1,2,4,5,6 then 3:
            POST /api/run-feature → Backend: pdf_store → prompt → Ollama/Gemini → response
            → [Frontend: reports.f1..f6 filled]

       → Ask question → POST /api/qa (upload_id, question, primary_ticker?)
            → Backend: pdf_store → Q&A or Copilot prompt → Ollama/Gemini → disclaimer
            → [Frontend: answer]
```

**AI is used only in steps 4 and 5**; step 3 is PDF extraction and storage only.

For **detailed data flow** (exact request/response shapes, where each piece of state lives, step-by-step backend/frontend actions) and **expanded summary tables** (API reference, request/response shapes, backend/frontend state, LLM usage), see **DATA_FLOW_AND_SUMMARY_DETAILS.md**.

---

## 6. Summary Table

| Area | How it works |
|------|----------------|
| **AI providers** | Ollama (local) primary; Gemini (cloud) fallback. Configured via `.env`. |
| **Features 1–6** | One prompt per feature in `prompts.py`; one LLM call per feature using extracted PDF text. |
| **Feature 3** | Same as others but Gemini is tried first when fallback is on. |
| **Q&A** | Same PDF text + user question; simple or Analyst Copilot prompt; Ollama then Gemini. |
| **Analyst Copilot** | Rich system instruction (6 modules) + template vars (ticker, peers, sector, etc.); citations and disclaimer. |
| **PDF** | Stored in memory per token + upload_id; truncated to 2,500 chars before sending to LLM. |
| **Auth** | In-memory tokens; no DB. Login gives token; API routes use `_require_token`. |

If you want more detail on a specific feature’s prompt or how to add a new one, say which part (e.g. “Feature 4” or “Analyst Copilot”) and we can go line-by-line.
