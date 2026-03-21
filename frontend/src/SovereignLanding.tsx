import './SovereignLanding.css'

type Props = {
  onSignIn: () => void
  onTryDemo: () => void
}

function IconCheck() {
  return (
    <svg className="saL-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPin() {
  return (
    <svg className="saL-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconWarn() {
  return (
    <svg className="saL-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M10.3 3.6L1.8 18a2 2 0 001.7 3h16a2 2 0 001.7-3L13.7 3.6a2 2 0 00-3.4 0z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconTarget() {
  return (
    <svg className="saL-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function SovereignLanding({ onSignIn, onTryDemo }: Props) {
  const year = new Date().getFullYear()

  return (
    <div className="saL">
      <header className="saL-nav">
        <div className="saL-navInner">
          <a className="saL-logo" href="#" onClick={(e) => e.preventDefault()} aria-label="Tech Titans analyst home">
            <span className="saL-logoMark">TT</span>
            <span className="saL-logoText">Tech Titans analyst</span>
          </a>
          <nav className="saL-navLinks" aria-label="Primary">
            <a href="#products">Products</a>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing</a>
            <a href="#enterprise">Enterprise</a>
          </nav>
          <div className="saL-navActions">
            <button type="button" className="saL-linkBtn" onClick={onSignIn}>
              Sign in
            </button>
            <button type="button" className="saL-btn saL-btn--primary" onClick={onTryDemo}>
              Try Demo
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="saL-hero">
          <div className="saL-badge">NEW · TERMINAL V1.2</div>
          <h1 className="saL-heroTitle">
            Tech Titans Financial <span className="saL-accent">Research in Seconds</span>
          </h1>
          <p className="saL-heroSub">
            Upload filings, models, and research. Our engine extracts metrics, cites sources, and surfaces
            institutional-grade insights in real time.
          </p>
          <div className="saL-heroCtas">
            <button type="button" className="saL-btn saL-btn--primary saL-btn--lg" onClick={onTryDemo}>
              Try Demo →
            </button>
            <button type="button" className="saL-btn saL-btn--outline saL-btn--lg" onClick={onSignIn}>
              Upload Report
            </button>
          </div>

          <div className="saL-mock" aria-hidden>
            <div className="saL-mockChrome">
              <span className="saL-mockDots">
                <i className="saL-dot saL-dot--r" />
                <i className="saL-dot saL-dot--y" />
                <i className="saL-dot saL-dot--g" />
              </span>
              <span className="saL-mockUrl">sovereign-analyst.terminal</span>
            </div>
            <div className="saL-mockBody">
              <div className="saL-mockChart">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="saL-mockBar" style={{ height: `${h}%` }} />
                ))}
              </div>
              <aside className="saL-mockPanel">
                <div className="saL-mockPanelTitle">NODE INSIGHTS</div>
                <p className="saL-mockPanelText">
                  Correlation cluster stable. Risk factor drift within tolerance.
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section className="saL-section" id="products">
          <h2 className="saL-sectionTitle">
            Designed for high-frequency <span className="saL-accent">intelligence.</span>
          </h2>
          <div className="saL-grid4">
            <article className="saL-card">
              <div className="saL-cardIcon saL-cardIcon--green">
                <IconCheck />
              </div>
              <h3 className="saL-cardTitle">AI financial analysis</h3>
              <p className="saL-cardText">
                Structured extraction from 10-Ks, transcripts, and sell-side models.
              </p>
            </article>
            <article className="saL-card">
              <div className="saL-cardIcon saL-cardIcon--teal">
                <IconPin />
              </div>
              <h3 className="saL-cardTitle">Document intelligence</h3>
              <p className="saL-cardText">
                Entity linking, citation graphs, and reconciled tables across formats.
              </p>
            </article>
            <article className="saL-card">
              <div className="saL-cardIcon saL-cardIcon--orange">
                <IconWarn />
              </div>
              <h3 className="saL-cardTitle">Risk insights</h3>
              <p className="saL-cardText">
                Factor radar, scenario stress, and conviction scoring vs. baseline.
              </p>
            </article>
            <article className="saL-card">
              <div className="saL-cardIcon saL-cardIcon--teal2">
                <IconTarget />
              </div>
              <h3 className="saL-cardTitle">Portfolio recommendations</h3>
              <p className="saL-cardText">
                Cross-asset views with explainable drivers and exportable audit trails.
              </p>
            </article>
          </div>
        </section>

        <section className="saL-workflow" id="solutions">
          <div className="saL-workflowGrid">
            <div className="saL-workflowVisual">
              <div className="saL-networkBox">
                <span className="saL-networkLabel">MARKET CORRELATION NODE</span>
                <span className="saL-networkSub">Network visualization</span>
              </div>
            </div>
            <div className="saL-workflowCopy">
              <h2 className="saL-sectionTitle saL-sectionTitle--left">
                Built for the <span className="saL-accent">Tech Titans Research Workflow.</span>
              </h2>
              <p className="saL-workflowLead">
                Ingestion, synthesis, and reporting in one terminal—aligned to how institutional desks actually work.
              </p>
              <ul className="saL-checklist">
                <li>
                  <span className="saL-checkMark">
                    <IconCheck />
                  </span>
                  Secure document pipeline with lineage and retention controls.
                </li>
                <li>
                  <span className="saL-checkMark">
                    <IconCheck />
                  </span>
                  Model-graded outputs with source-backed citations.
                </li>
                <li>
                  <span className="saL-checkMark">
                    <IconCheck />
                  </span>
                  Exports: PDF, XLSX, and API hooks for downstream systems.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="saL-cta" id="pricing">
          <h2 className="saL-ctaTitle">Ready to upgrade your intelligence?</h2>
          <p className="saL-ctaSub">Join 1,000+ analysts on the terminal.</p>
          <div className="saL-ctaBtns">
            <button type="button" className="saL-btn saL-btn--primary saL-btn--lg" onClick={onTryDemo}>
              Start Free Trial
            </button>
            <button type="button" className="saL-btn saL-btn--outline saL-btn--lg">
              Contact Sales
            </button>
          </div>
        </section>
      </main>

      <footer className="saL-footer" id="enterprise">
        <div className="saL-footerGrid">
          <div>
            <div className="saL-footerBrand">Tech Titans analyst</div>
            <p className="saL-footerTag">
              Institutional-grade AI research infrastructure for modern markets.
            </p>
          </div>
          <div>
            <div className="saL-footerColTitle">Platform</div>
            <a href="#">Terminal Insights</a>
            <a href="#">Data Engineering</a>
            <a href="#">API Documentation</a>
          </div>
          <div>
            <div className="saL-footerColTitle">Intelligence</div>
            <a href="#">Risk Models</a>
            <a href="#">Sentiment Core</a>
            <a href="#">Backtesting Pro</a>
          </div>
          <div>
            <div className="saL-footerColTitle">Legal</div>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
          </div>
        </div>
        <div className="saL-footerBar">
          <span>© {year} Tech Titans analyst</span>
          <span className="saL-footerStatus">
            <span className="saL-statusDot" /> Region: US-East · Operational
          </span>
        </div>
      </footer>
    </div>
  )
}
