import type { ReactNode } from 'react'
import './terminal.css'

export type TerminalNavId = 'dashboard' | 'upload' | 'reports' | 'portfolio' | 'chat'

type ActivePage = 'home' | 'compare' | 'aiReport' | 'chat'

type Props = {
  children: ReactNode
  activePage: ActivePage
  onNavigate: (id: TerminalNavId) => void
  onSignOut: () => void
  searchPlaceholder?: string
}

function NavIcon({ name }: { name: 'grid' | 'upload' | 'report' | 'portfolio' | 'chat' | 'settings' }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }
  switch (name) {
    case 'grid':
      return (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
        </svg>
      )
    case 'upload':
      return (
        <svg {...common} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v10M8 9l4-4 4 4" />
          <path d="M5 19h14" />
        </svg>
      )
    case 'report':
      return (
        <svg {...common}>
          <path d="M7 3h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M14 3v5h5" />
        </svg>
      )
    case 'portfolio':
      return (
        <svg {...common}>
          <path d="M4 20V10M10 20V4M16 20v-6M22 20V8" strokeLinecap="round" />
        </svg>
      )
    case 'chat':
      return (
        <svg {...common}>
          <path d="M4 6h16v10H9l-4 4v-4H4V6z" strokeLinejoin="round" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      )
    default:
      return null
  }
}

export default function TerminalShell({
  children,
  activePage,
  onNavigate,
  onSignOut,
  searchPlaceholder = 'Search tickers, reports, or market data…',
}: Props) {
  const dashActive = activePage === 'home'
  const portfolioActive = activePage === 'compare'
  const reportsActive = activePage === 'aiReport'
  const chatActive = activePage === 'chat'

  return (
    <div className="TerminalShell">
      <aside className="TerminalShell-sidebar" aria-label="Primary">
        <div className="TerminalShell-brand">
          <div className="TerminalShell-logo">SA</div>
          <div>
            <div className="TerminalShell-title">Tech Titans analyst</div>
            <div className="TerminalShell-version">TERMINAL V1.0.2</div>
          </div>
        </div>

        <nav className="TerminalShell-nav" aria-label="Main navigation">
          <button
            type="button"
            className={`TerminalShell-navItem ${dashActive ? 'TerminalShell-navItem--active' : ''}`}
            onClick={() => onNavigate('dashboard')}
          >
            <span className="TerminalShell-navIcon" aria-hidden>
              <NavIcon name="grid" />
            </span>
            Dashboard
          </button>
          <button
            type="button"
            className="TerminalShell-navItem"
            onClick={() => onNavigate('upload')}
          >
            <span className="TerminalShell-navIcon" aria-hidden>
              <NavIcon name="upload" />
            </span>
            Upload Document
          </button>
          <button
            type="button"
            className={`TerminalShell-navItem ${reportsActive ? 'TerminalShell-navItem--active' : ''}`}
            onClick={() => onNavigate('reports')}
          >
            <span className="TerminalShell-navIcon" aria-hidden>
              <NavIcon name="report" />
            </span>
            AI Reports
          </button>
          <button
            type="button"
            className={`TerminalShell-navItem ${portfolioActive ? 'TerminalShell-navItem--active' : ''}`}
            onClick={() => onNavigate('portfolio')}
          >
            <span className="TerminalShell-navIcon" aria-hidden>
              <NavIcon name="portfolio" />
            </span>
            Portfolio Insights
          </button>
          <button
            type="button"
            className={`TerminalShell-navItem ${chatActive ? 'TerminalShell-navItem--active' : ''}`}
            onClick={() => onNavigate('chat')}
          >
            <span className="TerminalShell-navIcon" aria-hidden>
              <NavIcon name="chat" />
            </span>
            Chat with Analyst
          </button>
        </nav>

        <div className="TerminalShell-sidebarFooter">
          <button type="button" className="TerminalShell-navItem TerminalShell-navItem--ghost" disabled>
            <span className="TerminalShell-navIcon" aria-hidden>
              <NavIcon name="settings" />
            </span>
            Settings
          </button>
          <div className="TerminalShell-user">
            <div className="TerminalShell-userAvatar">TT</div>
            <div>
              <div className="TerminalShell-userName">Tech Titans</div>
              <div className="TerminalShell-userRole">Senior Analyst</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="TerminalShell-main">
        <header className="TerminalShell-header">
          <div className="TerminalShell-searchWrap">
            <span className="TerminalShell-searchIcon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3-3" strokeLinecap="round" />
              </svg>
            </span>
            <input className="TerminalShell-search" type="search" placeholder={searchPlaceholder} readOnly />
          </div>
          <div className="TerminalShell-headerRight">
            <span className="TerminalShell-iconBtn" aria-hidden title="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </span>
            <span className="TerminalShell-iconBtn" aria-hidden title="Layout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
              </svg>
            </span>
            <span className="TerminalShell-iconBtn" aria-hidden title="Account">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 00-16 0" />
              </svg>
            </span>
            <span className="TerminalShell-marketPill" title="Market status">
              <span className="TerminalShell-marketDot" /> MARKET OPEN
            </span>
            <button type="button" className="TerminalShell-signOut" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </header>

        <div className="TerminalShell-body">{children}</div>

        <footer className="TerminalShell-statusBar">
          <span>All engines Online · Latency: 42ms</span>
          <span>Encryption: AES-256-GCM · Storage: 32% free</span>
        </footer>
      </div>
    </div>
  )
}
