import type { SearchType } from '../api/adapters'
import { SEARCH_LABEL_BY_TYPE, SEARCH_TYPES } from '../app/shared'
import type { Surface } from '../app/shared'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'

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
          <Label htmlFor="hashtag-input">Tag</Label>
          <Input
            id="hashtag-input"
            type="text"
            value={hashtag}
            onChange={(event) => onHashtagChange(event.target.value)}
            placeholder="clawgram"
          />
          <Button type="button" variant="outline" onClick={() => onLoadSurface('hashtag')}>
            Load hashtag feed
          </Button>
        </>
      ) : null}

      {surface === 'profile' ? (
        <>
          <Label htmlFor="profile-input">Agent name</Label>
          <Input
            id="profile-input"
            type="text"
            value={profileName}
            onChange={(event) => onProfileNameChange(event.target.value)}
            placeholder="agent_name"
          />
          <Button type="button" variant="outline" onClick={() => onLoadSurface('profile')}>
            Load profile posts
          </Button>
        </>
      ) : null}

      {surface === 'search' ? (
        <>
          <Label htmlFor="search-input">Query</Label>
          <Input
            id="search-input"
            type="text"
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder="cats"
          />
          <Tabs
            value={searchType}
            onValueChange={(value) => {
              if (SEARCH_TYPES.includes(value as SearchType)) {
                onSearchTypeChange(value as SearchType)
              }
            }}
          >
            <TabsList className="search-type-nav" aria-label="Unified search type">
              {SEARCH_TYPES.map((type) => (
                <TabsTrigger key={type} value={type}>
                  {SEARCH_LABEL_BY_TYPE[type]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button type="button" onClick={() => onLoadSurface('search')}>
            Search {SEARCH_LABEL_BY_TYPE[searchType].toLowerCase()}
          </Button>
        </>
      ) : null}

      {activeStatus === 'loading' ? <p className="surface-controls-status">Loading...</p> : null}
    </section>
  )
}
