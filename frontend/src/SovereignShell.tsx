import type { ReactNode } from 'react'

export type AppView = 'home' | 'research' | 'compare'

type Props = {
  children: ReactNode
  username: string
  view: AppView
  onView: (v: AppView) => void
  onSignOut: () => void
  busy?: boolean
}

function NavIcon({ name }: { name: 'dashboard' | 'research' | 'compare' }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }
  if (name === 'dashboard') {
    return (
      <svg {...common} aria-hidden>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1.5" />
        <rect x="3" y="15" width="7" height="6" rx="1.5" />
      </svg>
    )
  }
  if (name === 'research') {
    return (
      <svg {...common} aria-hidden>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8M8 11h6" />
      </svg>
    )
  }
  return (
    <svg {...common} aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" />
      <circle cx="8" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function SovereignShell({ children, username, view, onView, onSignOut, busy }: Props) {
  const initials = (username || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="SovereignApp">
      <aside className="SovereignSidebar" aria-label="Primary navigation">
        <div className="SovereignBrand">
          <div className="SovereignBrandTitle">Tech Titans analyst</div>
          <div className="SovereignBrandSub">TERMINAL · Financial Research — Tech Titans</div>
        </div>

        <nav className="SovereignNav">
          <button
            type="button"
            className={`SovereignNavItem ${view === 'home' ? 'SovereignNavItemActive' : ''}`}
            onClick={() => onView('home')}
          >
            <span className="SovereignNavIcon">
              <NavIcon name="dashboard" />
            </span>
            Dashboard
          </button>
          <button
            type="button"
            className={`SovereignNavItem ${view === 'research' ? 'SovereignNavItemActive' : ''}`}
            onClick={() => onView('research')}
          >
            <span className="SovereignNavIcon">
              <NavIcon name="research" />
            </span>
            Research
          </button>
          <button
            type="button"
            className={`SovereignNavItem ${view === 'compare' ? 'SovereignNavItemActive' : ''}`}
            onClick={() => onView('compare')}
          >
            <span className="SovereignNavIcon">
              <NavIcon name="compare" />
            </span>
            Compare
          </button>
        </nav>

        <div className="SovereignSidebarFooter">
          <button type="button" className="SovereignNavItem SovereignNavItemMuted" disabled>
            <span className="SovereignNavIcon" aria-hidden>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </span>
            Settings
          </button>
          <div className="SovereignUserCard">
            <div className="SovereignUserAvatar" aria-hidden>
              {initials}
            </div>
            <div>
              <div className="SovereignUserName">{username || 'Analyst'}</div>
              <div className="SovereignUserRole">Research workspace</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="SovereignWorkspace">
        <header className="SovereignHeader">
          <div className="SovereignSearchWrap">
            <span className="SovereignSearchIcon" aria-hidden>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3-3" />
              </svg>
            </span>
            <input
              type="search"
              className="SovereignSearch"
              placeholder="Search filings, tickers, or documents…"
              readOnly
              aria-label="Global search (coming soon)"
            />
          </div>
          <div className="SovereignHeaderActions">
            <span className="SovereignMarketPill" role="status">
              <span className="SovereignDot" /> MARKET OPEN
            </span>
            <button type="button" className="SovereignSignOut" disabled={busy} onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </header>

        <div className="SovereignContent">{children}</div>

        <footer className="SovereignStatusBar" aria-hidden>
          <span>
            <span className="SovereignStatusDot" /> AI Engine online
          </span>
          <span>Latency: —</span>
          <span className="SovereignStatusSpacer" />
          <span>Encryption: AES-256-GCM</span>
        </footer>
      </div>
    </div>
  )
}
