import { motion } from 'framer-motion'
import { Calculator } from 'lucide-react'
import { useState } from 'react'

type Props = {
  disabled: boolean
  loading: boolean
  onSubmit: (prompt: string) => void
  output: string | null
}

export default function ModelingCopilot({ disabled, loading, onSubmit, output }: Props) {
  const [text, setText] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const t = text.trim()
    if (t) onSubmit(t)
  }

  return (
    <motion.section
      id="fa-model"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white/75 p-5 shadow-md backdrop-blur-md"
    >
      <div className="mb-3 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-slate-700" />
        <h2 className="text-sm font-semibold text-slate-900">Modeling copilot</h2>
      </div>
      <form onSubmit={submit} className="space-y-2">
        <textarea
          className="min-h-[88px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-2"
          placeholder="e.g. Build a 3-statement bridge from revenue growth and margin assumptions…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || loading || !text.trim()}
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {loading ? 'Thinking…' : 'Get guidance'}
        </button>
      </form>
      {output && (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/90 p-3 text-sm text-slate-800 whitespace-pre-wrap">
          {output}
        </div>
      )}
    </motion.section>
  )
}
