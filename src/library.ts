export type Website = {
  id: number
  name: string
  url: string
  description: string
  category: string
  tags: string[]
  favorite: boolean
  order: number
}

export type Category = {
  name: string
  icon: string
  parent: string | null
}

export const getWebsiteHostname = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const normalized = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`

    return new URL(normalized).hostname
      .toLowerCase()
      .replace(/^www\./, '')
  } catch {
    return null
  }
}

// Search syntax: free words are fuzzy-matched, and these filters narrow it:
//   #tag   in:category   is:fav
// Values with spaces can be quoted: #"image editing", in:"desktop customization".
export type ParsedQuery = {
  words: string[]
  tags: { value: string; exact: boolean }[]
  categories: string[]
  favoritesOnly: boolean
}

const unquote = (value: string) => value.replace(/^"|"$/g, '')

export const parseQuery = (
  query: string,
  knownTags: Set<string>,
): ParsedQuery => {
  const parsed: ParsedQuery = {
    words: [],
    tags: [],
    categories: [],
    favoritesOnly: false,
  }

  const tokens = query.toLowerCase().match(/(?:#|in:|is:)?"[^"]*"?|\S+/g) ?? []

  tokens.forEach((token) => {
    if (token.startsWith('#') && token.length > 1) {
      const value = unquote(token.slice(1)).trim()
      // A tag that exists exactly is matched exactly, so clicking "#ai"
      // does not also pull in "#aim". Partial input still matches prefixes.
      if (value) parsed.tags.push({ value, exact: knownTags.has(value) })
    } else if (token.startsWith('in:') && token.length > 3) {
      const value = unquote(token.slice(3)).trim()
      if (value) parsed.categories.push(value)
    } else if (token === 'is:fav' || token === 'is:favorite') {
      parsed.favoritesOnly = true
    } else {
      const value = unquote(token).trim()
      if (value) parsed.words.push(value)
    }
  })

  return parsed
}

export const isEmptyQuery = (parsed: ParsedQuery) =>
  parsed.words.length === 0 &&
  parsed.tags.length === 0 &&
  parsed.categories.length === 0 &&
  !parsed.favoritesOnly

// Substring matches score highest, earlier and word-start matches more so.
// Otherwise the letters must appear in order (so "githb" finds "github"),
// scored by how many of them are consecutive.
export const fuzzyScore = (query: string, text: string, allowGaps = true) => {
  const target = text.toLowerCase()
  const index = target.indexOf(query)

  if (index !== -1) {
    const atWordStart = index === 0 || /[^a-z0-9]/.test(target[index - 1])
    return 100 + (atWordStart ? 30 : 0) - Math.min(index, 40) * 0.5
  }

  if (!allowGaps) return 0

  let position = 0
  let streak = 0
  let score = 0

  for (const char of query) {
    const found = target.indexOf(char, position)
    if (found === -1) return 0
    streak = found === position ? streak + 1 : 0
    score += 1 + streak * 2
    position = found + 1
  }

  // Scattered matches over a long string are mostly noise.
  return score >= query.length * 2 ? score : 0
}

const scoreWord = (word: string, site: Website) => {
  const hostname = getWebsiteHostname(site.url) ?? site.url

  return Math.max(
    fuzzyScore(word, site.name) * 3,
    fuzzyScore(word, hostname) * 2,
    ...site.tags.map((tag) => fuzzyScore(word, tag, false) * 2),
    fuzzyScore(word, site.category, false) * 1.5,
    // Descriptions are long, so only exact substrings count there.
    fuzzyScore(word, site.description, false),
  )
}

// Returns a relevance score, or 0 when the site does not match.
export const scoreWebsite = (
  site: Website,
  parsed: ParsedQuery,
  categories: Category[],
) => {
  if (parsed.favoritesOnly && !site.favorite) return 0

  const siteTags = site.tags.map((tag) => tag.toLowerCase())
  const matchesTags = parsed.tags.every(({ value, exact }) =>
    siteTags.some((tag) => (exact ? tag === value : tag.startsWith(value))),
  )
  if (!matchesTags) return 0

  if (parsed.categories.length > 0) {
    const parent =
      categories.find((item) => item.name === site.category)?.parent ?? ''
    const categoryText = `${site.category} ${parent}`.toLowerCase()

    if (!parsed.categories.every((value) => categoryText.includes(value))) {
      return 0
    }
  }

  let score = 1

  for (const word of parsed.words) {
    const wordScore = scoreWord(word, site)
    if (wordScore === 0) return 0
    score += wordScore
  }

  return score
}

// Builds the search text that filters a view by one tag.
export const tagQuery = (tag: string) =>
  /\s/.test(tag) ? `#"${tag}"` : `#${tag}`
