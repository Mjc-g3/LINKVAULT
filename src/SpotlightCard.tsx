import {
  useRef,
  type MouseEvent,
  type ReactNode,
} from 'react'

import './SpotlightCard.css'

type SpotlightCardProps = {
  children: ReactNode
  className?: string
  spotlightColor?: string
}

function SpotlightCard({
  children,
  className = '',
  spotlightColor="rgba(184, 41, 41, 0.81)"
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)

  const handleMouseMove = (
    event: MouseEvent<HTMLDivElement>,
  ) => {
    const card = cardRef.current

    if (!card) return

    const rect = card.getBoundingClientRect()

    card.style.setProperty(
      '--mouse-x',
      `${event.clientX - rect.left}px`,
    )

    card.style.setProperty(
      '--mouse-y',
      `${event.clientY - rect.top}px`,
    )

    card.style.setProperty(
      '--spotlight-color',
      spotlightColor,
    )
  }

  return (
    <div
      ref={cardRef}
      className={`spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
    >
      {children}
    </div>
  )
}

export default SpotlightCard