import './ShinyText.css'

type ShinyTextProps = {
  text: string
  disabled?: boolean
  speed?: number
  className?: string
}

const ShinyText = ({
  text,
  disabled = false,
  speed = 2.8,
  className = '',
}: ShinyTextProps) => {
  return (
    <div
      className={`shiny-text ${disabled ? 'disabled' : ''} ${className}`}
      style={{
        animationDuration: `${speed}s`,
      }}
    >
      {text}
    </div>
  )
}

export default ShinyText