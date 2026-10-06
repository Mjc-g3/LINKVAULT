import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { ExternalLink, Folder, Search, Star } from 'lucide-react'
import './CommandPalette.css'

import {
  getWebsiteHostname,
  isEmptyQuery,
  parseQuery,
  scoreWebsite,
  fuzzyScore,
  type Category,
  type Website,
} from './library'

type PaletteItem =
  | { kind: 'website'; site: Website }
  | { kind: 'category'; category: Category }

type CommandPaletteProps = {
  websites: Website[]
  categories: Category[]
  onClose: () => void
  onSelectCategory: (categoryName: string) => void
}

const MAX_RESULTS = 9

function CommandPalette({
  websites,
  categories,
  onClose,
  onSelectCategory,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement | null>(null)

  const knownTags = useMemo(
    () =>
      new Set(websites.flatMap((site) => site.tags.map((tag) => tag.toLowerCase()))),
    [websites],
  )

  const items = useMemo<PaletteItem[]>(() => {
    const parsed = parseQuery(query, knownTags)

    // With nothing typed, offer favorites as quick jumps.
    if (isEmptyQuery(parsed)) {
      return websites
        .filter((site) => site.favorite)
        .sort((a, b) => a.order - b.order)
        .slice(0, MAX_RESULTS)
        .map((site) => ({ kind: 'website', site }))
    }

    const categoryMatches: PaletteItem[] =
      parsed.words.length > 0 &&
      parsed.tags.length === 0 &&
      parsed.categories.length === 0 &&
      !parsed.favoritesOnly
        ? categories
            .map((category) => ({
              category,
              score: Math.min(
                ...parsed.words.map((word) =>
                  fuzzyScore(word, category.name, false),
                ),
              ),
            }))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 2)
            .map(({ category }) => ({ kind: 'category', category }))
        : []

    const websiteMatches: PaletteItem[] = websites
      .map((site) => ({ site, score: scoreWebsite(site, parsed, categories) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS - categoryMatches.length)
      .map(({ site }) => ({ kind: 'website', site }))

    return [...categoryMatches, ...websiteMatches]
  }, [query, websites, categories, knownTags])

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const chooseItem = (item: PaletteItem | undefined) => {
    if (!item) return

    if (item.kind === 'website') {
      window.open(item.site.url, '_blank', 'noopener,noreferrer')
    } else {
      onSelectCategory(item.category.name)
    }

    onClose()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      chooseItem(items[activeIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <div
      className="palette-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search links"
        onKeyDown={handleKeyDown}
      >
        <div className="palette-input">
          <Search size={19} aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            placeholder="Search links, or try #tag in:category is:fav"
            aria-label="Search links"
            aria-controls="palette-results"
            aria-activedescendant={
              items.length ? `palette-item-${activeIndex}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </div>

        <div
          className="palette-results"
          id="palette-results"
          role="listbox"
          ref={listRef}
        >
          {!query.trim() && items.length > 0 && (
            <p className="palette-group-label">Favorites</p>
          )}

          {items.map((item, index) => (
            <div
              key={
                item.kind === 'website'
                  ? `site-${item.site.id}`
                  : `category-${item.category.name}`
              }
              id={`palette-item-${index}`}
              data-index={index}
              role="option"
              aria-selected={index === activeIndex}
              className={
                index === activeIndex ? 'palette-item active' : 'palette-item'
              }
              onMouseMove={() => setActiveIndex(index)}
              onClick={() => chooseItem(item)}
            >
              {item.kind === 'website' ? (
                <>
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${item.site.url}&sz=64`}
                    alt=""
                  />
                  <span className="palette-item-text">
                    <strong>
                      {item.site.name}
                      {item.site.favorite && (
                        <Star size={12} aria-label="Favorite" />
                      )}
                    </strong>
                    <small>
                      {getWebsiteHostname(item.site.url)} · {item.site.category}
                    </small>
                  </span>
                  <ExternalLink size={15} aria-hidden="true" />
                </>
              ) : (
                <>
                  <span className="palette-item-icon">
                    <Folder size={17} aria-hidden="true" />
                  </span>
                  <span className="palette-item-text">
                    <strong>{item.category.name}</strong>
                    <small>Go to category</small>
                  </span>
                </>
              )}
            </div>
          ))}

          {items.length === 0 && (
            <p className="palette-empty">
              {query.trim()
                ? 'No saved links match that search.'
                : 'Star links to see them here.'}
            </p>
          )}
        </div>

        <div className="palette-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> open</span>
          <span className="palette-footer-syntax">#tag · in:category · is:fav</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
