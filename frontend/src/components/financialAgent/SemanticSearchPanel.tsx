import { motion } from 'framer-motion'
import { MessageCircleQuestion } from 'lucide-react'
import { useState } from 'react'
import type { SemanticSearchResult } from '../../types'

type Props = {
  disabled: boolean
  loading: boolean
  onAsk: (q: string) => void
  result: SemanticSearchResult | null
}

export default function SemanticSearchPanel({ disabled, loading, onAsk, result }: Props) {
  const [q, setQ] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const t = q.trim()
    if (t) onAsk(t)
  }

  return (
    <motion.section
      id="fa-search"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white/75 p-5 shadow-md backdrop-blur-md"
    >
      <div className="mb-3 flex items-center gap-2">
        <MessageCircleQuestion className="h-5 w-5 text-slate-700" />
        <h2 className="text-sm font-semibold text-slate-900">Natural-language Q&amp;A</h2>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-2"
          placeholder="Ask about the company…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || loading || !q.trim()}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {loading ? '…' : 'Ask'}
        </button>
      </form>
      {result && (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
          <p className="text-slate-800">{result.answer}</p>
          {result.citations.length > 0 && (
            <ul className="mt-2 text-xs text-slate-500">
              {result.citations.map((c) => (
                <li key={c}>• {c}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-400">Confidence: {(result.confidence * 100).toFixed(0)}%</p>
        </div>
      )}
    </motion.section>
  )
}
