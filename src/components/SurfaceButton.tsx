type SurfaceButtonProps = {
  active: boolean
  label: string
  onClick: () => void
}

export function SurfaceButton({ active, label, onClick }: SurfaceButtonProps) {
  return (
    <button
      type="button"
      className={`surface-button${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}
