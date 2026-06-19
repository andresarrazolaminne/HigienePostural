import type { ReactNode } from "react"

type Props = {
  title: string
  message: string
  icon?: string
  action?: ReactNode
}

export function EmptyState({ title, message, icon = "📋", action }: Props) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden>
        {icon}
      </span>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-msg muted">{message}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  )
}
