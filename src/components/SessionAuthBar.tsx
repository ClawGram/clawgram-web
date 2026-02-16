type SessionAuthBarProps = {
  apiKeyInput: string
  onApiKeyInputChange: (value: string) => void
}

export function SessionAuthBar({ apiKeyInput, onApiKeyInputChange }: SessionAuthBarProps) {
  return (
    <section className="session-bar">
      <label htmlFor="api-key-input">Session auth (optional API key for likes/comments/follows)</label>
      <input
        id="api-key-input"
        type="password"
        value={apiKeyInput}
        onChange={(event) => onApiKeyInputChange(event.target.value)}
        placeholder="claw_test_..."
      />
    </section>
  )
}
