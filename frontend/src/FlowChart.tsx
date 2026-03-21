import { useEffect, useId, useState } from 'react'
import mermaid from 'mermaid'

export default function FlowChart({ chart, title }: { chart: string; title?: string }) {
  const wrapId = `flow-wrap-${useId().replace(/:/g, '')}`
  const [renderError, setRenderError] = useState<string | null>(null)

  useEffect(() => {
    const toMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

    Promise.resolve()
      .then(() => {
        // Mermaid v10+ expects DOM nodes. We render by letting Mermaid scan
        // a `.mermaid` element and convert it to SVG.
        mermaid.initialize({ startOnLoad: false })

        const selector = `#${wrapId} .mermaid`
        return mermaid.run({ querySelector: selector })
      })
      .then(() => {
        setRenderError(null)
      })
      .catch((e) => {
        setRenderError(toMsg(e))
      })
  }, [chart, wrapId])

  return (
    <section className="FlowCard">
      {title ? <div className="FlowTitle">{title}</div> : null}
      {renderError ? (
        <pre className="Pre">{chart}</pre>
      ) : (
        <div className="FlowChart" aria-label="Flow chart" id={wrapId}>
          <div className="mermaid">{chart}</div>
        </div>
      )}
    </section>
  )
}

