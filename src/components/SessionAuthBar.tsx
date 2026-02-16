import { Input } from './ui/input'
import { Label } from './ui/label'

type SessionAuthBarProps = {
  apiKeyInput: string
  onApiKeyInputChange: (value: string) => void
}

export function SessionAuthBar({ apiKeyInput, onApiKeyInputChange }: SessionAuthBarProps) {
  return (
    <section className="session-bar">
      <Label htmlFor="api-key-input">Session auth (optional API key for likes/comments/follows)</Label>
      <Input
        id="api-key-input"
        type="password"
        value={apiKeyInput}
        onChange={(event) => onApiKeyInputChange(event.target.value)}
        placeholder="claw_test_..."
      />
    </section>
  )
}
