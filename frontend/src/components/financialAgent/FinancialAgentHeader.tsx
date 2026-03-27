import { Activity, BarChart3, LineChart, MessageSquareText, Search, ShieldAlert } from 'lucide-react'

type Props = {
  onJump: (id: string) => void
}

const links: { id: string; label: string; Icon: typeof Activity }[] = [
  { id: 'fa-overview', label: 'Overview', Icon: LineChart },
  { id: 'fa-ai', label: 'AI', Icon: Activity },
  { id: 'fa-risk', label: 'Risk', Icon: ShieldAlert },
  { id: 'fa-earnings', label: 'Earnings', Icon: BarChart3 },
  { id: 'fa-search', label: 'Q&A', Icon: Search },
  { id: 'fa-bench', label: 'Peers', Icon: BarChart3 },
  { id: 'fa-model', label: 'Model', Icon: MessageSquareText },
]

export default function FinancialAgentHeader({ onJump }: Props) {
  return (
    <header className="sticky top-0 z-20 -mx-1 mb-6 rounded-2xl border border-emerald-200/40 bg-emerald-50/80 px-4 py-3 shadow-sm backdrop-blur-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Terminal</p>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">AI Financial Agent</h1>
        </div>
        <nav className="flex flex-wrap gap-1.5" aria-label="Section shortcuts">
          {links.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onJump(id)}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200/60 bg-white/70 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-white"
            >
              <Icon className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
