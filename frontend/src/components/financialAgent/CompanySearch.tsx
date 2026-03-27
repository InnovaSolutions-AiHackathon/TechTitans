import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useState } from 'react'

type Props = {
  loading: boolean
  onSearch: (symbol: string) => void
}

export default function CompanySearch({ loading, onSearch }: Props) {
  const [value, setValue] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const s = value.trim().toUpperCase()
    if (s) onSearch(s)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-200/50 bg-white/75 p-5 shadow-lg shadow-emerald-900/5 backdrop-blur-md"
    >
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Company symbol</h2>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none ring-emerald-500/30 placeholder:text-slate-400 focus:ring-2"
            placeholder="e.g. AAPL, MSFT, NVDA"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={12}
            aria-label="Ticker symbol"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Research'}
        </button>
      </form>
      <p className="mt-2 text-xs text-slate-500">
        Live quote via Yahoo (proxied). AI panels use Claude — set <code className="rounded bg-slate-100 px-1">VITE_ANTHROPIC_API_KEY</code> in{' '}
        <code className="rounded bg-slate-100 px-1">.env</code>.
      </p>
    </motion.section>
  )
}
