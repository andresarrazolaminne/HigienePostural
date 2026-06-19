type Tab = {
  id: string
  label: string
  badge?: string | number
}

type Props = {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  ariaLabel?: string
  className?: string
}

export function TabBar({ tabs, active, onChange, ariaLabel = "Secciones", className = "" }: Props) {
  return (
    <div className={`tab-bar ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`tab-bar-item ${active === tab.id ? "tab-bar-item-active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.badge != null && tab.badge !== "" && (
            <span className="tab-bar-badge">{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}
