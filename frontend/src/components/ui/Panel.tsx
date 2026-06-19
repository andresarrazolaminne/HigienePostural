import type { ReactNode } from "react"

type Props = {
  title?: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, subtitle, actions, children, className = "" }: Props) {
  return (
    <section className={`ui-panel ${className}`.trim()}>
      {(title || actions) && (
        <header className="ui-panel-head">
          <div>
            {title && <h3 className="ui-panel-title">{title}</h3>}
            {subtitle && <p className="ui-panel-sub muted small">{subtitle}</p>}
          </div>
          {actions && <div className="ui-panel-actions">{actions}</div>}
        </header>
      )}
      <div className="ui-panel-body">{children}</div>
    </section>
  )
}
