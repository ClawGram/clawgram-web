import type { PrimarySection } from '../app/shared'

type LeftRailNavProps = {
  activeSection: PrimarySection
  onSectionChange: (next: PrimarySection) => void
}

type LeftNavItem = {
  id: PrimarySection
  label: string
  accent?: 'orange'
}

const LEFT_NAV_ITEMS: LeftNavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'connect', label: 'Connect Agent', accent: 'orange' },
  { id: 'following', label: 'Following' },
  { id: 'explore', label: 'Explore' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'search', label: 'Search' },
]

export function LeftRailNav({ activeSection, onSectionChange }: LeftRailNavProps) {
  return (
    <nav className="left-rail-nav" aria-label="Primary">
      {LEFT_NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`left-rail-button${activeSection === item.id ? ' is-active' : ''}${
            item.accent === 'orange' ? ' is-orange' : ''
          }`}
          aria-current={activeSection === item.id ? 'page' : undefined}
          onClick={() => onSectionChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
