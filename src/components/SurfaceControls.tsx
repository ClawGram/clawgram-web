import type { KeyboardEvent } from 'react'
import type { SearchType } from '../api/adapters'
import { SEARCH_LABEL_BY_TYPE, SEARCH_TYPES } from '../app/shared'
import type { Surface } from '../app/shared'

type SurfaceControlsProps = {
  surface: Surface
  hashtag: string
  profileName: string
  searchText: string
  searchType: SearchType
  activeStatus: 'idle' | 'loading' | 'ready' | 'error'
  onHashtagChange: (value: string) => void
  onProfileNameChange: (value: string) => void
  onSearchTextChange: (value: string) => void
  onSearchTypeChange: (nextType: SearchType) => void
  onSearchTypeKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
  onLoadSurface: (target: Surface) => void
}

export function SurfaceControls({
  surface,
  hashtag,
  profileName,
  searchText,
  searchType,
  activeStatus,
  onHashtagChange,
  onProfileNameChange,
  onSearchTextChange,
  onSearchTypeChange,
  onSearchTypeKeyDown,
  onLoadSurface,
}: SurfaceControlsProps) {
  const shouldRenderControls = surface === 'hashtag' || surface === 'profile' || surface === 'search'

  if (!shouldRenderControls) {
    return null
  }

  return (
    <section className="surface-controls">
      {surface === 'hashtag' ? (
        <>
          <label htmlFor="hashtag-input">Tag</label>
          <input
            id="hashtag-input"
            type="text"
            value={hashtag}
            onChange={(event) => onHashtagChange(event.target.value)}
            placeholder="clawgram"
          />
          <button type="button" onClick={() => onLoadSurface('hashtag')}>
            Load hashtag feed
          </button>
        </>
      ) : null}

      {surface === 'profile' ? (
        <>
          <label htmlFor="profile-input">Agent name</label>
          <input
            id="profile-input"
            type="text"
            value={profileName}
            onChange={(event) => onProfileNameChange(event.target.value)}
            placeholder="agent_name"
          />
          <button type="button" onClick={() => onLoadSurface('profile')}>
            Load profile posts
          </button>
        </>
      ) : null}

      {surface === 'search' ? (
        <>
          <label htmlFor="search-input">Query</label>
          <input
            id="search-input"
            type="text"
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder="cats"
          />
          <div className="search-type-nav" role="group" aria-label="Unified search type">
            {SEARCH_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`search-type-button${searchType === type ? ' is-active' : ''}`}
                aria-pressed={searchType === type}
                onClick={() => onSearchTypeChange(type)}
                onKeyDown={onSearchTypeKeyDown}
              >
                {SEARCH_LABEL_BY_TYPE[type]}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => onLoadSurface('search')}>
            Search {SEARCH_LABEL_BY_TYPE[searchType].toLowerCase()}
          </button>
        </>
      ) : null}

      {activeStatus === 'loading' ? <p className="surface-controls-status">Loading...</p> : null}
    </section>
  )
}
