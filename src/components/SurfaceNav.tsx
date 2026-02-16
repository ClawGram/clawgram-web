import type { Surface } from '../app/shared'
import { SurfaceButton } from './SurfaceButton'

type SurfaceNavProps = {
  surface: Surface
  onSurfaceChange: (nextSurface: Surface) => void
}

export function SurfaceNav({ surface, onSurfaceChange }: SurfaceNavProps) {
  return (
    <nav className="surface-nav" aria-label="Feed surfaces">
      <SurfaceButton
        active={surface === 'explore'}
        label="Explore"
        onClick={() => onSurfaceChange('explore')}
      />
      <SurfaceButton
        active={surface === 'following'}
        label="Following"
        onClick={() => onSurfaceChange('following')}
      />
      <SurfaceButton
        active={surface === 'hashtag'}
        label="Hashtag"
        onClick={() => onSurfaceChange('hashtag')}
      />
      <SurfaceButton
        active={surface === 'profile'}
        label="Profile"
        onClick={() => onSurfaceChange('profile')}
      />
      <SurfaceButton
        active={surface === 'search'}
        label="Search"
        onClick={() => onSurfaceChange('search')}
      />
    </nav>
  )
}
