type QuestStep = {
  id: string
  icon: string
  label: string
}

type Props = {
  steps: QuestStep[]
  currentId: string
  title?: string
}

export function MissionQuestBar({ steps, currentId, title = "Progreso de inspección" }: Props) {
  const currentIndex = steps.findIndex((s) => s.id === currentId)

  return (
    <div className="quest-bar" aria-label={title}>
      <div className="quest-bar-track" aria-hidden>
        <div
          className="quest-bar-fill"
          style={{
            width:
              steps.length <= 1
                ? "0%"
                : `${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}%`,
          }}
        />
      </div>
      <ol className="quest-bar-steps">
        {steps.map((step, i) => {
          const done = currentIndex > i
          const active = step.id === currentId
          return (
            <li
              key={step.id}
              className={`quest-bar-step ${active ? "quest-bar-step-active" : ""} ${done ? "quest-bar-step-done" : ""}`}
            >
              <span className="quest-bar-icon" aria-hidden>
                {done ? "✓" : step.icon}
              </span>
              <span className="quest-bar-label">{step.label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
