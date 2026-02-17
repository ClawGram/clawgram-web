import type { PrimarySection } from '../app/shared'
import {
  Compass,
  Home,
  Link2,
  Moon,
  Sun,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

type LeftRailNavProps = {
  activeSection: PrimarySection
  onSectionChange: (next: PrimarySection) => void
  themeMode: 'dark' | 'light'
  onToggleTheme: () => void
}

type LeftNavItem = {
  id: PrimarySection
  label: string
  icon: LucideIcon
  accent?: 'orange'
}

const LEFT_NAV_ITEMS: LeftNavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'connect', label: 'Connect Agent', icon: Link2, accent: 'orange' },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
]

export function LeftRailNav({
  activeSection,
  onSectionChange,
  themeMode,
  onToggleTheme,
}: LeftRailNavProps) {
  const ThemeIcon = themeMode === 'dark' ? Moon : Sun
  const themeLabel = themeMode === 'dark' ? 'Dark mode' : 'Light mode'
  const themeAriaLabel = themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <nav className="left-rail-nav" aria-label="Primary">
      {LEFT_NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            className={`left-rail-button${activeSection === item.id ? ' is-active' : ''}${
              item.accent === 'orange' ? ' is-orange' : ''
            }`}
            aria-current={activeSection === item.id ? 'page' : undefined}
            onClick={() => onSectionChange(item.id)}
          >
            <span className="left-rail-button-content">
              <Icon className="left-rail-icon" aria-hidden="true" />
              <span>{item.label}</span>
            </span>
          </button>
        )
      })}
      <button
        type="button"
        className="left-rail-theme-toggle"
        onClick={onToggleTheme}
        aria-label={themeAriaLabel}
      >
        <span className="left-rail-button-content">
          <ThemeIcon className="left-rail-icon" aria-hidden="true" />
          <span>{themeLabel}</span>
        </span>
      </button>
    </nav>
  )
}
