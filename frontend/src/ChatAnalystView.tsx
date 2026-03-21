import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './ChatAnalystView.css'
import { readIntelDocs } from './intelDocsStorage'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  elapsedMs?: number
}

type Props = {
  backendBase: string
  token: string
  uploadId: string | null
  primaryTicker: string
  companyName?: string
  useGeminiFallback: boolean
  onGoToUpload: () => void
}

const QUICK_PROMPTS: Array<{ label: string; q: string }> = [
  { label: 'Analyze 10-K', q: 'Summarize material risk factors and MD&A themes from the uploaded filing excerpt.' },
  { label: 'Compare multiples', q: 'Compare valuation and profitability metrics discussed in the document vs typical sector peers (qualitative).' },
  { label: 'Risk sweep', q: 'Risk factor sweep: revenue recognition, cybersecurity, supply chain, and regulatory exposure cited in the text.' },
  { label: 'Growth drivers', q: 'What revenue and margin drivers does management emphasize? Quote supporting lines.' },
]

export default function ChatAnalystView({
  backendBase,
  token,
  uploadId,
  primaryTicker,
  companyName,
  useGeminiFallback,
  onGoToUpload,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const intelDocs = useMemo(() => readIntelDocs().slice(0, 6), [uploadId])

  const contextLabel = useMemo(() => {
    const t = primaryTicker?.trim()
    if (!t) return 'No filer selected — choose a company in Research.'
    const n = companyName?.trim()
    return n ? `${n} (${t})` : t
  }, [primaryTicker, companyName])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  const askAssistant = useCallback(
    async (question: string) => {
      const q = question.trim()
      if (!q || !token) return
      if (!uploadId) {
        setError('Upload a PDF first in Research so the analyst can answer from your document.')
        return
      }
      setError(null)
      setBusy(true)
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: q,
      }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      const t0 = performance.now()
      try {
        const res = await fetch(`${backendBase.replace(/\/$/, '')}/api/qa`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            upload_id: uploadId,
            question: q,
            use_gemini_fallback: useGeminiFallback,
            ...(primaryTicker.trim() ? { primary_ticker: primaryTicker.trim() } : {}),
          }),
        })
        if (!res.ok) {
          const errText = await res.text()
          throw new Error(errText || res.statusText)
        }
        const data = (await res.json()) as { answer?: string | null }
        const ans = (data.answer ?? '').trim() || 'No answer returned.'
        const elapsedMs = Math.round(performance.now() - t0)
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: ans,
            elapsedMs,
          },
        ])
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: `**Error:** ${msg}`.replace(/\*\*/g, ''),
          },
        ])
      } finally {
        setBusy(false)
      }
    },
    [backendBase, token, uploadId, primaryTicker, useGeminiFallback],
  )

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void askAssistant(input)
  }

  function seedStarter() {
    setInput('Compare key KPIs and growth drivers mentioned in the uploaded filing vs the prior year narrative.')
  }

  const chartHeights = useMemo(() => [38, 55, 42, 68, 50, 48, 72, 45], [])

  return (
    <div className="ChatAnalyst">
      <div className="ChatAnalyst-main">
        <div className="ChatAnalyst-mainHeader">
          <h1 className="ChatAnalyst-mainTitle">Chat with Analyst</h1>
          <p className="ChatAnalyst-mainMeta">
            Context: <strong>{contextLabel}</strong>
            {uploadId ? ` · Document session active` : ' · No document yet'}
          </p>
        </div>

        {!uploadId ? (
          <div className="ChatAnalyst-banner" role="status">
            Upload a PDF or SEC HTML in <button type="button" onClick={onGoToUpload}>Research → Upload</button> so
            answers use your filing text. Q&amp;A reads the same extracted text as the six feature panels.
          </div>
        ) : null}

        <div className="ChatAnalyst-messages">
          {messages.length === 0 && !busy ? (
            <div className="ChatAnalyst-empty">
              <p>
                Ask a follow-up on your uploaded document — e.g. revenue growth, risks, or guidance themes.
              </p>
              <button type="button" onClick={seedStarter}>
                Try a starter question
              </button>
            </div>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`ChatAnalyst-msg ChatAnalyst-msg--${m.role}`}
            >
              <div className="ChatAnalyst-md">{m.text}</div>
              {m.role === 'assistant' && m.elapsedMs != null ? (
                <div className="ChatAnalyst-msgFoot">
                  <span>Analysis: {(m.elapsedMs / 1000).toFixed(1)}s</span>
                  <span>Sources: uploaded document + ticker context</span>
                </div>
              ) : null}
            </div>
          ))}
          {busy ? (
            <div className="ChatAnalyst-msg ChatAnalyst-msg--assistant">
              <div className="ChatAnalyst-md">Thinking…</div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form className="ChatAnalyst-composer" onSubmit={onSubmit}>
          <div className="ChatAnalyst-quick">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="ChatAnalyst-chip"
                title={p.q}
                onClick={() => setInput(p.q)}
                disabled={busy}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="ChatAnalyst-inputRow">
            <textarea
              className="ChatAnalyst-input"
              rows={2}
              placeholder="Ask follow-up question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button type="submit" className="ChatAnalyst-send" disabled={busy || !input.trim()}>
              Send
            </button>
          </div>
          {error ? (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#b91c1c' }}>{error}</p>
          ) : null}
        </form>
      </div>

      <aside className="ChatAnalyst-side">
        <h2 className="ChatAnalyst-sideTitle">Source documents</h2>
        {uploadId ? (
          <div className="ChatAnalyst-doc">
            <div className="ChatAnalyst-docName">Current session upload</div>
            <div className="ChatAnalyst-docMeta">
              Upload ID: {uploadId.slice(0, 8)}… · Ticker {primaryTicker || '—'}
            </div>
          </div>
        ) : (
          <p className="ChatAnalyst-sideEmpty">No active upload. Go to Research to upload a filing.</p>
        )}
        {intelDocs.length > 0 ? (
          <>
            <h2 className="ChatAnalyst-sideTitle" style={{ marginTop: 16 }}>
              Recent intel uploads
            </h2>
            {intelDocs.map((d) => (
              <div key={d.file + d.processedAt} className="ChatAnalyst-doc">
                <div className="ChatAnalyst-docName">{d.file}</div>
                <div className="ChatAnalyst-docMeta">
                  {d.type} · {new Date(d.processedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </>
        ) : null}

        <div className="ChatAnalyst-miniChart" aria-hidden title="Activity sparkline (illustrative)">
          {chartHeights.map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      </aside>
    </div>
  )
}
