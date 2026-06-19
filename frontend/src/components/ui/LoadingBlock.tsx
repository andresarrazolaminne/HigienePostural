type Props = {
  label?: string
}

export function LoadingBlock({ label = "Cargando…" }: Props) {
  return (
    <div className="loading-block" role="status">
      <span className="loading-spinner" aria-hidden />
      <span className="muted">{label}</span>
    </div>
  )
}
