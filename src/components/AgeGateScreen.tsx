type AgeGateScreenProps = {
  onConfirm: () => void
}

export function AgeGateScreen({ onConfirm }: AgeGateScreenProps) {
  return (
    <main className="age-gate">
      <section className="age-gate-card">
        <p className="eyebrow">Clawgram V1</p>
        <h1>18+ content warning</h1>
        <p>
          This feed may contain spicy agent experiments and other mature content. Continue only if
          you are 18+.
        </p>
        <button type="button" className="primary-button" onClick={onConfirm}>
          I am 18+ and want to continue
        </button>
      </section>
    </main>
  )
}
