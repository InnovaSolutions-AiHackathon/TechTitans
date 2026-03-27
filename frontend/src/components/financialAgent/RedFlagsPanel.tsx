import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import type { RedFlagItem } from '../../types'

type Props = {
  items: RedFlagItem[]
  loading: boolean
}

function sevClass(s: RedFlagItem['severity']) {
  if (s === 'high') return 'border-rose-200 bg-rose-50/90 text-rose-900'
  if (s === 'low') return 'border-amber-200 bg-amber-50/90 text-amber-900'
  return 'border-orange-200 bg-orange-50/90 text-orange-900'
}

export default function RedFlagsPanel({ items, loading }: Props) {
  return (
    <motion.section
      id="fa-risk"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="scroll-mt-24 rounded-2xl border border-rose-200/40 bg-white/75 p-5 shadow-md backdrop-blur-md"
    >
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-rose-600" />
        <h2 className="text-sm font-semibold text-slate-900">Red flags</h2>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Scanning risks…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">No structured flags returned (or none identified).</p>
      ) : (
        <ul className="space-y-2">
          {items.map((r, i) => (
            <li
              key={`${r.title}-${i}`}
              className={`rounded-xl border px-3 py-2 text-sm ${sevClass(r.severity)}`}
            >
              <span className="font-semibold">{r.title}</span>
              <span className="mt-0.5 block text-xs opacity-90">{r.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  )
}
