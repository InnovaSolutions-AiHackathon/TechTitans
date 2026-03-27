import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

type Props = {
  analysis: string | null
  loading: boolean
}

export default function AIAnalysisPanel({ analysis, loading }: Props) {
  return (
    <motion.section
      id="fa-ai"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="scroll-mt-24 rounded-2xl border border-emerald-200/50 bg-white/75 p-5 shadow-md backdrop-blur-md"
    >
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-emerald-600" />
        <h2 className="text-sm font-semibold text-slate-900">AI narrative analysis</h2>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Generating analysis…</p>
      ) : analysis ? (
        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">{analysis}</div>
      ) : (
        <p className="text-sm text-slate-500">Load a symbol to generate analysis.</p>
      )}
    </motion.section>
  )
}
