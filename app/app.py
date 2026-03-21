import os
from typing import Optional

import streamlit as st
from pypdf import PdfReader
import ollama

try:
    from anthropic import Anthropic
except ImportError:  # pragma: no cover
    Anthropic = None  # type: ignore[misc, assignment]


DEFAULT_OLLAMA_OPTIONS = {"num_predict": 180, "temperature": 0.2, "top_p": 0.9}
DEFAULT_OLLAMA_THINK = "low"
DEFAULT_CLAUDE_MAX_TOKENS = 1024


def _normalize_ollama_host(host: str) -> str:
    """
    Normalize host to a proper URL for the Ollama Python client.
    Examples:
      - "localhost:11434" -> "http://localhost:11434"
      - "http://localhost:11434" -> "http://localhost:11434"
    """
    host = (host or "").strip()
    if not host:
        return host
    if "://" not in host:
        host = "http://" + host
    return host


def _get_ollama_client(host: str) -> "ollama.Client":
    host = _normalize_ollama_host(host)
    # If host is empty, rely on ollama's default (http://localhost:11434).
    return ollama.Client(host=host or None)

def ollama_chat_safe(
    host: str,
    model: str,
    user_content: str,
    *,
    show_errors: bool = True,
    ollama_options: Optional[dict] = None,
    think: Optional[str] = None,
) -> Optional[str]:
    """
    Run ollama.chat safely and return only the response text.
    This prevents the Streamlit app from crashing when Ollama isn't reachable.
    """
    try:
        effective_ollama_options = DEFAULT_OLLAMA_OPTIONS if ollama_options is None else ollama_options
        effective_think = DEFAULT_OLLAMA_THINK if think is None else think
        client = _get_ollama_client(host)
        response = client.chat(
            model=model,
            messages=[{"role": "user", "content": user_content}],
            think=effective_think,
            options=effective_ollama_options,
        )
        return response["message"]["content"]
    except Exception as e:
        normalized_host = _normalize_ollama_host(host).strip()
        tried = normalized_host or "default (http://localhost:11434)"
        err = str(e)

        # Ollama uses HTTP 404 for "model not found" errors.
        is_model_not_found = ("status code 404" in err.lower()) and ("not found" in err.lower())

        if show_errors:
            if is_model_not_found:
                st.error(
                    "Ollama is reachable, but the selected model is not available.\n"
                    f"Model: {model}\nTried: {tried}\nDetails: {e}"
                )
                st.info(
                    f"To fix it, pull the model in Ollama:\n"
                    f"  ollama pull {model}\n\n"
                    "You can also use the sidebar button: `Pull selected model`."
                )
            else:
                st.error(
                    "Could not connect to Ollama. Start the Ollama server and try again.\n"
                    f"Details: {e}\nTried: {tried}"
                )
                st.info(
                    "Common fixes:\n"
                    "1) Install/start Ollama (default URL: http://localhost:11434)\n"
                    "2) If Ollama runs on another host/port, set `OLLAMA_HOST` (or `OLLAMA_BASE_URL`) "
                    "to something like `http://192.168.x.x:11434`"
                )
        return None


def claude_chat_safe(
    api_key: str,
    model: str,
    user_content: str,
    *,
    max_tokens: int = DEFAULT_CLAUDE_MAX_TOKENS,
    show_errors: bool = True,
) -> Optional[str]:
    """Call Anthropic Claude and return the response text."""
    api_key = (api_key or "").strip()
    if not api_key:
        if show_errors:
            st.error(
                "Claude API key is missing. Set `CLAUDE_API_KEY` (or `ANTHROPIC_API_KEY`) to use Claude."
            )
        return None

    if Anthropic is None:
        if show_errors:
            st.error("Anthropic SDK not installed. Run: pip install anthropic")
        return None

    try:
        client = Anthropic(api_key=api_key)
        msg = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": user_content}],
        )
        parts = getattr(msg, "content", None) or []
        texts: list[str] = []
        for p in parts:
            t = getattr(p, "text", None)
            if isinstance(t, str) and t.strip():
                texts.append(t)
        out = "\n".join(texts).strip() if texts else None
        return out or None
    except Exception as e:
        if show_errors:
            st.error(f"Claude call failed (model={model}). Details: {e}")
        return None


st.set_page_config(page_title="Financial Research Assistant", layout="wide", page_icon="📈")

# Futuristic UI theme (CSS-only; no external assets).
st.markdown(
    """
    <style>
      :root{
        /* Second-image (mint) pattern */
        --accent:#29A674;         /* Accent Green */
        --accent-rgb: 41,166,116;
        --accent2:#3DCC93;        /* Soft Green */
        --accent2-rgb: 61,204,147;
        --accent3:#26BF82;        /* Bright Green */
        --accent3-rgb: 38,191,130;

        --success:#81C784;
        --success-rgb: 129,199,132;

        --verylight:#F0F8F0;     /* Very Light Mint */
        --verylight-rgb: 240,248,240;

        --bg0:#F0F8F0;
        --bg1:#D0F0E8;
        --card: rgba(240, 248, 240, 0.62);
        --card2: rgba(240, 248, 240, 0.38);
        --text:#0b1020;
        --muted:#2E4A6E;
        --border: rgba(var(--accent2-rgb), 0.22);
        --glowA: rgba(var(--accent-rgb), 0.35);
        --glowB: rgba(var(--accent2-rgb), 0.30);
        --danger:#ff4d6d;
      }
      /* Light theme overrides (Streamlit toggles theme via data attributes/classes). */
      html[data-theme="light"],
      body[data-theme="light"],
      .stApp[data-theme="light"]{
        --bg0: #F0F8F0;
        --bg1: #D0F0E8;
        --card: rgba(255, 255, 255, 0.86);
        --card2: rgba(255, 255, 255, 0.62);
        --text:#0b1020;
        --muted:#2E4A6E;
        --border: rgba(var(--accent2-rgb), 0.20);
        --glowA: rgba(var(--accent-rgb), 0.20);
        --glowB: rgba(var(--accent2-rgb), 0.16);
      }
      /* Disable Dark styling: treat dark theme as light. */
      html[data-theme="dark"],
      body[data-theme="dark"],
      .stApp[data-theme="dark"]{
        --bg0: #F0F8F0;
        --bg1: #D0F0E8;
        --card: rgba(255, 255, 255, 0.86);
        --card2: rgba(255, 255, 255, 0.62);
        --text:#0b1020;
        --muted:#2E4A6E;
        --border: rgba(var(--accent2-rgb), 0.20);
        --glowA: rgba(var(--accent-rgb), 0.20);
        --glowB: rgba(var(--accent2-rgb), 0.16);
      }
      html, body, [class*="stApp"]{
        background: radial-gradient(1200px 600px at 10% 0%, rgba(var(--accent2-rgb),0.20), transparent 55%),
                    radial-gradient(1000px 500px at 90% 10%, rgba(var(--accent-rgb),0.14), transparent 50%),
                    linear-gradient(180deg, var(--bg0), var(--bg1));
        color: var(--text);
      }
      .block-container{
        padding-top: 1.0rem;
      }
      /* Sidebar */
      section[data-testid="stSidebar"]{
        background: linear-gradient(180deg,
          rgba(var(--accent-rgb), 0.18),
          rgba(var(--accent3-rgb), 0.08)
        );
        border-right: 1px solid var(--border);
      }
      section[data-testid="stSidebar"] *{
        color: var(--text);
      }
      html[data-theme="light"] section[data-testid="stSidebar"],
      body[data-theme="light"] section[data-testid="stSidebar"],
      .stApp[data-theme="light"] section[data-testid="stSidebar"]{
        background: linear-gradient(180deg,
          rgba(var(--verylight-rgb), 0.95),
          rgba(var(--accent3-rgb), 0.12)
        );
      }
      /* Alerts */
      .stAlert{
        background: rgba(var(--verylight-rgb), 0.72) !important;
        border: 1px solid var(--border);
        border-radius: 14px;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.02), 0 10px 30px rgba(0,0,0,0.22);
      }
      html[data-theme="light"] .stAlert,
      body[data-theme="light"] .stAlert,
      .stApp[data-theme="light"] .stAlert{
        background: rgba(var(--verylight-rgb), 0.80) !important;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.06), 0 10px 30px rgba(0,0,0,0.12);
      }
      /* Buttons */
      .stButton>button{
        border-radius: 14px !important;
        border: 1px solid rgba(var(--accent2-rgb), 0.26) !important;
        background: linear-gradient(135deg, rgba(var(--accent-rgb),0.16), rgba(var(--accent2-rgb),0.16)) !important;
        color: var(--text) !important;
        box-shadow: 0 0 0 rgba(0,0,0,0), 0 0 24px var(--glowA);
        transition: transform 120ms ease, box-shadow 150ms ease, border-color 150ms ease;
      }
      .stButton>button:hover{
        transform: translateY(-1px);
        box-shadow: 0 0 42px var(--glowB), 0 0 24px var(--glowA);
        border-color: rgba(var(--accent-rgb),0.55) !important;
      }
      /* Inputs */
      textarea, input, [data-baseweb="input"], [data-baseweb="textarea"]{
        background: rgba(var(--verylight-rgb), 0.55) !important;
        border: 1px solid rgba(var(--accent2-rgb), 0.20) !important;
        color: var(--text) !important;
        border-radius: 12px !important;
      }
      html[data-theme="light"] textarea,
      html[data-theme="light"] input,
      html[data-theme="light"] [data-baseweb="input"],
      html[data-theme="light"] [data-baseweb="textarea"],
      body[data-theme="light"] textarea,
      body[data-theme="light"] input,
      body[data-theme="light"] [data-baseweb="input"],
      body[data-theme="light"] [data-baseweb="textarea"],
      .stApp[data-theme="light"] textarea,
      .stApp[data-theme="light"] input,
      .stApp[data-theme="light"] [data-baseweb="input"],
      .stApp[data-theme="light"] [data-baseweb="textarea"]{
        background: rgba(var(--verylight-rgb), 0.75) !important;
        border: 1px solid rgba(var(--accent-rgb), 0.22) !important;
      }
      /* File uploader dropzone */
      div[data-testid="stFileUploadDropzone"],
      div[data-testid="stFileUploaderDropzone"],
      .stFileUploader,
      .stFileUploaderDropzone{
        background: rgba(var(--verylight-rgb), 0.42) !important;
        border: 1px dashed rgba(var(--accent-rgb),0.45) !important;
        border-radius: 16px !important;
        box-shadow: 0 0 28px rgba(var(--accent-rgb),0.10) !important;
      }
      html[data-theme="light"] div[data-testid="stFileUploadDropzone"],
      html[data-theme="light"] div[data-testid="stFileUploaderDropzone"],
      html[data-theme="light"] .stFileUploader,
      html[data-theme="light"] .stFileUploaderDropzone,
      body[data-theme="light"] div[data-testid="stFileUploadDropzone"],
      body[data-theme="light"] div[data-testid="stFileUploaderDropzone"],
      body[data-theme="light"] .stFileUploader,
      body[data-theme="light"] .stFileUploaderDropzone,
      .stApp[data-theme="light"] div[data-testid="stFileUploadDropzone"],
      .stApp[data-theme="light"] div[data-testid="stFileUploaderDropzone"],
      .stApp[data-theme="light"] .stFileUploader,
      .stApp[data-theme="light"] .stFileUploaderDropzone{
        background: rgba(var(--verylight-rgb), 0.68) !important;
        box-shadow: 0 0 28px rgba(var(--accent-rgb),0.14) !important;
      }
      div[data-testid="stFileUploadDropzone"] *,
      div[data-testid="stFileUploaderDropzone"] *{
        color: var(--text) !important;
      }
      hr{
        border: none !important;
        height: 1px !important;
        background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb),0.55), rgba(var(--accent2-rgb),0.45), transparent) !important;
      }
      /* Login screen */
      .login-wrapper{
        display:flex;
        justify-content:center;
        align-items:flex-start;
        padding-top:4vh;
      }
      .login-card{
        width: 420px;
        max-width: 95vw;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 18px;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.02), 0 20px 50px rgba(0,0,0,0.28);
        backdrop-filter: blur(10px);
        padding: 22px 22px 18px 22px;
      }
      .login-card h1, .login-card h2, .login-card h3{
        margin-top: 0;
      }
    </style>
    """,
    unsafe_allow_html=True,
)

# -----------------------------
# Simple local authentication
# -----------------------------
# This is a lightweight gate for this Streamlit app.
# For real security, use SSO/reverse-proxy auth instead.
st.session_state.setdefault("authenticated", False)
DEFAULT_USERNAME = os.getenv("APP_USERNAME", "tecttitans")
DEFAULT_PASSWORD = os.getenv("APP_PASSWORD", "Tt2026")

if not st.session_state.authenticated:
    st.markdown(
        """
        <div class="login-wrapper">
          <div class="login-card">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
              <h2 style="margin:0; font-size:20px;">Sign In</h2>
              <div style="font-size:12px; color: var(--muted);">Local Access</div>
            </div>
        """,
        unsafe_allow_html=True,
    )

    with st.form("login_form", clear_on_submit=False):
        username = st.text_input("Username", value=DEFAULT_USERNAME)
        password = st.text_input("Password", value=DEFAULT_PASSWORD, type="password")
        submit = st.form_submit_button("Sign In")

    if submit:
        if username == DEFAULT_USERNAME and password == DEFAULT_PASSWORD:
            st.session_state.authenticated = True
            st.rerun()
        else:
            st.error("Invalid username or password.")

    st.markdown("</div></div>", unsafe_allow_html=True)
    st.stop()

st.title("📈 Financial Research Assistant")
st.caption("AI Financial Research Assistant | Local LLM Architecture | Built with Streamlit + Ollama")
st.markdown("---")

with st.expander("How it works (Flow chart)", expanded=False):
    st.markdown(
        """
        ```mermaid
        flowchart TD
          A[Upload PDF] --> B[Extract text from PDF]
          B --> C{Auto-run Feature 1/2/3?}
          C -->|Yes| D1[Run Feature 1: KPIs/Trends]
          C -->|Yes| D2[Run Feature 2: Macro/Market Impact]
          C -->|Yes| D3[Run Feature 3: Research Brief]
          C -->|No| E[Wait for button clicks]

          B --> J{Auto-run Advanced (4/5/6)?}
          J -->|Yes| D4[Run Feature 4: Risk & Red Flags]
          J -->|Yes| D5[Run Feature 5: Earnings Call Intelligence]
          J -->|Yes| D6[Run Feature 6: Financial Modeling Copilot]
          J -->|No| E
          
          D1 --> F1{Ollama available?}
          F1 -->|Yes| G1[Ollama output shown under Feature 1]
          F1 -->|No (fallback)| H1[Claude output shown under Feature 1]
          
          D2 --> F2{Ollama available?}
          F2 -->|Yes| G2[Ollama output shown under Feature 2]
          F2 -->|No (fallback)| H2[Claude output shown under Feature 2]
          
          D3 --> I1[Claude output shown under Feature 3]
          
          D4 --> F3{Ollama available?}
          F3 -->|Yes| G4[Ollama output shown under Feature 4]
          F3 -->|No (fallback)| H4[Claude output shown under Feature 4]

          D5 --> F4{Ollama available?}
          F4 -->|Yes| G5[Ollama output shown under Feature 5]
          F4 -->|No (fallback)| H5[Claude output shown under Feature 5]

          D6 --> F5{Ollama available?}
          F5 -->|Yes| G6[Ollama output shown under Feature 6]
          F5 -->|No (fallback)| H6[Claude output shown under Feature 6]

          E --> D1
          E --> D2
          E --> D3
          E --> D4
          E --> D5
          E --> D6
        ```
        """,
        unsafe_allow_html=True,
    )

st.sidebar.header("📁 Data Ingestion")
ollama_url = os.getenv("OLLAMA_HOST") or os.getenv("OLLAMA_BASE_URL") or "http://localhost:11434"
ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:1b")

# Ollama settings intentionally hidden to simplify the UI.
# Override via environment variables: OLLAMA_HOST / OLLAMA_BASE_URL and OLLAMA_MODEL.
st.sidebar.info(
    "Ollama settings hidden. If needed, set env vars `OLLAMA_HOST` (or `OLLAMA_BASE_URL`) "
    "and `OLLAMA_MODEL`."
)

st.sidebar.markdown("---")
st.sidebar.header("🌐 Claude (Cloud fallback)")
claude_api_key = os.getenv("CLAUDE_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or ""
claude_model = st.sidebar.text_input(
    "Claude model",
    value=os.getenv("CLAUDE_MODEL", "claude-3-5-haiku-20241022"),
)
use_claude_fallback = st.sidebar.checkbox(
    "Use Claude if Ollama fails",
    value=True,
    help="If the selected Ollama model isn't available or Ollama is unreachable, Claude (Anthropic) will be used instead.",
)
auto_trigger_on_upload = st.sidebar.checkbox(
    "Auto-run Feature 1/2/3 after upload",
    value=True,
    help="When enabled, the app will automatically run the three main features once you upload a PDF.",
)
auto_trigger_advanced = st.sidebar.checkbox(
    "Auto-run Risk/Call/Model features after upload",
    value=True,
    help="When enabled, the app will also run Risk & Red Flags, Earnings Call Intelligence, and Financial Modeling Copilot once you upload a PDF.",
)

# Speed settings for faster auto-runs.
context_limit = 2500
ollama_options_fast = {"num_predict": 180, "temperature": 0.2, "top_p": 0.9}
ollama_think_fast = "low"
uploaded_file = st.sidebar.file_uploader("Upload SEC Filings, Transcripts, or News (PDF)", type="pdf")
st.sidebar.markdown("---")
st.sidebar.info(
    "🔐 Ollama mode is local. If Claude fallback is enabled, requests go to Anthropic (based on your Claude API key)."
)

if uploaded_file:
    with st.spinner("Indexing & Archiving Artifact..."):
        reader = PdfReader(uploaded_file)
        pdf_text = ""
        for page in reader.pages:
            # Some PDFs don't have extractable text; avoid crashing.
            pdf_text += page.extract_text() or ""
    
    st.success(f"✅ {uploaded_file.name} Indexed & Archived Successfully")

    # Auto-trigger main features exactly once per upload/settings combo.
    upload_size = getattr(uploaded_file, "size", None)
    upload_size_part = str(upload_size) if upload_size is not None else "0"
    auto_run_key = (
        f"{uploaded_file.name}:{upload_size_part}:"
        f"{ollama_url}:{ollama_model}:{claude_model}:{use_claude_fallback}"
        f":adv={auto_trigger_advanced}"
    )
    if st.session_state.get("auto_run_key") != auto_run_key:
        st.session_state["auto_run_key"] = auto_run_key
        st.session_state["auto_results"] = None

    if auto_trigger_on_upload and st.session_state.get("auto_results") is None:
        with st.spinner("Running Feature 1 (KPIs/Trends)..."):
            model = ollama_model
            content = (
                "Extract Net Income, Revenue, and Operating Margin from this filing: "
                    f"{pdf_text[:context_limit]}"
            )
            result_f1 = ollama_chat_safe(
                host=ollama_url,
                model=model,
                user_content=content,
                show_errors=not use_claude_fallback,
            )
            if result_f1 is None and use_claude_fallback:
                result_f1 = claude_chat_safe(claude_api_key, claude_model, content)

        with st.spinner("Running Feature 2 (Macro/Market Impact)..."):
            model = ollama_model
            content = (
                "Analyze this artifact for macro exposure, sector rotation signals, and "
                f"event impact simulation: {pdf_text[:context_limit]}"
            )
            result_f2 = ollama_chat_safe(
                host=ollama_url,
                model=model,
                user_content=content,
                show_errors=not use_claude_fallback,
            )
            if result_f2 is None and use_claude_fallback:
                result_f2 = claude_chat_safe(claude_api_key, claude_model, content)

        with st.spinner("Running Feature 3 (Claude Research Brief)..."):
            content = (
                "Create a structured 'Claude Brief' summarizing the key takeaways from this text: "
                f"{pdf_text[:context_limit]}"
            )
            result_f3 = claude_chat_safe(claude_api_key, claude_model, content)

        result_f4 = None
        result_f5 = None
        result_f6 = None

        if auto_trigger_advanced:
            with st.spinner("Running Feature 4 (Risk & Red Flags)..."):
                content = (
                    "Analyze this text and detect financial risks and red flags. "
                    "Include: revenue recognition issues, margin deterioration, leverage/liquidity concerns, "
                    "unusual adjustments, accounting policy changes, governance/auditor red flags, "
                    "litigation/regulatory risks, and any potential fraud indicators. "
                    "For each red flag include: Severity (High/Medium/Low), Category, Why it matters, "
                    "and a short list of exact quotes under a section titled 'CITED PASSAGES' "
                    "(quote exact sentences from the text). "
                    f"TEXT: {pdf_text[:context_limit]}"
                )
                result_f4 = ollama_chat_safe(
                    host=ollama_url,
                    model=ollama_model,
                    user_content=content,
                    show_errors=not use_claude_fallback,
                )
                if result_f4 is None and use_claude_fallback:
                    result_f4 = claude_chat_safe(claude_api_key, claude_model, content)

            with st.spinner("Running Feature 5 (Earnings Call Intelligence)..."):
                content = (
                    "Analyze this text as an earnings call / management discussion. "
                    "Extract: performance highlights, KPIs mentioned, guidance (if any), "
                    "key themes, management tone changes, risks/uncertainties, and Q&A themes. "
                    "Provide a 'CITED PASSAGES' section quoting exact sentences from the text "
                    "to support each key point. "
                    f"TEXT: {pdf_text[:context_limit]}"
                )
                result_f5 = ollama_chat_safe(
                    host=ollama_url,
                    model=ollama_model,
                    user_content=content,
                    show_errors=not use_claude_fallback,
                )
                if result_f5 is None and use_claude_fallback:
                    result_f5 = claude_chat_safe(claude_api_key, claude_model, content)

            with st.spinner("Running Feature 6 (Financial Modeling Copilot)..."):
                content = (
                    "You are a financial modeling copilot. Using only information from this text, "
                    "build a practical plan for a simple financial model. "
                    "Output sections: (1) Model Overview, (2) Extracted Inputs/Assumptions, "
                    "(3) Driver-based Forecast (next 4 quarters or next fiscal year), "
                    "(4) 3-Statement Structure (Income Statement, Balance Sheet, Cash Flow) with formulas "
                    "described clearly, (5) Sensitivity/Scenario ideas (at least 2), and "
                    "(6) Cited Inputs where you quote exact sentences under a section titled 'CITED PASSAGES'. "
                    f"TEXT: {pdf_text[:context_limit]}"
                )
                result_f6 = ollama_chat_safe(
                    host=ollama_url,
                    model=ollama_model,
                    user_content=content,
                    show_errors=not use_claude_fallback,
                )
                if result_f6 is None and use_claude_fallback:
                    result_f6 = claude_chat_safe(claude_api_key, claude_model, content)

        st.session_state["auto_results"] = {
            "f1": result_f1,
            "f2": result_f2,
            "f3": result_f3,
            "f4": result_f4,
            "f5": result_f5,
            "f6": result_f6,
        }

    with st.expander("📂 View Indexed Artifact (The Local Archive)"):
        st.write("This is the raw data stored in the local session memory for analysis:")
        st.text_area("Archived Text Content:", pdf_text[:10000], height=250)

    m1, m2, m3 = st.columns(3)
    m1.metric("Asset Class", "US Equity", "Standard")
    m2.metric("Engine", "Llama 3.2 (Local)", "Active")
    m3.metric("Privacy Status", "Air-Gapped", "Secure")
    st.markdown("---")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("📊 Feature 1: Financial Data Analysis")
        auto_results = st.session_state.get("auto_results") or {}
        if auto_results.get("f1") is not None:
            st.write(auto_results["f1"])
        if st.button("Extract US KPIs & Trends"):
            with st.spinner("Analyzing US GAAP metrics..."):
                model = ollama_model
                content = (
                    "Extract Net Income, Revenue, and Operating Margin from this filing: "
                    f"{pdf_text[:context_limit]}"
                )
                result = ollama_chat_safe(
                    host=ollama_url,
                    model=model,
                    user_content=content,
                    show_errors=not use_claude_fallback,
                )
                if result is None and use_claude_fallback:
                    st.info("Ollama failed; using Claude instead.")
                    result = claude_chat_safe(claude_api_key, claude_model, content)
                if result is not None:
                    st.write(result)
                    st.session_state["auto_results"] = {
                        **(st.session_state.get("auto_results") or {}),
                        "f1": result,
                    }

    with col2:
        st.subheader("🌐 Feature 2: Market & Macro Intelligence")
        auto_results = st.session_state.get("auto_results") or {}
        if auto_results.get("f2") is not None:
            st.info(auto_results["f2"])
        if st.button("Analyze Market & Macro Impact"):
            with st.spinner("Simulating macro event impact..."):
                model = ollama_model
                content = (
                    "Analyze this artifact for macro exposure, sector rotation signals, and "
                    f"event impact simulation: {pdf_text[:context_limit]}"
                )
                result = ollama_chat_safe(
                    host=ollama_url,
                    model=model,
                    user_content=content,
                    show_errors=not use_claude_fallback,
                )
                if result is None and use_claude_fallback:
                    st.info("Ollama failed; using Claude instead.")
                    result = claude_chat_safe(claude_api_key, claude_model, content)
                if result is not None:
                    st.info(result)
                    st.session_state["auto_results"] = {
                        **(st.session_state.get("auto_results") or {}),
                        "f2": result,
                    }

    st.markdown("---")
    st.subheader("📝 Feature 3: Claude Research Brief")
    auto_results = st.session_state.get("auto_results") or {}
    if auto_results.get("f3") is not None:
        st.warning(auto_results["f3"])
    if st.button("Generate Executive Briefing"):
        with st.spinner("Synthesizing brief..."):
            content = (
                "Create a structured 'Claude Brief' summarizing the key takeaways from this text: "
                f"{pdf_text[:context_limit]}"
            )
            result = claude_chat_safe(claude_api_key, claude_model, content)
            if result is not None:
                st.warning(result)
                st.session_state["auto_results"] = {
                    **(st.session_state.get("auto_results") or {}),
                    "f3": result,
                }

    st.markdown("---")
    st.subheader("🛑 Feature 4: Risk & Red Flag Detection")
    auto_results = st.session_state.get("auto_results") or {}
    if auto_results.get("f4") is not None:
        st.error(auto_results["f4"])
    if st.button("Detect Risks & Red Flags"):
        with st.spinner("Detecting risks and red flags..."):
            content = (
                "Analyze this text and detect financial risks and red flags. "
                "Include: revenue recognition issues, margin deterioration, leverage/liquidity concerns, "
                "unusual adjustments, accounting policy changes, governance/auditor red flags, "
                "litigation/regulatory risks, and any potential fraud indicators. "
                "For each red flag include: Severity (High/Medium/Low), Category, Why it matters, "
                "and a short list of exact quotes under a section titled 'CITED PASSAGES' "
                "(quote exact sentences from the text). "
                f"TEXT: {pdf_text[:context_limit]}"
            )
            result = ollama_chat_safe(
                host=ollama_url,
                model=ollama_model,
                user_content=content,
                show_errors=not use_claude_fallback,
            )
            if result is None and use_claude_fallback:
                st.info("Ollama failed; using Claude instead.")
                result = claude_chat_safe(claude_api_key, claude_model, content)
            if result is not None:
                st.error(result)
                st.session_state["auto_results"] = {
                    **(st.session_state.get("auto_results") or {}),
                    "f4": result,
                }

    st.markdown("---")
    st.subheader("🎙️ Feature 5: Earnings Call Intelligence")
    auto_results = st.session_state.get("auto_results") or {}
    if auto_results.get("f5") is not None:
        st.info(auto_results["f5"])
    if st.button("Extract Earnings Call Intelligence"):
        with st.spinner("Extracting earnings call intelligence..."):
            content = (
                "Analyze this text as an earnings call / management discussion. "
                "Extract: performance highlights, KPIs mentioned, guidance (if any), "
                "key themes, management tone changes, risks/uncertainties, and Q&A themes. "
                "Provide a 'CITED PASSAGES' section quoting exact sentences from the text "
                "to support each key point. "
                f"TEXT: {pdf_text[:context_limit]}"
            )
            result = ollama_chat_safe(
                host=ollama_url,
                model=ollama_model,
                user_content=content,
                show_errors=not use_claude_fallback,
            )
            if result is None and use_claude_fallback:
                st.info("Ollama failed; using Claude instead.")
                result = claude_chat_safe(claude_api_key, claude_model, content)
            if result is not None:
                st.info(result)
                st.session_state["auto_results"] = {
                    **(st.session_state.get("auto_results") or {}),
                    "f5": result,
                }

    st.markdown("---")
    st.subheader("🧮 Feature 6: Financial Modeling Copilot")
    auto_results = st.session_state.get("auto_results") or {}
    if auto_results.get("f6") is not None:
        st.warning(auto_results["f6"])
    if st.button("Build Financial Model Plan"):
        with st.spinner("Building financial model plan..."):
            content = (
                "You are a financial modeling copilot. Using only information from this text, "
                "build a practical plan for a simple financial model. "
                "Output sections: (1) Model Overview, (2) Extracted Inputs/Assumptions, "
                "(3) Driver-based Forecast (next 4 quarters or next fiscal year), "
                "(4) 3-Statement Structure (Income Statement, Balance Sheet, Cash Flow) with formulas "
                "described clearly, (5) Sensitivity/Scenario ideas (at least 2), and "
                "(6) Cited Inputs where you quote exact sentences under a section titled 'CITED PASSAGES'. "
                f"TEXT: {pdf_text[:context_limit]}"
            )
            # Modeling is often more structured; prefer Ollama and fallback to Claude.
            result = ollama_chat_safe(
                host=ollama_url,
                model=ollama_model,
                user_content=content,
                show_errors=not use_claude_fallback,
            )
            if result is None and use_claude_fallback:
                st.info("Ollama failed; using Claude instead.")
                result = claude_chat_safe(claude_api_key, claude_model, content)
            if result is not None:
                st.warning(result)
                st.session_state["auto_results"] = {
                    **(st.session_state.get("auto_results") or {}),
                    "f6": result,
                }

    st.markdown("---")
    st.subheader("🔍 Custom Analyst Query (with Citations)")
    user_query = st.text_input("Ask a specific question (AI will provide cited passages from the archive):")
    
    if user_query:
        with st.spinner("Retrieving cited passages from archive..."):
            model = ollama_model
            content = (
                f"Using this text: {pdf_text[:context_limit]}, answer: '{user_query}'. "
                "IMPORTANT: You MUST include a section titled 'CITED PASSAGES' and quote exact sentences from the text."
            )
            result = ollama_chat_safe(
                host=ollama_url,
                model=model,
                user_content=content,
                show_errors=not use_claude_fallback,
            )
            if result is None and use_claude_fallback:
                st.info("Ollama failed; using Claude instead.")
                result = claude_chat_safe(claude_api_key, claude_model, content)
            if result is not None:
                st.success(result)

else:
    st.info("👋 Welcome Analyst. Please upload a PDF in the sidebar to begin.")