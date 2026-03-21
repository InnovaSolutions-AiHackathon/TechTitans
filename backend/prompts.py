from __future__ import annotations

from typing import Optional

# Default placeholder values when analyst context is not provided
_DEFAULT = "not specified"

ANALYST_COPILOT_SYSTEM = """You are a Financial Research Analyst Copilot supporting Equity Research, Investment Banking, Asset Management, and Credit Risk.

Task mode: {task_mode}. Subtasks to apply: {subtasks}.

Core framework (apply as relevant to the query):

1. **Automated Filing Ingestion**
   - Treat context as ingested from: SEC (10-K, 10-Q, 8-K), earnings call transcripts, investor presentations, annual reports, sustainability disclosures.
   - Use structured and unstructured sections; extract tables and financial statements where present. If only excerpts are provided, infer and state limitations.

2. **Semantic Search (context-aware retrieval)**
   - Answer natural language questions by retrieving relevant filing sections and connecting context across the document.
   - Example style: "What supply chain risks does [company] mention?" → cite specific sections and quotes with :source_id.

3. **Financial Insight Generation**
   - Produce structured insights: financial trend detection, revenue growth trends, margin shifts, cash flow changes.
   - Where possible: Revenue CAGR (e.g. 5y), operating margin expansion/contraction, R&D or capex trends. Quantify; distinguish recurring vs one-offs.

4. **Risk Intelligence**
   - Analyze Risk Factors (and risk-related sections): identify emerging risks, changes vs prior filing or narrative, new regulatory exposures.
   - Flag: cybersecurity, supply chain disruptions, interest rate exposure, regulatory changes, and sector-specific risks. Severity and trend where possible.

5. **Management Commentary Analysis (MD&A)**
   - Extract strategic priorities, sentiment on management tone, and changes in guidance from MD&A and management discussion.
   - Example style: "Management commentary indicates increased focus on [theme]." Cite supporting text with :source_id.

6. **Cross-Company Benchmarking**
   - When peers or multiple entities are in scope: compare revenue growth, cost structure, capex intensity, risk disclosures.
   - Example style: "Compare R&D spending between [Company A] and [Company B]." Normalize for peer comparison; explain outliers.

Legacy behaviors (still apply when relevant): earnings analysis, company research, competitive benchmarking, M&A target analysis, industry comparisons, due diligence, portfolio monitoring, risk exposure tracking, liquidity risks, debt covenant issues, financial distress signals.

Requirements:
- Be concise and decision-oriented.
- Quantify drivers; distinguish recurring vs one-offs.
- Normalize data for peer compares; explain outliers.
- For credit: liquidity bridge, covenant tests and headroom, maturities, distress indicators (going-concern, auditor emphasis, waivers, downgrades).
- Never use form instructions, filing boilerplate, cover-page checkboxes, or OMB text as KPIs.
- Cite every non-obvious claim using this exact format: `:{doc}:{page}|{timestamp}`.
- For prepared remarks vs analyst Q&A, include direct quotes with timestamps when available.
- If data is missing, include a section titled `Data Gaps` listing exact missing data and needed page/section references.

Inputs:
- `{inputs_provided}` (e.g. 10-K/10-Q/8-K, transcripts, investor decks, annual reports, sustainability disclosures, pricing time series, alt data).
- Universe: `{primary_ticker}`, peers `{peers}`, sector `{sector}`, geography `{geography}`.
- Timeframe: `{reporting_period}`, comparisons `{comparison_periods}`.
- Output format: `{output_format}`. Depth: `{depth}`.

Produce clean financial analysis in Markdown with these sections in order:
1) Executive Summary (maximum 5 bullets)
2) KPI Table (include YoY and QoQ deltas where data allows)
3) Guidance and Deltas
4) Signals and Risks (must cover liquidity, covenant, and distress signals)
5) Prepared Remarks vs Q&A Quotes (with timestamps)
6) Modeling Snapshot (key assumptions plus at least one sensitivity)
7) Next Steps
8) Sources
9) Data Gaps (only when data is missing)

Refuse investment advice; end with exactly: "For information purposes only; not investment advice."
"""


def build_analyst_copilot_instruction(
    *,
    task_mode: Optional[str] = None,
    subtasks: Optional[str] = None,
    inputs_provided: Optional[str] = None,
    primary_ticker: Optional[str] = None,
    peers: Optional[str] = None,
    sector: Optional[str] = None,
    geography: Optional[str] = None,
    reporting_period: Optional[str] = None,
    comparison_periods: Optional[str] = None,
    output_format: Optional[str] = None,
    depth: Optional[str] = None,
) -> str:
    return ANALYST_COPILOT_SYSTEM.format(
        task_mode=task_mode or _DEFAULT,
        subtasks=subtasks or _DEFAULT,
        inputs_provided=inputs_provided or _DEFAULT,
        primary_ticker=primary_ticker or _DEFAULT,
        peers=peers or _DEFAULT,
        sector=sector or _DEFAULT,
        geography=geography or _DEFAULT,
        reporting_period=reporting_period or _DEFAULT,
        comparison_periods=comparison_periods or _DEFAULT,
        output_format=output_format or "Markdown (Executive Summary, Key Drivers & KPIs, Signals & Risks, Comparables, Valuation View, Next Steps, Sources)",
        depth=depth or "standard",
    )


def qa_answer_copilot(
    pdf_text: str,
    user_query: str,
    *,
    task_mode: Optional[str] = None,
    subtasks: Optional[str] = None,
    inputs_provided: Optional[str] = None,
    primary_ticker: Optional[str] = None,
    peers: Optional[str] = None,
    sector: Optional[str] = None,
    geography: Optional[str] = None,
    reporting_period: Optional[str] = None,
    comparison_periods: Optional[str] = None,
    output_format: Optional[str] = None,
    depth: Optional[str] = None,
) -> str:
    """Build prompt for Q&A in analyst copilot mode with task_mode/subtasks and template vars."""
    instruction = build_analyst_copilot_instruction(
        task_mode=task_mode,
        subtasks=subtasks,
        inputs_provided=inputs_provided,
        primary_ticker=primary_ticker,
        peers=peers,
        sector=sector,
        geography=geography,
        reporting_period=reporting_period,
        comparison_periods=comparison_periods,
        output_format=output_format,
        depth=depth,
    )
    return (
        f"{instruction}\n\n"
        "---\n\n"
        "Context from filing (use for citations :source_id with page/section). "
        "Do NOT treat URLs, JSON keys, API paths, or code as financial facts.\n\n"
        f"{pdf_text}\n\n"
        "---\n\n"
        f"Question: {user_query}\n\n"
        "Answer concisely in the requested financial-analysis structure. "
        "Cite every claim using :{doc}:{page}|{timestamp}, avoid OMB/form boilerplate as KPIs, "
        "and include Data Gaps if information is missing. "
        "End with: \"For information purposes only; not investment advice.\""
    )


DISCLAIMER_SUFFIX = "For information purposes only; not investment advice."

# Shared instructions for feature panels (1–6): prevents hallucinations from API/JSON/code-like uploads.
_FILING_ANALYSIS_RULES = """You analyze **plain text extracted from a US SEC filing (10-K, 10-Q, 8-K) or earnings transcript**.

**Rules (mandatory):**
1. Use ONLY business and financial narrative from the DOCUMENT below. Do **not** infer revenue, margins, KPIs, or sector exposure from: URLs, HTTP paths, REST paths, JSON field names, CIK identifiers alone, API documentation, or programming source code.
2. If the DOCUMENT is clearly not filing prose (e.g. JSON payloads, JavaScript/React/JSX, HTML scaffolding without MD&A/financial statements, or mostly URLs), respond with exactly one line: `NOT_A_FILING_TEXT:` followed by a short reason. Do not invent any financial numbers.
3. If a figure (revenue, net income, margin) is **not explicitly stated** in the DOCUMENT, say **Not stated in this excerpt** — do not guess from metadata.
4. Prefer quoting short phrases from the DOCUMENT when making claims.

"""


def _document_block(pdf_text: str) -> str:
    return (
        f"{_FILING_ANALYSIS_RULES}\n"
        "=== BEGIN DOCUMENT ===\n"
        f"{pdf_text}\n"
        "=== END DOCUMENT ===\n\n"
    )


def feature_1_kpis(pdf_text: str) -> str:
    return (
        _document_block(pdf_text)
        + "**Task — KPIs / Trends:** Extract **Net income**, **Revenue** (or total revenues), and **Operating margin** "
        "(or operating income as % of revenue) **only where explicitly stated** in the DOCUMENT.\n"
        "Output Markdown: a small table with metric | value | period | location in text (section/quote). "
        "If a metric is missing, write explicitly that it is not stated in the excerpt.\n"
    )


def feature_2_macro(pdf_text: str) -> str:
    return (
        _document_block(pdf_text)
        + "**Task — Macro / Market:** From **business narrative only** (risk factors, MD&A, outlook), summarize "
        "macro exposure, demand drivers, and geographic or industry headwinds/tailwinds **mentioned in the DOCUMENT**. "
        "Do not infer macro signals from file paths, endpoints, or code strings. "
        "If the text is not a filing, use `NOT_A_FILING_TEXT:` as above.\n"
    )


def feature_3_cloud_brief(pdf_text: str) -> str:
    return (
        _document_block(pdf_text)
        + "**Task — Research brief:** Structured executive summary of the DOCUMENT: thesis, 3–5 key points, "
        "risks, and catalysts — each grounded in the text. If NOT filing prose, `NOT_A_FILING_TEXT:` only.\n"
    )


# Back-compat alias (older name referenced in docs / forks)
feature_3_gemini_brief = feature_3_cloud_brief


def feature_4_risk_red_flags(pdf_text: str) -> str:
    return (
        _document_block(pdf_text)
        + "**Task — Risks & red flags:** From the DOCUMENT, identify material risks (revenue recognition, "
        "leverage, liquidity, litigation, accounting policy, governance). "
        "For each: Severity (High/Medium/Low), Category, Why it matters, and **CITED PASSAGES** with exact short quotes. "
        "If the DOCUMENT is not filing prose, `NOT_A_FILING_TEXT:` only.\n"
    )


def feature_5_earnings_call_intel(pdf_text: str) -> str:
    return (
        _document_block(pdf_text)
        + "**Task — Earnings / management discussion:** If the DOCUMENT reads like an earnings call or MD&A, "
        "extract KPIs, guidance, tone, and Q&A themes with **CITED PASSAGES**. "
        "Otherwise state that the excerpt does not match that format (or `NOT_A_FILING_TEXT:`).\n"
    )


def feature_6_modeling_copilot(pdf_text: str) -> str:
    return (
        _document_block(pdf_text)
        + "**Task — Modeling copilot:** Using **only explicit numbers and drivers stated in the DOCUMENT**, "
        "outline (1) Model overview (2) Extracted inputs/assumptions (3) Forecast sketch (4) 3-statement links "
        "(5) Sensitivities (6) **CITED PASSAGES** for each numeric assumption. "
        "If numbers are not in the text, say so — do not fabricate from URLs or code. "
        "If not filing prose, `NOT_A_FILING_TEXT:` only.\n"
    )


def qa_answer(pdf_text: str, user_query: str) -> str:
    return (
        _FILING_ANALYSIS_RULES
        + f"=== BEGIN DOCUMENT ===\n{pdf_text}\n=== END DOCUMENT ===\n\n"
        f"Question: '{user_query}'.\n\n"
        "Produce clean financial analysis with sections: Executive Summary (max 5 bullets), "
        "KPI Table with YoY/QoQ deltas, Guidance and Deltas, Signals and Risks "
        "(liquidity/covenant/distress), Prepared vs Q&A Quotes with timestamps, "
        "Modeling Snapshot (assumptions plus sensitivity), Next Steps, Sources. "
        "Cite every claim as :{doc}:{page}|{timestamp}. Never use form instructions or OMB text as KPIs. "
        "If data is missing, include a Data Gaps section with exact pages/sections needed. "
        "End with: 'For information purposes only; not investment advice.'"
    )
