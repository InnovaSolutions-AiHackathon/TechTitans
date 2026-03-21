# Data Flow and Summary Tables — Detailed Reference

This document gives **detailed** data flow steps and expanded summary tables. For overall architecture and feature descriptions, see **AI_AND_FEATURES_ANALYSIS.md**.

---

## 1. Where Data Lives

| Location | What is stored | Lifetime |
|----------|----------------|----------|
| **Backend: `auth_service._tokens`** | `token → username` | Until server restart |
| **Backend: `pdf_store`** | `token → { upload_id → pdf_text }` | Until server restart (no TTL) |
| **Backend: `_SEC_COMPANIES_CACHE`** | `(timestamp, list of {ticker, filer_name})` | 1 hour TTL |
| **Frontend: React state** | `token`, `uploadId`, `reports` (f1–f6), `answer`, `companyList`, `selectedCompany`, etc. | Until page refresh or sign out |

All API calls (except login and health) require: **`Authorization: Bearer <token>`**. Missing or invalid token → **401**; frontend clears session and shows "Session expired."

---

## 2. Data Flow — Step by Step

### Step 1: Login

| Direction | Data |
|-----------|------|
| **Request** | `POST /api/login` |
| **Body** | `{ "username": "tecttitans", "password": "Tt2026" }` |
| **Response (200)** | `{ "token": "a1b2c3..." }` |
| **Response (401)** | Invalid username or password |

- **Backend:** Compares credentials to `APP_USERNAME` / `APP_PASSWORD` (from `.env`). On success, creates a random token and stores it in `AuthService._tokens`.
- **Frontend:** Saves `token` in state; uses it in `Authorization` for all subsequent requests.

---

### Step 2: Company list (Filer Name dropdown)

| Direction | Data |
|-----------|------|
| **Request** | `GET /api/companies` |
| **Headers** | `Authorization: Bearer <token>` |
| **Response (200)** | `[ { "ticker": "AAPL", "filer_name": "Apple Inc." }, ... ]` |
| **Response (401)** | Invalid/missing token |
| **Response (502)** | SEC fetch failed |

- **Backend:** Fetches `https://www.sec.gov/files/company_tickers.json`, maps to `{ ticker, filer_name }` (SEC "title" = filer name), sorts by name, caches for 1 hour.
- **Frontend:** Stores list in `companyList`; user can filter and select; selected ticker is sent as `primary_ticker` in Q&A.

---

### Step 3: Upload PDF

| Direction | Data |
|-----------|------|
| **Request** | `POST /api/upload-and-run` |
| **Headers** | `Authorization: Bearer <token>` |
| **Body (multipart/form-data)** | `file` (PDF), `auto_1_3` (bool), `auto_4_6` (bool), `use_gemini_fallback` (bool) |
| **Response (200)** | `{ "upload_id": "uuid-...", "reports": { "f1": null, "f2": null, "f3": null, "f4": null, "f5": null, "f6": null } }` |
| **Response (400)** | Not a PDF |
| **Response (401)** | Invalid/missing token |

- **Backend:** Reads PDF bytes → `PdfReader` (PyPDF) → concatenates `page.extract_text()` for all pages → `pdf_text`. Generates `upload_id` (UUID), then `pdf_store.setdefault(token, {})[upload_id] = pdf_text`; returns `upload_id` and empty `reports`. **No LLM calls.**
- **Frontend:** Saves `uploadId` and `reports`; clears `answer`. Then, based on `auto_1_3` / `auto_4_6`, calls Step 4 for each missing feature.

---

### Step 4: Run feature (per feature)

| Direction | Data |
|-----------|------|
| **Request** | `POST /api/run-feature` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | `{ "upload_id": "uuid-...", "feature_id": 1..6, "use_gemini_fallback": true }` |
| **Response (200)** | `{ "output": "Net Income: ... Revenue: ..." }` or `{ "output": null }` |
| **Response (404)** | `upload_id` not found for this token |
| **Response (401)** | Invalid/missing token |

- **Backend:**  
  1. `pdf_text = pdf_store[token][upload_id]`; if missing → 404.  
  2. `pdf_text` truncated to **2,500 chars**.  
  3. Prompt = `feature_X(pdf_text)` from `prompts.py`.  
  4. **Feature 3:** If `use_gemini_fallback`: try Claude first; else Ollama.  
  5. **Features 1,2,4,5,6:** Ollama first; if failure and fallback, try Claude.  
  6. Return `{ "output": "<text or error message>" }`.  
- **Frontend:** For each feature in phase A (1,2,4,5,6) then phase B (3), if that report is empty, calls `POST /api/run-feature` and merges `runData.output` into `reports`. UI cards update as each call completes.

---

### Step 5: Q&A

| Direction | Data |
|-----------|------|
| **Request** | `POST /api/qa` |
| **Headers** | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| **Body** | `{ "upload_id": "uuid-...", "question": "What are the main risks?", "use_gemini_fallback": true, "primary_ticker": "AAPL" }` plus optional: `task_mode`, `subtasks`, `inputs_provided`, `peers`, `sector`, `geography`, `reporting_period`, `comparison_periods`, `output_format`, `depth` |
| **Response (200)** | `{ "answer": "..." }` (disclaimer appended if not present) |
| **Response (404)** | `upload_id` not found |
| **Response (401)** | Invalid/missing token |

- **Backend:**  
  1. Load `pdf_text` for `token` + `upload_id`; truncate to 2,500 chars.  
  2. If any copilot field set: `qa_answer_copilot(...)` else `qa_answer(...)`.  
  3. Ollama then Claude if fallback.  
  4. Append disclaimer if missing.  
  5. Return `{ "answer": "<text>" }`.  
- **Frontend:** Sends selected filer as `primary_ticker` when set. Displays `answer`. On 401, clears session and shows "Session expired."

---

### Data flow diagram

```
[User] → Login → [Frontend: token]
       → GET /api/companies → [Frontend: companyList]
       → Upload PDF → POST /api/upload-and-run → [Backend: pdf_store[token][upload_id]]
       → [Frontend: uploadId, reports = { f1..f6: null }]

       → For each feature 1,2,4,5,6 then 3:
            POST /api/run-feature → Backend: pdf_store → prompt → Ollama/Claude → response
            → [Frontend: reports.f1..f6 filled]

       → Ask question → POST /api/qa (upload_id, question, primary_ticker?)
            → Backend: pdf_store → Q&A or Copilot prompt → Ollama/Claude → disclaimer
            → [Frontend: answer]
```

**AI is used only in steps 4 and 5**; step 3 is PDF extraction and storage only.

---

## 3. Summary Tables (Detailed)

### 3.1 API reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/login` | POST | No | Get token from username/password |
| `/api/companies` | GET | Bearer | List SEC filers (ticker, filer_name) for dropdown |
| `/api/upload-and-run` | POST | Bearer | Upload PDF; extract text; return upload_id and empty reports |
| `/api/run-feature` | POST | Bearer | Run one feature (1–6) on stored PDF text; return output |
| `/api/qa` | POST | Bearer | Answer question from stored PDF; optional copilot params |
| `/health` | GET | No | Health check `{ "ok": true }` |

### 3.2 Request/response shapes

| API | Request body (JSON) | Response body (JSON) |
|-----|---------------------|------------------------|
| **login** | `{ "username": string, "password": string }` | `{ "token": string }` |
| **companies** | — | `[ { "ticker": string, "filer_name": string }, ... ]` |
| **upload-and-run** | Form: `file`, `auto_1_3`, `auto_4_6`, `use_gemini_fallback` | `{ "upload_id": string, "reports": { "f1".."f6": string \| null } }` |
| **run-feature** | `{ "upload_id": string, "feature_id": 1..6, "use_gemini_fallback": bool }` | `{ "output": string \| null }` |
| **qa** | `{ "upload_id": string, "question": string, "use_gemini_fallback": bool, "primary_ticker"?: string, ... }` | `{ "answer": string \| null }` |

### 3.3 Backend state

| Variable | Type | Description |
|----------|------|-------------|
| `auth_service._tokens` | `Dict[str, str]` | token → username (in-memory) |
| `pdf_store` | `Dict[str, Dict[str, str]]` | token → { upload_id → full PDF text } |
| `_SEC_COMPANIES_CACHE` | `(float, List[Dict])` or None | (timestamp, list of {ticker, filer_name}); refreshed every 1 hour |

### 3.4 Frontend state (Research view)

| State | Type | Set by / used for |
|-------|------|--------------------|
| `token` | `string \| null` | Login response; cleared on 401 or sign out |
| `uploadId` | `string \| null` | Upload response; required for run-feature and qa |
| `reports` | `{ f1..f6: string \| null }` | run-feature responses; drives feature cards and full report download |
| `companyList` | `Array<{ticker, filer_name}>` | GET /api/companies |
| `selectedCompany` | `string` | Selected ticker from Filer Name dropdown → sent as `primary_ticker` in qa |
| `question` / `answer` | `string` | User input and POST /api/qa response |
| `useGeminiFallback` | `boolean` | Checkbox; sent in upload form, run-feature, and qa |

### 3.5 LLM usage summary

| Step | Uses LLM? | Provider order | Input |
|------|-----------|----------------|--------|
| Login | No | — | — |
| Companies | No | — | SEC JSON |
| Upload | No | — | PDF bytes → PyPDF |
| Run feature 1,2,4,5,6 | Yes | Ollama → (Claude if fallback and Ollama failed) | feature_X(pdf_text) |
| Run feature 3 | Yes | Claude first (if fallback) → else Ollama | feature_3_cloud_brief(pdf_text) |
| Q&A | Yes | Ollama → (Claude if fallback and Ollama failed) | qa_answer(...) or qa_answer_copilot(...) |

### 3.6 One-line summary table

| Area | How it works |
|------|----------------|
| **AI providers** | Ollama (local) primary; Claude (cloud) fallback. Configured via `.env`. |
| **Features 1–6** | One prompt per feature in `prompts.py`; one LLM call per feature using extracted PDF text (max 2,500 chars). |
| **Feature 3** | Same as others but Claude is tried first when fallback is on. |
| **Q&A** | Same PDF text + user question; simple or Analyst Copilot prompt; Ollama then Claude; disclaimer appended. |
| **Analyst Copilot** | Triggered by sending any of: task_mode, subtasks, primary_ticker, peers, sector, geography, reporting_period, comparison_periods, output_format, depth. Rich system instruction (6 modules) + template vars; citations and disclaimer. |
| **PDF** | Stored in `pdf_store[token][upload_id]` (full text); truncated to 2,500 chars only when building LLM prompt. |
| **Auth** | In-memory tokens in `AuthService`; no DB. Login gives token; protected routes use `_require_token`. |
| **Errors** | 401 → frontend clears session; 404 → upload_id not found; 502 → SEC companies fetch failed. LLM failures return an error message string in `output` or `answer`. |
