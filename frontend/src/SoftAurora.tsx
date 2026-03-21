import { useEffect, useRef } from 'react'

type SoftAuroraProps = {
  speed?: number
  scale?: number
  brightness?: number
  color1?: string
  color2?: string
  noiseFrequency?: number
  noiseAmplitude?: number
  bandHeight?: number
  bandSpread?: number
  octaveDecay?: number
  layerOffset?: number
  colorSpeed?: number
  enableMouseInteraction?: boolean
  mouseInfluence?: number
}

export default function SoftAurora({
  speed = 0.6,
  scale = 1.5,
  brightness = 1,
  color1 = '#f7f7f7',
  color2 = '#39FF14',
  noiseFrequency = 2.5,
  noiseAmplitude = 1,
  bandHeight = 0.5,
  bandSpread = 1,
  octaveDecay = 0.1,
  layerOffset = 0,
  colorSpeed = 1,
  enableMouseInteraction = false,
  mouseInfluence = 0.25,
}: SoftAuroraProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let frame: number
    let t = 0
    let mouseX = 0.5
    let mouseY = 0.5

    const handleMove = (e: MouseEvent) => {
      if (!enableMouseInteraction) return
      const rect = el.getBoundingClientRect()
      mouseX = (e.clientX - rect.left) / rect.width
      mouseY = (e.clientY - rect.top) / rect.height
    }

    el.addEventListener('pointermove', handleMove)

    const render = () => {
      t += 0.01 * speed
      const phase = Math.sin(t * colorSpeed) * 0.5 + 0.5
      const interp = (a: number, b: number) => a * (1 - phase) + b * phase

      const yOffset = Math.sin(t + layerOffset) * bandHeight * 40
      const mouseShiftX = enableMouseInteraction ? (mouseX - 0.5) * mouseInfluence * 40 : 0
      const mouseShiftY = enableMouseInteraction ? (mouseY - 0.5) * mouseInfluence * 40 : 0

      const blur = 40 * scale * (1 + bandSpread * 0.4)
      const opacity = 0.7 * brightness

      const bg = `
        radial-gradient(${interp(40, 70)}% ${interp(40, 80)}% at ${30 + mouseShiftX}% ${
          10 + mouseShiftY + yOffset / 10
        }%, ${color1} ${20 * noiseAmplitude}%, transparent 70%),
        radial-gradient(${interp(60, 90)}% ${interp(60, 90)}% at ${80 - mouseShiftX}% ${
        40 + mouseShiftY + yOffset / 8
      }%, ${color2} ${25 * noiseFrequency}%, transparent 75%),
        radial-gradient(120% 120% at 50% 100%, rgba(15, 23, 42, ${0.4 * opacity}), transparent 70%)
      `

      el.style.setProperty('--aurora-blur', `${blur}px`)
      el.style.setProperty('--aurora-opacity', `${opacity}`)
      el.style.backgroundImage = bg

      frame = requestAnimationFrame(render)
    }

    frame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('pointermove', handleMove)
    }
  }, [
    speed,
    scale,
    brightness,
    color1,
    color2,
    noiseFrequency,
    noiseAmplitude,
    bandHeight,
    bandSpread,
    octaveDecay,
    layerOffset,
    colorSpeed,
    enableMouseInteraction,
    mouseInfluence,
  ])

  return <div ref={ref} className="SoftAuroraBg" aria-hidden />
}

