import type { ReactNode } from 'react'
import { useState, useRef, useEffect } from 'react'
import './terminal.css'

export type TerminalNavId = 'dashboard' | 'aiAgent' | 'upload' | 'reports' | 'portfolio' | 'chat'

type ActivePage = 'home' | 'aiAgent' | 'compare' | 'aiReport' | 'chat'

type Props = {
  children: ReactNode
  activePage: ActivePage
  onNavigate: (id: TerminalNavId) => void
  onSignOut: () => void
  searchPlaceholder?: string
  onSearch?: (query: string) => void
}

function NavIcon({
  name,
}: {
  name: 'grid' | 'agent' | 'upload' | 'report' | 'portfolio' | 'chat' | 'settings'
}) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }
  switch (name) {
    case 'grid':
      return (
        <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
        </svg>
      )
    case 'agent':
      return (
        <svg {...common} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v2M12 18v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M4 12h2M18 12h2M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
          <circle cx="12" cy="12" r="3.5" />
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
  onSearch,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showLayout, setShowLayout] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const layoutRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
      if (layoutRef.current && !layoutRef.current.contains(e.target as Node)) {
        setShowLayout(false)
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setShowAccount(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery) {
      onSearch?.(searchQuery)
    }
  }

  const dashActive = activePage === 'home'
  const aiAgentActive = activePage === 'aiAgent'
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
            className={`TerminalShell-navItem ${aiAgentActive ? 'TerminalShell-navItem--active' : ''}`}
            onClick={() => onNavigate('aiAgent')}
          >
            <span className="TerminalShell-navIcon" aria-hidden>
              <NavIcon name="agent" />
            </span>
            AI Financial Agent
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
            <input
              className="TerminalShell-search"
              type="search"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              aria-label="Search"
            />
          </div>
          <div className="TerminalShell-headerRight">
            <div className="TerminalShell-iconBtnGroup" ref={notifRef}>
              <button
                type="button"
                className="TerminalShell-iconBtn"
                title="Notifications"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </button>
              {showNotifications && (
                <div className="TerminalShell-dropdown">
                  <div className="TerminalShell-dropdownHeader">Notifications</div>
                  <div className="TerminalShell-dropdownItem">
                    <div className="TerminalShell-notifDot" />
                    <div>
                      <div className="TerminalShell-notifTitle">Market Alert</div>
                      <div className="TerminalShell-notifTime">Tech sector up 2.3%</div>
                    </div>
                  </div>
                  <div className="TerminalShell-dropdownItem">
                    <div className="TerminalShell-notifDot" />
                    <div>
                      <div className="TerminalShell-notifTitle">Portfolio Update</div>
                      <div className="TerminalShell-notifTime">Your watched stocks gained +1.8%</div>
                    </div>
                  </div>
                  <div className="TerminalShell-dropdownItem">
                    <div className="TerminalShell-notifDot" />
                    <div>
                      <div className="TerminalShell-notifTitle">Research Complete</div>
                      <div className="TerminalShell-notifTime">AI analysis ready for NVDA</div>
                    </div>
                  </div>
                  <div className="TerminalShell-dropdownFooter">
                    <a href="#" className="TerminalShell-dropdownLink">View all</a>
                  </div>
                </div>
              )}
            </div>

            <div className="TerminalShell-iconBtnGroup" ref={layoutRef}>
              <button
                type="button"
                className="TerminalShell-iconBtn"
                title="Layout & Display"
                onClick={() => setShowLayout(!showLayout)}
                aria-label="Layout options"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
                </svg>
              </button>
              {showLayout && (
                <div className="TerminalShell-dropdown">
                  <div className="TerminalShell-dropdownHeader">Display Settings</div>
                  <button type="button" className="TerminalShell-dropdownItem" onClick={() => setShowLayout(false)}>
                    <input type="radio" name="layout" defaultChecked /> Compact View
                  </button>
                  <button type="button" className="TerminalShell-dropdownItem" onClick={() => setShowLayout(false)}>
                    <input type="radio" name="layout" /> Detailed View
                  </button>
                  <button type="button" className="TerminalShell-dropdownItem" onClick={() => setShowLayout(false)}>
                    <input type="radio" name="layout" /> Grid View
                  </button>
                  <div style={{ borderTop: '1px solid rgba(16,185,129,0.15)', marginTop: '8px', paddingTop: '8px' }}>
                    <label className="TerminalShell-dropdownLabel">
                      <input type="checkbox" defaultChecked /> Dark Mode
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="TerminalShell-iconBtnGroup" ref={accountRef}>
              <button
                type="button"
                className="TerminalShell-iconBtn"
                title="Account"
                onClick={() => setShowAccount(!showAccount)}
                aria-label="Account menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M20 21a8 8 0 00-16 0" />
                </svg>
              </button>
              {showAccount && (
                <div className="TerminalShell-dropdown">
                  <div className="TerminalShell-dropdownHeader">Account</div>
                  <div className="TerminalShell-userCardDropdown">
                    <div className="TerminalShell-userAvatar" style={{ width: '40px', height: '40px' }}>TT</div>
                    <div>
                      <div className="TerminalShell-userName">Tech Titans</div>
                      <div className="TerminalShell-userRole">Senior Analyst</div>
                    </div>
                  </div>
                  <button type="button" className="TerminalShell-dropdownItem" onClick={() => setShowAccount(false)}>
                    📊 My Portfolio
                  </button>
                  <button type="button" className="TerminalShell-dropdownItem" onClick={() => setShowAccount(false)}>
                    ⚙️ Settings
                  </button>
                  <button type="button" className="TerminalShell-dropdownItem" onClick={() => setShowAccount(false)}>
                    💾 Saved Research
                  </button>
                  <div style={{ borderTop: '1px solid rgba(16,185,129,0.15)', marginTop: '8px', paddingTop: '8px' }}>
                    <button
                      type="button"
                      className="TerminalShell-dropdownItem"
                      onClick={() => { setShowAccount(false); onSignOut(); }}
                      style={{ color: '#dc2626' }}
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>

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
