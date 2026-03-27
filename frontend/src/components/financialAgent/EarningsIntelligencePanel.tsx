import { motion } from 'framer-motion'
import { Mic2 } from 'lucide-react'
import type { EarningsIntelligence } from '../../types'

type Props = {
  data: EarningsIntelligence | null
  loading: boolean
}

export default function EarningsIntelligencePanel({ data, loading }: Props) {
  return (
    <motion.section
      id="fa-earnings"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="scroll-mt-24 rounded-2xl border border-emerald-200/50 bg-white/75 p-5 shadow-md backdrop-blur-md"
    >
      <div className="mb-3 flex items-center gap-2">
        <Mic2 className="h-5 w-5 text-emerald-600" />
        <h2 className="text-sm font-semibold text-slate-900">Earnings-style intelligence</h2>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Synthesizing…</p>
      ) : !data ? (
        <p className="text-sm text-slate-500">No data yet.</p>
      ) : (
        <div className="space-y-3 text-sm">
          <p>
            <span className="font-medium text-slate-700">Sentiment: </span>
            <span className="capitalize text-emerald-800">{data.sentiment}</span>
          </p>
          <p className="text-slate-600">{data.guidanceSummary}</p>
          {data.themes.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Themes</p>
              <ul className="list-inside list-disc text-slate-600">
                {data.themes.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {data.signals.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Signals</p>
              <ul className="list-inside list-disc text-slate-600">
                {data.signals.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.section>
  )
}
