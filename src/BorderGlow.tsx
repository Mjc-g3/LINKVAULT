import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react'

import './BorderGlow.css'

type BorderGlowProps = {
  children: ReactNode
  className?: string
  edgeSensitivity?: number
  glowColor?: string
  backgroundColor?: string
  borderRadius?: number
  glowRadius?: number
  glowIntensity?: number
  coneSpread?: number
  animated?: boolean
  followNearestEdge?: boolean
  fullStrengthOnHover?: boolean
  continuousGlow?: boolean
  colors?: string[]
  fillOpacity?: number
}

type GlowStyle = CSSProperties & Record<`--${string}`, string | number>

const gradientPositions = [
  '80% 55%', '69% 34%', '8% 6%', '41% 38%',
  '86% 85%', '82% 18%', '51% 4%',
]
const gradientKeys: Array<`--${string}`> = [
  '--gradient-one', '--gradient-two', '--gradient-three',
  '--gradient-four', '--gradient-five', '--gradient-six',
  '--gradient-seven',
]
const colorMap = [0, 1, 2, 0, 1, 2, 1]

const parseHsl = (value: string) => {
  const match = value.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/)
  if (!match) return { h: 40, s: 80, l: 80 }
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) }
}

const buildGlowVars = (glowColor: string, intensity: number): GlowStyle => {
  const { h, s, l } = parseHsl(glowColor)
  const opacities = [100, 60, 50, 40, 30, 20, 10]
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10']
  const vars: GlowStyle = {}

  opacities.forEach((opacity, index) => {
    vars[`--glow-color${keys[index]}`] =
      `hsl(${h}deg ${s}% ${l}% / ${Math.min(opacity * intensity, 100)}%)`
  })

  return vars
}

const buildGradientVars = (colors: string[]): GlowStyle => {
  const palette = colors.length > 0 ? colors : ['#6268a5']
  const vars: GlowStyle = {}

  gradientKeys.forEach((key, index) => {
    const color = palette[Math.min(colorMap[index], palette.length - 1)]
    vars[key] = `radial-gradient(at ${gradientPositions[index]}, ${color} 0px, transparent 50%)`
  })

  vars['--gradient-base'] = `linear-gradient(${palette[0]} 0 100%)`
  return vars
}

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3)
const easeInCubic = (value: number) => value * value * value

function BorderGlow({
  children,
  className = '',
  edgeSensitivity = 30,
  glowColor = '235 85 72',
  backgroundColor = 'rgba(16, 18, 23, 0.78)',
  borderRadius = 13,
  glowRadius = 26,
  glowIntensity = 0.8,
  coneSpread = 25,
  animated = false,
  followNearestEdge = false,
  fullStrengthOnHover = false,
  continuousGlow = false,
  colors = ['#6268a5', '#2731ff', '#ffffff'],
  fillOpacity = 0.28,
}: BorderGlowProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)

  const getEdgeProximity = useCallback((element: HTMLDivElement, x: number, y: number) => {
    const { width, height } = element.getBoundingClientRect()
    const dx = x - width / 2
    const dy = y - height / 2
    const kx = dx === 0 ? Infinity : width / 2 / Math.abs(dx)
    const ky = dy === 0 ? Infinity : height / 2 / Math.abs(dy)
    return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1)
  }, [])

  const getCursorAngle = useCallback((element: HTMLDivElement, x: number, y: number) => {
    const { width, height } = element.getBoundingClientRect()
    const dx = x - width / 2
    const dy = y - height / 2
    if (dx === 0 && dy === 0) return 0
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    return angle < 0 ? angle + 360 : angle
  }, [])

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    card.style.setProperty('--pointer-x', `${x.toFixed(3)}px`)
    card.style.setProperty('--pointer-y', `${y.toFixed(3)}px`)
    const proximity = fullStrengthOnHover
      ? 100
      : getEdgeProximity(card, x, y) * 100

    let angle = getCursorAngle(card, x, y)

    if (followNearestEdge) {
      const { width, height } = card.getBoundingClientRect()
      const distances = [y, width - x, height - y, x]
      const nearestEdge = distances.indexOf(Math.min(...distances))
      const edgeX = nearestEdge === 1 ? width : nearestEdge === 3 ? 0 : x
      const edgeY = nearestEdge === 0 ? 0 : nearestEdge === 2 ? height : y
      angle = getCursorAngle(card, edgeX, edgeY)
    }

    card.style.setProperty('--edge-proximity', proximity.toFixed(3))
    card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`)
  }, [followNearestEdge, fullStrengthOnHover, getCursorAngle, getEdgeProximity])

  useEffect(() => {
    const card = cardRef.current
    if (!animated || !card) return

    const animationFrameIds = new Set<number>()
    const timeoutIds = new Set<number>()
    const angleStart = 110
    const angleEnd = 465

    const animate = (
      start: number,
      end: number,
      duration: number,
      delay: number,
      easing: (value: number) => number,
      update: (value: number) => void,
      onEnd?: () => void,
    ) => {
      const timeoutId = window.setTimeout(() => {
        const startedAt = performance.now()
        const tick = (now: number) => {
          const progress = Math.min((now - startedAt) / duration, 1)
          update(start + (end - start) * easing(progress))
          if (progress < 1) {
            const frameId = requestAnimationFrame(tick)
            animationFrameIds.add(frameId)
          } else {
            onEnd?.()
          }
        }
        const frameId = requestAnimationFrame(tick)
        animationFrameIds.add(frameId)
      }, delay)
      timeoutIds.add(timeoutId)
    }

    card.classList.add('sweep-active')
    card.style.setProperty('--cursor-angle', `${angleStart}deg`)
    animate(0, 100, 500, 0, easeOutCubic, (value) =>
      card.style.setProperty('--edge-proximity', `${value}`))
    animate(0, 50, 1500, 0, easeInCubic, (value) =>
      card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (value / 100) + angleStart}deg`))
    animate(50, 100, 2250, 1500, easeOutCubic, (value) =>
      card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (value / 100) + angleStart}deg`))
    animate(100, 0, 1500, 2500, easeInCubic, (value) =>
      card.style.setProperty('--edge-proximity', `${value}`), () =>
      card.classList.remove('sweep-active'))

    return () => {
      timeoutIds.forEach(clearTimeout)
      animationFrameIds.forEach(cancelAnimationFrame)
      card.classList.remove('sweep-active')
    }
  }, [animated])

  const style: GlowStyle = {
    '--card-bg': backgroundColor,
    '--edge-sensitivity': edgeSensitivity,
    '--border-radius': `${borderRadius}px`,
    '--glow-padding': `${glowRadius}px`,
    '--cone-spread': coneSpread,
    '--fill-opacity': fillOpacity,
    '--pointer-x': '50%',
    '--pointer-y': '50%',
    ...buildGlowVars(glowColor, glowIntensity),
    ...buildGradientVars(colors),
  }

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className={`border-glow-card${continuousGlow ? ' continuous-glow' : ''} ${className}`}
      style={style}
    >
      <span className="edge-light" />
      <div className="border-glow-inner">{children}</div>
    </div>
  )
}

export default BorderGlow
