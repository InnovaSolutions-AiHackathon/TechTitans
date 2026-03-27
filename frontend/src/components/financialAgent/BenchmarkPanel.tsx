import { motion } from 'framer-motion'
import { GitCompare } from 'lucide-react'
import type { PeerBenchmarkRow } from '../../types'

type Props = {
  peers: PeerBenchmarkRow[]
  loading: boolean
}

export default function BenchmarkPanel({ peers, loading }: Props) {
  return (
    <motion.section
      id="fa-bench"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="scroll-mt-24 rounded-2xl border border-emerald-200/50 bg-white/75 p-5 shadow-md backdrop-blur-md"
    >
      <div className="mb-3 flex items-center gap-2">
        <GitCompare className="h-5 w-5 text-emerald-600" />
        <h2 className="text-sm font-semibold text-slate-900">Peer benchmarking</h2>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading peers…</p>
      ) : peers.length === 0 ? (
        <p className="text-sm text-slate-500">No peer rows returned.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="pb-2 pr-4">Ticker</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Metric</th>
                <th className="pb-2">vs subject</th>
              </tr>
            </thead>
            <tbody>
              {peers.map((p) => (
                <tr key={p.ticker} className="border-b border-slate-50">
                  <td className="py-2 font-mono font-medium text-emerald-800">{p.ticker}</td>
                  <td className="py-2 text-slate-700">{p.name}</td>
                  <td className="py-2 text-slate-600">{p.metric}</td>
                  <td className="py-2 text-slate-600">{p.vsSubject}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  )
}
