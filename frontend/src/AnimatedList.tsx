import { useEffect, useMemo, useState } from 'react'

type AnimatedListProps = {
  items: string[]
  onItemSelect?: (item: string, index: number) => void
  showGradients?: boolean
  enableArrowNavigation?: boolean
  displayScrollbar?: boolean
}

export default function AnimatedList({
  items,
  onItemSelect,
  showGradients = false,
  enableArrowNavigation = false,
  displayScrollbar = false,
}: AnimatedListProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  const safeItems = useMemo(() => items.filter((x) => String(x).trim().length > 0), [items])

  useEffect(() => {
    if (activeIndex >= safeItems.length) setActiveIndex(Math.max(0, safeItems.length - 1))
  }, [activeIndex, safeItems.length])

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!enableArrowNavigation || safeItems.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, safeItems.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = safeItems[activeIndex]
      if (item) onItemSelect?.(item, activeIndex)
    }
  }

  return (
    <div className="AnimatedListWrap">
      {showGradients ? <div className="AnimatedListFadeTop" aria-hidden /> : null}
      <div
        className={`AnimatedList ${displayScrollbar ? 'AnimatedListScrollbar' : 'AnimatedListNoScrollbar'}`}
        tabIndex={enableArrowNavigation ? 0 : -1}
        onKeyDown={onKeyDown}
      >
        {safeItems.map((item, index) => (
          <button
            key={`${item}-${index}`}
            type="button"
            className={`AnimatedListItem ${index === activeIndex ? 'AnimatedListItemActive' : ''}`}
            style={{ animationDelay: `${index * 45}ms` }}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => onItemSelect?.(item, index)}
            title={item}
          >
            {item}
          </button>
        ))}
      </div>
      {showGradients ? <div className="AnimatedListFadeBottom" aria-hidden /> : null}
    </div>
  )
}

