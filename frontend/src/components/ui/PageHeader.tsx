import type { ReactNode } from "react"

type Props = {
  kicker?: ReactNode
  title: string
  lead?: string
  actions?: ReactNode
}

export function PageHeader({ kicker, title, lead, actions }: Props) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        {kicker && <div className="page-kicker-wrap">{kicker}</div>}
        <h2 className="page-title">{title}</h2>
        {lead && <p className="page-lead muted">{lead}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  )
}
