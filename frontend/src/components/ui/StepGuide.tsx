type Step = {
  n: number
  title: string
  text: string
}

type Props = {
  title?: string
  steps: Step[]
}

export function StepGuide({ title = "Cómo funciona", steps }: Props) {
  return (
    <section className="step-guide panel">
      <h3 className="step-guide-title">{title}</h3>
      <ol className="step-guide-list">
        {steps.map((s) => (
          <li key={s.n} className="step-guide-item">
            <span className="step-guide-num">{s.n}</span>
            <div>
              <strong>{s.title}</strong>
              <p className="muted small">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
