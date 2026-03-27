import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import './App.css'
import CompanyDetail from './CompanyDetail'
import CompareModule from './CompareModule'
import Dashboard from './Dashboard'
import FlowChart from './FlowChart'
import FloatingLines from './FloatingLines'
import AnimatedList from './AnimatedList'
import AiReportView from './AiReportView'
import ChatAnalystView from './ChatAnalystView'
import AiFinancialAgentView from './AiFinancialAgentView'
import SovereignLanding from './SovereignLanding'
import TerminalShell, { type TerminalNavId } from './TerminalShell'
import { pushIntelDocUpload } from './intelDocsStorage'

type Reports = {
  f1: string | null
  f2: string | null
  f3: string | null
  f4: string | null
  f5: string | null
  f6: string | null
}

type FeatureId = 1 | 2 | 3 | 4 | 5 | 6
type FeatureStatus = 'idle' | 'pending' | 'running' | 'done' | 'error'

const FEATURE_LABELS: { id: FeatureId; label: string }[] = [
  { id: 1, label: 'KPIs/Trends' },
  { id: 2, label: 'Macro/Market' },
  { id: 3, label: 'Modeling Copilot' },
  { id: 4, label: 'Risks & Red Flags' },
  { id: 5, label: 'Earnings Call' },
  { id: 6, label: 'Research Brief' },
]

const FEATURE_STATUS_INITIAL: Record<FeatureId, FeatureStatus> = {
  1: 'idle',
  2: 'idle',
  3: 'idle',
  4: 'idle',
  5: 'idle',
  6: 'idle',
}

const STARRED_FILERS: Array<{ ticker: string; filer_name: string; sec_url: string }> = [
  {
    ticker: 'AAPL',
    filer_name: 'Apple Inc.',
    sec_url:
      'https://www.sec.gov/ix?doc=/Archives/edgar/data/0000320193/000114036126006577/ef20060722_8k.htm',
  },
  { ticker: 'MSFT', filer_name: 'Microsoft Corporation', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=789019' },
  { ticker: 'GOOGL', filer_name: 'Alphabet Inc.', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=1652044' },
  { ticker: 'NVDA', filer_name: 'NVIDIA Corporation', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=1045810' },
  { ticker: 'AMZN', filer_name: 'Amazon.com Inc.', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=1018724' },
  { ticker: 'WMT', filer_name: 'Walmart Inc.', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=104169' },
  { ticker: 'TSLA', filer_name: 'Tesla Inc.', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=1318605' },
  { ticker: 'CAT', filer_name: 'Caterpillar Inc.', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=18230' },
  { ticker: 'AAL', filer_name: 'American Airlines Group', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=6201' },
  { ticker: 'DAL', filer_name: 'Delta Air Lines', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=27904' },
  { ticker: 'JPM', filer_name: 'JPMorgan Chase', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=19617' },
  { ticker: 'BAC', filer_name: 'Bank of America', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=70858' },
  { ticker: 'GS', filer_name: 'Goldman Sachs', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=886982' },
  { ticker: 'PFE', filer_name: 'Pfizer', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=78003' },
  { ticker: 'JNJ', filer_name: 'Johnson & Johnson', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=200406' },
  { ticker: 'MRK', filer_name: 'Merck & Co.', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=64912' },
  { ticker: 'XOM', filer_name: 'Exxon Mobil Corporation', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=34088' },
  { ticker: 'CVX', filer_name: 'Chevron Corporation', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=93410' },
  { ticker: 'CMCSA', filer_name: 'Comcast Corporation', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=1166691' },
  { ticker: 'PG', filer_name: 'Procter & Gamble Co.', sec_url: 'https://www.sec.gov/edgar/browse/?CIK=80424' },
]

function FeatureCard({
  title,
  value,
  kind,
}: {
  title: string
  value: string | null
  kind: 'info' | 'warning' | 'danger'
}) {
  return (
    <section className={`ResultCard Result-${kind}`}>
      <div className="ResultCardTitle">{title}</div>
      {value != null ? <pre className="Pre">{value}</pre> : <div className="Empty">No output yet.</div>}
    </section>
  )
}

export default function FinancialApp() {
  // The frontend talks to the FastAPI backend.
  // Default backend port (8000) when no env var is provided.
  const backendBase = useMemo(
    () => import.meta.env.VITE_BACKEND_BASE_URL || 'http://127.0.0.1:8000',
    [],
  )

  const [token, setToken] = useState<string | null>(null)
  /** Pre-auth: marketing landing vs sign-in card */
  const [authScreen, setAuthScreen] = useState<'landing' | 'signin' | 'signup'>('landing')
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [reports, setReports] = useState<Reports | null>(null)

  const [busy, setBusy] = useState(false)
  const [analysisInProgress, setAnalysisInProgress] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Login form
  const [username, setUsername] = useState('tecttitans')
  const [password, setPassword] = useState('Tt2026')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [signInNotice, setSignInNotice] = useState<string | null>(null)

  // Company list (SEC 10-K filers) for dropdown
  const [companyList, setCompanyList] = useState<Array<{ ticker: string; filer_name: string }>>([])
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  /** Free-text search for filer; selecting a suggestion sets `selectedCompany` (ticker). */
  const [filerSearchText, setFilerSearchText] = useState('')
  const [showFilerSuggestions, setShowFilerSuggestions] = useState(false)
  const [companiesLoading, setCompaniesLoading] = useState(false)

  // Upload + auto-run options
  const [file, setFile] = useState<File | null>(null)
  const [auto1_3, setAuto1_3] = useState(true)
  const [auto4_6, setAuto4_6] = useState(true)
  const [useGeminiFallback, setUseGeminiFallback] = useState(true)
  const [featureStatus, setFeatureStatus] = useState<Record<FeatureId, FeatureStatus>>(FEATURE_STATUS_INITIAL)

  const [showBusinessWorkflow, setShowBusinessWorkflow] = useState(false)

  // Post-login view: Dashboard, Research, Compare
  const [view, setView] = useState<'home' | 'research' | 'compare' | 'aiReport' | 'chat' | 'aiAgent'>('home')
  // When a company is selected on Dashboard, show company detail view (sentiment, charts, etc.)
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<{
    ticker: string
    name: string
  } | null>(null)
  // Search error handling
  const [searchError, setSearchError] = useState<string | null>(null)

  const businessFlow = `
flowchart TD
  subgraph Ingestion
    U[Manual upload document (PDF)] --> T[Extract & normalize text]
    S[Search from SEC URL] --> X[Fetch SEC HTML filing]
    X --> XG[Claude: extract key points]
    XG --> P[Generate summary PDF]
    P --> T
  end

  T --> L[LLM Engine<br/>Ollama first, Claude fallback]

  L --> F1[KPIs & Trends]
  L --> F2[Macro & Market context]
  L --> F3[Financial Modeling Copilot]
  L --> F4[Risks & Red Flags]
  L --> F5[Earnings Call Intelligence]
  L --> F6[Research Brief]

  F1 --> G[Business Perspective View]
  F2 --> G
  F3 --> G
  F4 --> G
  F5 --> G
  F6 --> G

  G --> H[Executive insights + next actions]
  `

  // Load SEC company list when user is logged in
  useEffect(() => {
    if (!token) return
    let cancelled = false
    setCompaniesLoading(true)
    fetch(`${backendBase}/api/companies`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((list: Array<{ ticker: string; filer_name: string }>) => {
        if (!cancelled) setCompanyList(list)
      })
      .catch(() => {
        if (!cancelled) setCompanyList([])
      })
      .finally(() => {
        if (!cancelled) setCompaniesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, backendBase])

  useEffect(() => {
    try {
      const u = localStorage.getItem('tecttitans_remember_user')
      if (u) {
        setUsername(u)
        setRememberMe(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const filteredCompanies = useMemo(() => companyList.slice(0, 500), [companyList])

  const combinedFilerOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: Array<{ ticker: string; filer_name: string; sec_url?: string }> = []
    for (const s of STARRED_FILERS) {
      if (!seen.has(s.ticker)) {
        seen.add(s.ticker)
        out.push(s)
      }
    }
    for (const c of filteredCompanies) {
      if (!seen.has(c.ticker)) {
        seen.add(c.ticker)
        out.push({ ticker: c.ticker, filer_name: c.filer_name })
      }
    }
    return out
  }, [filteredCompanies])

  const filerSuggestions = useMemo(() => {
    const q = filerSearchText.trim().toLowerCase()
    const list = combinedFilerOptions
    if (!q) return list.slice(0, 40)
    return list
      .filter(
        (c) =>
          c.filer_name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q),
      )
      .slice(0, 80)
  }, [combinedFilerOptions, filerSearchText])

  const pickFiler = (c: { ticker: string; filer_name: string }) => {
    setSelectedCompany(c.ticker)
    setFilerSearchText(`${c.filer_name} (${c.ticker})`)
    setShowFilerSuggestions(false)
  }

  const selectedStarred = useMemo(
    () => STARRED_FILERS.find((s) => s.ticker === selectedCompany),
    [selectedCompany],
  )

  async function apiLogin() {
    setError(null)
    setSignInNotice(null)
    setBusy(true)
    try {
      const res = await fetch(`${backendBase}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      const data = await res.json()
      setToken(data.token)
      try {
        if (rememberMe) localStorage.setItem('tecttitans_remember_user', username.trim())
        else localStorage.removeItem('tecttitans_remember_user')
      } catch {
        /* ignore */
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function apiSignup() {
    setError(null)
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const res = await fetch(`${backendBase}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      setAuthScreen('signin')
      setConfirmPassword('')
      setError('Signup successful. Please sign in.')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function clearSessionUI() {
    // Token is stored in-memory on the backend; when the backend restarts or
    // the wrong backend is used, existing tokens become invalid. Clearing
    // these makes the next request prompt a fresh login.
    setToken(null)
    setUploadId(null)
    setReports(null)
    setAnalysisInProgress(false)
    setAuthScreen('signin')
  }

  function handleSignOut() {
    setToken(null)
    setUploadId(null)
    setReports(null)
    setAnalysisInProgress(false)
    setAuthScreen('landing')
  }

  async function assertOk(res: Response) {
    if (res.ok) return

    if (res.status === 401) {
      // Backend returns: {"detail":"Invalid token"} or {"detail":"Missing token"}
      try {
        const t = await res.text()
        const parsed = JSON.parse(t)
        void parsed?.detail
      } catch {
        // ignore
      }

      clearSessionUI()
      setError('Session expired. Please sign in again.')
      // Stop the current flow (upload/run loops).
      throw new Error('SESSION_EXPIRED')
    }

    throw new Error(await res.text())
  }

  async function apiUploadAndRun(sourceFile?: File | null) {
    if (!token) return
    const candidate = sourceFile ?? file
    const effectiveFile = candidate instanceof File ? candidate : null
    if (!effectiveFile) {
      setError('Please select a document first.')
      return
    }
    setError(null)
    setAnalysisInProgress(true)
    setBusy(true)
    setReports(null)
    setUploadId(null)

    try {
      const fd = new FormData()
      fd.append('file', effectiveFile)
      fd.append('auto_1_3', String(auto1_3))
      fd.append('auto_4_6', String(auto4_6))
      fd.append('use_gemini_fallback', String(useGeminiFallback))

      const res = await fetch(`${backendBase}/api/upload-and-run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      await assertOk(res)
      const data = await res.json()
      const uploadIdLocal: string = data.upload_id
      const initialReports: Reports = data.reports

      setUploadId(uploadIdLocal)
      pushIntelDocUpload(effectiveFile.name)
      let nextReports: Reports = { ...initialReports }
      setReports(nextReports)

      // Ensure all requested feature panels populate.
      // We run Feature 3 *after* Feature 1,2,4,5,6 are complete.
      const allowedKeys = new Set<keyof Reports>()
      if (auto1_3) {
        allowedKeys.add('f1')
        allowedKeys.add('f2')
        allowedKeys.add('f3')
      }

      const featureIdFromKey: Record<keyof Reports, FeatureId> = {
        f1: 1,
        f2: 2,
        f3: 3,
        f4: 4,
        f5: 5,
        f6: 6,
      }

      const allowedFeatureIds: FeatureId[] = []
      for (const key of allowedKeys) {
        allowedFeatureIds.push(featureIdFromKey[key])
      }

      setFeatureStatus((prev) => {
        const next: Record<FeatureId, FeatureStatus> = { ...prev }
        for (const id of [1, 2, 3, 4, 5, 6] as FeatureId[]) {
          next[id] = allowedFeatureIds.includes(id) ? 'pending' : 'idle'
        }
        return next
      })
      if (auto4_6) {
        allowedKeys.add('f4')
        allowedKeys.add('f5')
        allowedKeys.add('f6')
      }

      const isMissing = (key: keyof Reports) => {
        const v = nextReports[key]
        return v == null || String(v).trim().length === 0
      }

      const phaseA: Array<{ key: keyof Reports; id: number }> = [
        { key: 'f1', id: 1 },
        { key: 'f2', id: 2 },
        { key: 'f4', id: 4 },
        { key: 'f5', id: 5 },
        { key: 'f6', id: 6 },
      ]
      const phaseB: Array<{ key: keyof Reports; id: number }> = [{ key: 'f3', id: 3 }]

      const missingA = phaseA.filter(({ key }) => allowedKeys.has(key) && isMissing(key))
      const missingB = phaseB.filter(({ key }) => allowedKeys.has(key) && isMissing(key))

      for (const m of missingA) {
        try {
          setFeatureStatus((prev) => ({ ...prev, [m.id as FeatureId]: 'running' }))
          const runRes = await fetch(`${backendBase}/api/run-feature`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              upload_id: uploadIdLocal,
              feature_id: m.id,
              use_gemini_fallback: useGeminiFallback,
            }),
          })

          await assertOk(runRes)

          const runData = await runRes.json()
          const updatedValue: string | null = runData.output ?? null
          nextReports = { ...nextReports, [m.key]: updatedValue } as Reports
          setReports(nextReports)
          setFeatureStatus((prev) => ({ ...prev, [m.id as FeatureId]: 'done' }))
        } catch (err) {
          if (err instanceof Error && err.message === 'SESSION_EXPIRED') throw err
          setFeatureStatus((prev) => ({ ...prev, [m.id as FeatureId]: 'error' }))
          throw err
        }
      }

      // Only trigger Feature 3 after the rest (1,2,4,5,6) are done.
      for (const m of missingB) {
        try {
          setFeatureStatus((prev) => ({ ...prev, [m.id as FeatureId]: 'running' }))
          const runRes = await fetch(`${backendBase}/api/run-feature`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              upload_id: uploadIdLocal,
              feature_id: m.id,
              use_gemini_fallback: useGeminiFallback,
            }),
          })

          await assertOk(runRes)

          const runData = await runRes.json()
          const updatedValue: string | null = runData.output ?? null
          nextReports = { ...nextReports, [m.key]: updatedValue } as Reports
          setReports(nextReports)
          setFeatureStatus((prev) => ({ ...prev, [m.id as FeatureId]: 'done' }))
        } catch (err) {
          if (err instanceof Error && err.message === 'SESSION_EXPIRED') throw err
          setFeatureStatus((prev) => ({ ...prev, [m.id as FeatureId]: 'error' }))
          throw err
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') return
      setError(e instanceof Error ? e.message : String(e))
      // Mark any pending/running features as errored.
      setFeatureStatus((prev) => {
        const next: Record<FeatureId, FeatureStatus> = { ...prev }
        ;([1, 2, 3, 4, 5, 6] as FeatureId[]).forEach((k) => {
          if (next[k] === 'pending' || next[k] === 'running') next[k] = 'error'
        })
        return next
      })
    } finally {
      setBusy(false)
      setAnalysisInProgress(false)
    }
  }

  async function handleSecSearchAndRun() {
    try {
      const typedCompanyName = filerSearchText.trim()
      if (!selectedCompany && !typedCompanyName) {
        setError('Please select a filer or type a company name first.')
        return
      }
      setError(null)
      setAnalysisInProgress(true)

      const createPdfFromExtract = async (payload: {
        document_url: string
        title?: string
        key_points?: string[]
        text: string
      }): Promise<File> => {
        const pdf = await PDFDocument.create()
        const font = await pdf.embedFont(StandardFonts.Helvetica)
        const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
        const page = pdf.addPage([595, 842]) // A4
        const { width, height } = page.getSize()
        const margin = 40
        const maxWidth = width - margin * 2
        const lineHeight = 14
        let y = height - margin

        const drawWrapped = (text: string, bold = false, size = 11) => {
          const f = bold ? fontBold : font
          const words = (text || '').split(/\s+/).filter(Boolean)
          let line = ''
          for (const w of words) {
            const next = line ? `${line} ${w}` : w
            const tw = f.widthOfTextAtSize(next, size)
            if (tw > maxWidth && line) {
              page.drawText(line, { x: margin, y, size, font: f })
              y -= lineHeight
              line = w
            } else {
              line = next
            }
          }
          if (line) {
            page.drawText(line, { x: margin, y, size, font: f })
            y -= lineHeight
          }
        }

        drawWrapped(payload.title || 'SEC Filing Summary', true, 14)
        y -= 4
        drawWrapped(`Source: ${payload.document_url}`, false, 9)
        y -= 4
        for (const p of payload.key_points || []) {
          drawWrapped(`- ${p}`, false, 10)
        }
        y -= 6
        drawWrapped('Extracted Filing Text:', true, 11)
        const textLines = (payload.text || '').slice(0, 12000).split(/\s+/).join(' ')
        drawWrapped(textLines, false, 10)

        const bytes = await pdf.save()
        const normalized = new Uint8Array(bytes.byteLength)
        normalized.set(bytes)
        return new File([normalized], `${selectedCompany}_sec_extract.pdf`, {
          type: 'application/pdf',
        })
      }

      // If SEC URL is not configured (or company may be non-public), gather web context
      // and convert it to a PDF so it can flow through the same AI pipeline.
      if (!selectedStarred?.sec_url) {
        const webRes = await fetch(
          `${backendBase}/api/company/web-context?ticker=${encodeURIComponent(selectedCompany)}&company_name=${encodeURIComponent(typedCompanyName)}&limit=5`,
        )
        if (!webRes.ok) {
          throw new Error('Could not gather company information from web sources.')
        }
        const webData: {
          title?: string
          query?: string
          company_type?: string
          key_points?: string[]
          text: string
          sources?: string[]
        } = await webRes.json()
        const sourceUrl = (webData.sources && webData.sources[0]) || 'https://news.google.com/'
        const autoPdf = await createPdfFromExtract({
          document_url: sourceUrl,
          title:
            webData.title ||
            `${webData.query || selectedCompany || typedCompanyName} web research context (${webData.company_type || 'unknown'})`,
          key_points: webData.key_points || [],
          text: webData.text || '',
        })
        await apiUploadAndRun(autoPdf)
        return
      }

      // Preferred path: extract SEC filing content and generate PDF, then upload.
      const extractRes = await fetch(
        `${backendBase}/api/sec/extract?sec_url=${encodeURIComponent(selectedStarred.sec_url)}`,
      )
      if (extractRes.ok) {
        const extracted: { document_url: string; title?: string; key_points?: string[]; text: string } =
          await extractRes.json()
        const autoPdf = await createPdfFromExtract(extracted)
        await apiUploadAndRun(autoPdf)
        return
      }

      // Resolve SEC URL to one best 10-K / 10-Q / S-1 document (PDF/HTML/TXT).
      const resolveRes = await fetch(
        `${backendBase}/api/filings/from-sec-url?sec_url=${encodeURIComponent(selectedStarred.sec_url)}&limit=30`,
      )
      if (!resolveRes.ok) {
        // Fallback to ticker-based endpoint if URL resolution fails.
        const recentRes = await fetch(
          `${backendBase}/api/filings/recent?ticker=${encodeURIComponent(selectedCompany)}&limit=1`,
        )
        if (!recentRes.ok) {
          // If backend routes are unavailable (e.g. old server version), fall back
          // to downloading directly from the selected SEC URL.
          const sec = new URL(selectedStarred.sec_url)
          const docParam = sec.searchParams.get('doc')
          const directDocUrl =
            docParam && docParam.startsWith('/')
              ? `https://www.sec.gov${docParam}`
              : selectedStarred.sec_url

          const directRes = await fetch(directDocUrl)
          if (!directRes.ok) {
            throw new Error(`Failed to fetch filing from SEC URL (${directRes.status}).`)
          }
          const directBlob = await directRes.blob()
          const inferredName = (docParam?.split('/').pop() || `${selectedCompany}_filing.htm`).trim()
          const autoFile = new File([directBlob], inferredName, {
            type: directBlob.type || 'text/html',
          })
          await apiUploadAndRun(autoFile)
          return
        }
        const recentData: Array<{ url: string; primary_document: string }> = await recentRes.json()
        if (!recentData.length) {
          throw new Error('No recent filings found for this filer.')
        }
        const latest = recentData[0]
        const docRes = await fetch(latest.url)
        if (!docRes.ok) {
          throw new Error('Unable to download latest filing document from EDGAR.')
        }
        const blob = await docRes.blob()
        const filename = latest.primary_document || `${selectedCompany}_filing`
        const autoFile = new File([blob], filename, { type: blob.type || 'application/octet-stream' })
        await apiUploadAndRun(autoFile)
        return
      }
      const resolved = await resolveRes.json()
      const latest: { url: string; primary_document: string } = resolved.selected

      const docRes = await fetch(latest.url)
      if (!docRes.ok) {
        throw new Error('Unable to download latest filing document from EDGAR.')
      }
      const blob = await docRes.blob()
      const filename = latest.primary_document || `${selectedCompany}_filing`
      const autoFile = new File([blob], filename, { type: blob.type || 'application/octet-stream' })

      // Reuse the same upload + auto-run pipeline as manual uploads.
      await apiUploadAndRun(autoFile)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setAnalysisInProgress(false)
    }
  }



  function escapeHtml(s: string) {
    return s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function openPrintWindow(title: string, bodyHtml: string) {
    const w = window.open('', '_blank')
    if (!w) {
      setError('Popup blocked. Please allow popups for this site.')
      return
    }
    const doc = w.document
    doc.open()
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(
        title
      )}</title><style>
        body{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; padding: 28px; white-space: pre-wrap;}
        h1{font-size: 18px; margin: 0 0 14px;}
        .muted{opacity:0.7; font-size:12px; margin-top: 6px;}
        pre{white-space: pre-wrap; word-break: break-word; margin: 0;}
      </style></head><body>${bodyHtml}</body></html>`
    )
    doc.close()
    w.focus()
    w.print()
  }

  const REPORT_STYLES = `
    body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 32px 40px 48px; max-width: 900px; margin: 0 auto; color: #1a1a1a; line-height: 1.5; }
    .report-title { font-size: 22px; font-weight: 700; color: #102859; margin: 0 0 6px; }
    .report-meta { font-size: 12px; color: #666; margin-bottom: 24px; }
    h2 { font-size: 16px; font-weight: 700; color: #102859; margin: 24px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #e0f7fa; }
    .section { margin-bottom: 20px; }
    .section pre, .section p { white-space: pre-wrap; word-break: break-word; margin: 0; font-size: 13px; }
    .disclaimer { margin-top: 28px; padding: 12px; background: #e8f4f8; border-radius: 8px; font-size: 12px; color: #555; }
    @media print { body { padding: 20px; } h2 { page-break-after: avoid; } }
  `

  function buildFullReportHtml(): string {
    const sections: Array<{ title: string; content: string | null }> = [
      { title: '1. Key Drivers & KPIs', content: reports?.f1 ?? null },
      { title: '2. Macro & Market Context', content: reports?.f2 ?? null },
      { title: '3. Research Brief (Executive Summary)', content: reports?.f3 ?? null },
      { title: '4. Risks & Red Flags', content: reports?.f4 ?? null },
      { title: '5. Earnings Call & Management Commentary', content: reports?.f5 ?? null },
      { title: '6. Financial Modeling Overview', content: reports?.f6 ?? null },
    ]
    const parts: string[] = []
    for (const { title, content } of sections) {
      if (content && content.trim()) {
        parts.push(
          `<div class="section"><h2>${escapeHtml(title)}</h2><pre>${escapeHtml(content)}</pre></div>`
        )
      }
    }
    if (parts.length === 0) return ''
    const dateStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    return `
      <div class="report-title">Company Analysis Report</div>
      <div class="report-meta">Generated ${dateStr}${uploadId ? ` · Upload ID: ${escapeHtml(uploadId)}` : ''}</div>
      ${parts.join('')}
      <div class="disclaimer">For information purposes only; not investment advice.</div>
    `
  }

  function openReportPrintWindow(title: string, bodyHtml: string) {
    const w = window.open('', '_blank')
    if (!w) {
      setError('Popup blocked. Please allow popups for this site.')
      return
    }
    const doc = w.document
    doc.open()
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(
        title
      )}</title><style>${REPORT_STYLES}</style></head><body>${bodyHtml}</body></html>`
    )
    doc.close()
    w.focus()
    w.print()
  }

  function handleDownloadFullReport() {
    const html = buildFullReportHtml()
    if (!html) {
      setError('Run at least one analysis step (Upload & Auto-Run) to generate the full report.')
      return
    }
    openReportPrintWindow('Company Analysis Report', html)
  }

  function handleDownloadFeature3AsPdf() {
    if (!reports?.f3) return
    openPrintWindow(
      'Research Brief — Download',
      `<h1>Research Brief</h1><pre>${escapeHtml(reports.f3)}</pre>`,
    )
  }

  const downloadReady =
    (reports?.f1 ?? reports?.f2 ?? reports?.f3 ?? reports?.f4 ?? reports?.f5 ?? reports?.f6) != null

  async function validateAndSelectCompany(ticker: string, name: string) {
    setSearchError(null)
    try {
      // Try to fetch quotes for this ticker from Yahoo Finance via our backend
      const res = await fetch(`${backendBase}/api/benchmark?ticker=${encodeURIComponent(ticker)}&limit=1`)
      if (!res.ok) {
        throw new Error('Ticker not found')
      }
      const data: unknown = await res.json()
      const arr = Array.isArray(data) ? data : []
      // Check if the ticker was actually returned by Yahoo Finance
      const found = arr.find((item: any) => item.ticker?.toUpperCase() === ticker.toUpperCase())
      if (!found) {
        setSearchError(`"${ticker}" is not listed on any public exchange. Please enter a valid stock ticker symbol.`)
        return
      }
      // Valid company - navigate to it
      setSelectedCompanyDetail({ ticker, name })
      setSearchError(null)
    } catch (e) {
      setSearchError(`"${ticker}" is not listed on any public exchange. Please enter a valid stock ticker symbol.`)
    }
  }

  function handleSearch(query: string) {
    if (!query.trim()) return

    // If on home view, search for a ticker
    if (view === 'home' || view === 'aiReport' || view === 'aiAgent') {
      const upperQuery = query.toUpperCase().trim()
      // Check if it matches any company in the starred list
      const found = STARRED_FILERS.find(
        (c) => c.ticker === upperQuery || c.filer_name.toUpperCase().includes(upperQuery),
      )
      if (found) {
        validateAndSelectCompany(found.ticker, found.filer_name)
        return
      }
      // Otherwise treat as a ticker symbol - validate it
      if (/^[A-Z]{1,5}(-[A-Z]{3})?$/.test(upperQuery)) {
        validateAndSelectCompany(upperQuery, upperQuery)
        return
      }
      // Invalid ticker format
      setSearchError(`"${query}" is not a valid ticker symbol. Use format like AAPL, NVDA, or BTC-USD`)
    }

    // If on chat view, just log the search
    if (view === 'chat') {
      console.log('Chat search:', query)
      return
    }
  }

  function handleTerminalNav(id: TerminalNavId) {
    if (id === 'dashboard') {
      setView('home')
      setSelectedCompanyDetail(null)
      return
    }
    if (id === 'aiAgent') {
      setView('aiAgent')
      setSelectedCompanyDetail(null)
      return
    }
    if (id === 'portfolio') {
      setView('compare')
      return
    }
    if (id === 'reports') {
      setView('aiReport')
      return
    }
    if (id === 'chat') {
      setView('chat')
      setSelectedCompanyDetail(null)
      return
    }
    setView('research')
  }

  return (
    <div className={`AppRoot${token && view !== 'research' ? ' AppRoot--terminal' : ''}`}>
      {token && view === 'research' ? (
        <div className="TopBar">
          <div className="Brand">
            <div>
              <div className="Title">Financial Research -Tech Titans</div>
              <div className="SubTitle">Upload PDF → generate 6 reports + Q&amp;A</div>
            </div>
          </div>
          <nav className="TopBarNav" aria-label="Main">
            <button type="button" className="TopBarNavLink" onClick={() => setView('home')}>
              Dashboard
            </button>
            <button type="button" className="TopBarNavLink TopBarNavLinkActive" onClick={() => setView('research')}>
              Research
            </button>
            <button type="button" className="TopBarNavLink" onClick={() => setView('compare')}>
              Compare
            </button>
            <button type="button" className="TopBarNavLink" onClick={() => setView('aiReport')}>
              AI Report
            </button>
            <button type="button" className="TopBarNavLink" onClick={() => setView('chat')}>
              Chat with Analyst
            </button>
          </nav>
          <button className="Btn BtnGhost" disabled={busy} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      ) : null}

      {token && view !== 'research' ? (
        <TerminalShell
          activePage={
            view === 'compare'
              ? 'compare'
              : view === 'aiReport'
                ? 'aiReport'
                : view === 'chat'
                  ? 'chat'
                  : view === 'aiAgent'
                    ? 'aiAgent'
                    : 'home'
          }
          searchPlaceholder={
            view === 'chat'
              ? 'Search financial datasets or previous chats…'
              : view === 'aiReport'
                ? 'Search tickers, reports, or AI insights…'
                : (view === 'home' || view === 'aiAgent') && !selectedCompanyDetail
                  ? 'Search ticker, reports, or market data…'
                  : undefined
          }
          onNavigate={handleTerminalNav}
          onSignOut={handleSignOut}
          onSearch={handleSearch}
        >
          <div className="TerminalShell-page">
            {view === 'home' && !selectedCompanyDetail ? (
              <Dashboard
                backendBase={backendBase}
                onSelectCompany={(ticker, name) => setSelectedCompanyDetail({ ticker, name })}
                onOpenChat={() => setView('chat')}
                onNewAnalysis={() => setView('research')}
              />
            ) : null}
            {view === 'home' && selectedCompanyDetail ? (
              <CompanyDetail
                ticker={selectedCompanyDetail.ticker}
                companyName={selectedCompanyDetail.name}
                backendBase={backendBase}
                onBack={() => setSelectedCompanyDetail(null)}
              />
            ) : null}
            {view === 'compare' ? <CompareModule backendBase={backendBase} /> : null}
            {view === 'aiAgent' ? (
              <AiFinancialAgentView
                onGoUpload={() => setView('research')}
                onGoReports={() => setView('aiReport')}
                onGoChat={() => setView('chat')}
              />
            ) : null}
            {view === 'aiReport' ? (
              <AiReportView
                backendBase={backendBase}
                reports={reports}
                reportTicker={selectedCompany}
                reportCompanyName={
                  combinedFilerOptions.find((c) => c.ticker.toUpperCase() === selectedCompany.toUpperCase())
                    ?.filer_name ?? ''
                }
              />
            ) : null}
            {view === 'chat' && token ? (
              <ChatAnalystView
                backendBase={backendBase}
                token={token}
                uploadId={uploadId}
                primaryTicker={selectedCompany}
                companyName={
                  combinedFilerOptions.find((c) => c.ticker.toUpperCase() === selectedCompany.toUpperCase())
                    ?.filer_name ?? ''
                }
                useGeminiFallback={useGeminiFallback}
                onGoToUpload={() => setView('research')}
              />
            ) : null}
          </div>
        </TerminalShell>
      ) : null}

      {token && view === 'research' ? (
        <div className="Layout">
          <aside className="Sidebar">
            <div className="Card">
              <div className="CardTitle">Filer Name</div>
              <p className="Hint" style={{ marginBottom: 8 }}>
                SEC 10-K filers. Search or select a <strong>company name</strong> below for analyst context when asking
                questions.
              </p>
              {companiesLoading ? (
                <div className="Hint">Loading filer list…</div>
              ) : (
                <>
                  <label className="Label" htmlFor="research-filer-search" style={{ marginTop: 4, marginBottom: 6 }}>
                    Search company name
                  </label>
                  <div className="FilerSearchWrap">
                    <input
                      id="research-filer-search"
                      type="text"
                      className="Input"
                      autoComplete="off"
                      placeholder="Type company name or ticker (e.g. NVDA)"
                      title="Search company name or ticker"
                      aria-label="Search company name"
                      aria-autocomplete="list"
                      aria-expanded={showFilerSuggestions && filerSuggestions.length > 0}
                      aria-controls="research-filer-suggestions"
                      value={filerSearchText}
                      onChange={(e) => {
                        setFilerSearchText(e.target.value)
                        setSelectedCompany('')
                        setShowFilerSuggestions(true)
                      }}
                      onFocus={() => setShowFilerSuggestions(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowFilerSuggestions(false), 180)
                      }}
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Escape') {
                          setShowFilerSuggestions(false)
                          return
                        }
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        const raw = filerSearchText.trim()
                        if (!raw) return
                        const byTicker = combinedFilerOptions.find(
                          (c) => c.ticker.toUpperCase() === raw.toUpperCase(),
                        )
                        if (byTicker) {
                          pickFiler(byTicker)
                          return
                        }
                        const first = filerSuggestions[0]
                        if (first) pickFiler(first)
                      }}
                    />
                    {showFilerSuggestions && filerSuggestions.length > 0 ? (
                      <ul
                        id="research-filer-suggestions"
                        className="FilerSearchDropdown"
                        role="listbox"
                      >
                        {filerSuggestions.map((c) => (
                          <li key={c.ticker} role="option">
                            <button
                              type="button"
                              className="FilerSearchOption"
                              onMouseDown={(ev) => ev.preventDefault()}
                              onClick={() => pickFiler(c)}
                            >
                              <span className="FilerSearchOptionName">{c.filer_name}</span>
                              <span className="FilerSearchOptionTicker">{c.ticker}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  {selectedCompany ? (
                    <div className="Hint" style={{ marginTop: 6 }}>
                      Selected ticker: <strong>{selectedCompany}</strong>
                    </div>
                  ) : null}
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <input
                      className="Input"
                      type="text"
                      readOnly
                      placeholder="SEC EDGAR URL will appear here"
                      value={selectedStarred?.sec_url ?? ''}
                    />
                    <button
                      type="button"
                      className="Btn BtnSecondary"
                      disabled={!selectedStarred?.sec_url}
                      onClick={handleSecSearchAndRun}
                    >
                      Search
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="Card">
              <div className="CardTitle">Upload PDF</div>
              <div className="UploadRow">
                <input
                  id="file-input-manual"
                  className="Input FileInputHidden"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  className="Btn BtnSecondary UploadBtn"
                  onClick={() => document.getElementById('file-input-manual')?.click()}
                >
                  Manual upload Document
                </button>
                <div className="UploadFileName">
                  {file ? file.name : 'No document selected yet.'}
                </div>
              </div>

              <div className="AdvancedUploadOptions">
                <div className="Row">
                  <label className="Check">
                    <input
                      type="checkbox"
                      checked={auto1_3}
                      onChange={(e) => setAuto1_3(e.target.checked)}
                    />
                    <span>Auto 1/2/3</span>
                  </label>
                </div>
                <div className="Row">
                  <label className="Check">
                    <input
                      type="checkbox"
                      checked={auto4_6}
                      onChange={(e) => setAuto4_6(e.target.checked)}
                    />
                    <span>Auto 4/5/6</span>
                  </label>
                </div>
                <div className="Row">
                  <label className="Check">
                    <input
                      type="checkbox"
                      checked={useGeminiFallback}
                      onChange={(e) => setUseGeminiFallback(e.target.checked)}
                    />
                    <span>Use Claude cloud fallback</span>
                  </label>
                </div>
              </div>

              <button
                className="Btn"
                disabled={!file || busy}
                type="button"
                onClick={() => apiUploadAndRun()}
              >
                {busy ? 'Processing…' : 'Upload & Auto-Run'}
              </button>
              {uploadId ? <div className="Hint">upload_id: {uploadId}</div> : null}
            </div>

            <div className="Card">
              <div className="CardTitle">Analysis progress</div>
              <AnimatedList
                items={FEATURE_LABELS.map((f) => `${f.label} • ${featureStatus[f.id]}`)}
                onItemSelect={(item, index) => {
                  void index
                  console.log('Progress item:', item)
                }}
                showGradients
                enableArrowNavigation
                displayScrollbar
              />
            </div>


          </aside>

          <main className="Main">
            {error ? <div className="Alert AlertDanger">{error}</div> : null}



            <div className="FlowToggleRow">
              <button
                className="Btn BtnGhost"
                type="button"
                onClick={() => setShowBusinessWorkflow((v) => !v)}
              >
                {showBusinessWorkflow ? 'Hide' : 'Show'} Business Workflow
              </button>
            </div>

            {showBusinessWorkflow ? (
              <FlowChart title="Business Workflow (How the report is built)" chart={businessFlow} />
            ) : null}

            <div className="Grid">
              <FeatureCard title="KPIs/Trends" value={reports?.f1 ?? null} kind="info" />
              <FeatureCard title="Macro/Market Impact" value={reports?.f2 ?? null} kind="info" />
              <FeatureCard
                title="Financial Modeling Copilot"
                value={reports?.f6 ?? null}
                kind="warning"
              />
              <FeatureCard title="Risk & Red Flags" value={reports?.f4 ?? null} kind="danger" />
              <FeatureCard
                title="Earnings Call Intelligence"
                value={reports?.f5 ?? null}
                kind="info"
              />
              <FeatureCard title="Research Brief" value={reports?.f3 ?? null} kind="warning" />
            </div>

            {downloadReady ? (
              <section className="Card" style={{ marginTop: 14 }}>
                <div className="CardTitle">Download Options</div>
                <button
                  className="Btn BtnReportDownload"
                  style={{ width: 'auto' }}
                  onClick={handleDownloadFullReport}
                >
                  Download Full Analysis Report (PDF)
                </button>
                {reports?.f3 ? (
                  <button
                    className="Btn BtnSecondary"
                    style={{ width: 'auto', marginTop: 8 }}
                    onClick={handleDownloadFeature3AsPdf}
                  >
                    Download Research Brief only (PDF)
                  </button>
                ) : null}
                <div className="Hint" style={{ marginTop: 10, fontSize: 12 }}>
                  Your browser print dialog lets you choose “Save as PDF”.
                </div>
              </section>
            ) : null}
          </main>
        </div>
      ) : null}

      {!token && authScreen === 'landing' ? (
        <SovereignLanding onSignIn={() => setAuthScreen('signin')} onTryDemo={() => setAuthScreen('signin')} />
      ) : null}

      {!token && authScreen === 'signin' ? (
        <div className="AuthWrap AuthWrap--glass">
          <div className="GlassSignIn-bg" aria-hidden />
          <button
            type="button"
            className="GlassSignIn-back"
            onClick={() => {
              setError(null)
              setSignInNotice(null)
              setAuthScreen('landing')
            }}
          >
            ← Back to home
          </button>

          <div className="GlassSignIn-card">
            <div className="GlassSignIn-sheen" aria-hidden />
            <div className="GlassSignIn-avatar" aria-hidden>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden>
                <path
                  d="M12 11a3 3 0 100-6 3 3 0 000 6zM6 21v-1a5 5 0 0110 0v1"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <form
              className="GlassSignIn-form"
              onSubmit={(e) => {
                e.preventDefault()
                void apiLogin()
              }}
            >
              <div className="GlassSignIn-field">
                <span className="GlassSignIn-fieldIcon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                    <path
                      d="M12 11a3 3 0 100-6 3 3 0 000 6zM6 21v-1a5 5 0 0110 0v1"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  className="GlassSignIn-input"
                  type="text"
                  name="username"
                  autoComplete="username"
                  placeholder="Email ID"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setSignInNotice(null)
                  }}
                />
              </div>
              <div className="GlassSignIn-field">
                <span className="GlassSignIn-fieldIcon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                    <rect
                      x="5"
                      y="11"
                      width="14"
                      height="10"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    />
                    <path
                      d="M8 11V7a4 4 0 018 0v4"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  className="GlassSignIn-input"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setSignInNotice(null)
                  }}
                />
              </div>

              <div className="GlassSignIn-options">
                <label className="GlassSignIn-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="GlassSignIn-forgot"
                  onClick={() =>
                    setSignInNotice(
                      'Password reset is not available in this local demo. Use the default account or create a new one.',
                    )
                  }
                >
                  Forgot Password?
                </button>
              </div>

              {signInNotice ? <p className="GlassSignIn-notice">{signInNotice}</p> : null}
              {error ? <div className="GlassSignIn-alert">{error}</div> : null}

              <button type="submit" className="GlassSignIn-login" disabled={busy}>
                {busy ? 'Signing in…' : 'LOGIN'}
              </button>
            </form>

            <button
              type="button"
              className="GlassSignIn-secondary"
              onClick={() => {
                setError(null)
                setSignInNotice(null)
                setConfirmPassword('')
                setAuthScreen('signup')
              }}
            >
              Create new account
            </button>
            <p className="GlassSignIn-hint">
              Demo login: <strong>tecttitans</strong> / <strong>Tt2026</strong>
            </p>
          </div>
        </div>
      ) : null}

      {!token && authScreen === 'signup' ? (
        <div className="AuthWrap AuthWrap--sa">
          <FloatingLines
            linesGradient={['#102859', '#cbf6ed', '#f2faf6', '#d8f8f0']}
            enabledWaves={['top', 'middle', 'bottom']}
            lineCount={[6, 6, 6]}
            lineDistance={[5, 5, 5]}
            animationSpeed={1}
            interactive={true}
            parallax={true}
            parallaxStrength={0.2}
            mixBlendMode="screen"
            bendRadius={5.0}
            bendStrength={-0.5}
          />

          <section className="LandingIntro" aria-label="Intro">
            <div className="LandingHeading">
              Financial Research — <span className="accent">Tech Titans</span>
            </div>
            <div className="LandingSub">Create an account to access Research, AI reports, and analyst chat.</div>
          </section>

          <div className="AuthCard">
            <button
              type="button"
              className="Btn BtnGhost"
              style={{ marginBottom: 12, width: '100%' }}
              onClick={() => {
                setError(null)
                setAuthScreen('signin')
              }}
            >
              ← Back to sign in
            </button>
            <div className="AuthTitle">Sign Up</div>
            <div className="AuthSub">Create local account</div>

            <label className="Label">
              Username
              <input className="Input" value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label className="Label">
              Password
              <input
                className="Input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="Label">
              Confirm password
              <input
                className="Input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>

            {error ? <div className="Alert AlertDanger">{error}</div> : null}

            <button className="Btn" disabled={busy} onClick={apiSignup}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </div>
        </div>
      ) : null}

      {analysisInProgress && token ? (
        <div className="AnalysisOverlay" role="dialog" aria-modal="true" aria-label="Analysis progress">
          <div className="AnalysisOverlayCard">
            <div className="AnalysisWaveWrap" aria-hidden>
              <svg
                className="AnalysisWaveSvg"
                viewBox="0 0 400 100"
                preserveAspectRatio="xMidYMid meet"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="analysisWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
                    <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.9" />
                  </linearGradient>
                  <filter id="analysisWaveGlow" x="-20%" y="-50%" width="140%" height="200%">
                    <feGaussianBlur stdDeviation="2.2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <g className="AnalysisWaveGroup AnalysisWaveGroup--back" filter="url(#analysisWaveGlow)">
                  <path
                    className="AnalysisWavePath AnalysisWavePath--1"
                    d="M0,52 C40,28 80,72 120,52 S200,32 240,52 S320,72 360,52 S400,38 400,52"
                    fill="none"
                    stroke="url(#analysisWaveGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    opacity="0.35"
                  />
                  <path
                    className="AnalysisWavePath AnalysisWavePath--2"
                    d="M0,50 C50,22 100,78 150,50 S250,22 300,50 S380,78 400,50"
                    fill="none"
                    stroke="url(#analysisWaveGrad)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.55"
                  />
                </g>
                <g className="AnalysisWaveGroup AnalysisWaveGroup--front" filter="url(#analysisWaveGlow)">
                  <path
                    className="AnalysisWavePath AnalysisWavePath--3"
                    d="M0,48 C60,20 120,76 180,48 S300,20 360,48 S400,62 400,48"
                    fill="none"
                    stroke="url(#analysisWaveGrad)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                  <path
                    className="AnalysisWavePath AnalysisWavePath--4"
                    d="M0,52 Q100,30 200,52 T400,52"
                    fill="none"
                    stroke="url(#analysisWaveGrad)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    opacity="0.65"
                  />
                </g>
                <g className="AnalysisWaveParticles">
                  <circle className="AnalysisParticle AnalysisParticle--a" cx="120" cy="42" r="2" fill="#67e8f9" />
                  <circle className="AnalysisParticle AnalysisParticle--b" cx="200" cy="58" r="1.5" fill="#7dd3fc" />
                  <circle className="AnalysisParticle AnalysisParticle--c" cx="280" cy="38" r="2.2" fill="#38bdf8" />
                  <circle className="AnalysisParticle AnalysisParticle--d" cx="320" cy="52" r="1.2" fill="#60a5fa" />
                </g>
              </svg>
            </div>
            <div className="AnalysisOverlayTitle">Analysis in progress...</div>
            <div className="AnalysisOverlaySub">AI is processing the uploaded document in stages.</div>
            <div className="AnalysisStageList">
              {FEATURE_LABELS.map((f) => (
                <div key={f.id} className={`AnalysisStageRow AnalysisStage-${featureStatus[f.id]}`}>
                  <span className="AnalysisStageDot" />
                  <span className="AnalysisStageLabel">{f.label}</span>
                  <span className="AnalysisStageStatus">{featureStatus[f.id]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {searchError && (
        <div className="SearchErrorOverlay" onClick={() => setSearchError(null)}>
          <div className="SearchErrorModal" onClick={(e) => e.stopPropagation()}>
            <div className="SearchErrorHeader">
              <h2 className="SearchErrorTitle">⚠️ Company Not Listed</h2>
              <button
                type="button"
                className="SearchErrorClose"
                onClick={() => setSearchError(null)}
                aria-label="Close error"
              >
                ✕
              </button>
            </div>
            <div className="SearchErrorContent">
              <p className="SearchErrorMessage">{searchError}</p>
              <p className="SearchErrorHint">Try searching for a company like:</p>
              <ul className="SearchErrorExamples">
                <li>AAPL (Apple)</li>
                <li>NVDA (NVIDIA)</li>
                <li>MSFT (Microsoft)</li>
                <li>AMZN (Amazon)</li>
                <li>GOOGL (Alphabet/Google)</li>
              </ul>
            </div>
            <div className="SearchErrorFooter">
              <button
                type="button"
                className="SearchErrorBtn"
                onClick={() => setSearchError(null)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

