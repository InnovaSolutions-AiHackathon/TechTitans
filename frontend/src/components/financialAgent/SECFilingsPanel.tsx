import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import type { SECFiling } from '../../types'

type Props = {
  filings: SECFiling[]
}

export default function SECFilingsPanel({ filings }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-200/50 bg-white/75 p-5 shadow-md backdrop-blur-md"
    >
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-emerald-600" />
        <h2 className="text-sm font-semibold text-slate-900">SEC filings (AI-sourced)</h2>
      </div>
      {filings.length === 0 ? (
        <p className="text-sm text-slate-500">No filings listed. Claude may omit when data is uncertain.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filings.map((f) => (
            <li key={f.url} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="font-medium text-slate-800">{f.form}</span>
                <span className="ml-2 text-xs text-slate-500">{f.filedAt}</span>
                <p className="text-xs text-slate-600">{f.description}</p>
              </div>
              <a
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs font-medium text-emerald-700 hover:underline"
              >
                Open →
              </a>
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  )
}
