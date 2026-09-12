// Compatibility storage adapter for the existing App.tsx API.
// LinkVault stores its shared library in this GitHub repository itself.

const GITHUB_OWNER = 'Mjc-g3'
const GITHUB_REPO = 'LINKVAULT'
const GITHUB_BRANCH = 'main'
const GITHUB_DATA_PATH = 'public/library.json'
const TOKEN_KEY = 'linkvault_github_token'
const LEGACY_API_BASE = 'https://debian.tail924747.ts.net:8443/api'

type TableName = 'websites' | 'categories'
type ApiResult<T = unknown> = { data: T | null; error: Error | null }
type LibraryData = {
  version: 1
  updatedAt: string
  websites: Record<string, unknown>[]
  categories: Record<string, unknown>[]
}
type GitHubFileResponse = { content?: string; encoding?: string; sha?: string }

let cachedLibrary: LibraryData | null = null
let cachedSha: string | null = null
let loadedFromLegacy = false

const emptyLibrary = (): LibraryData => ({
  version: 1,
  updatedAt: new Date(0).toISOString(),
  websites: [],
  categories: [],
})

const githubContentsUrl = () =>
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_DATA_PATH}?ref=${encodeURIComponent(GITHUB_BRANCH)}`

const getToken = () => window.localStorage.getItem(TOKEN_KEY)?.trim() || ''
export const hasGitHubToken = () => Boolean(getToken())
export const setGitHubToken = (token: string) => {
  const clean = token.trim()
  if (!clean) throw new Error('GitHub token cannot be empty.')
  window.localStorage.setItem(TOKEN_KEY, clean)
  cachedLibrary = null
  cachedSha = null
}
export const clearGitHubToken = () => {
  window.localStorage.removeItem(TOKEN_KEY)
  cachedLibrary = null
  cachedSha = null
}

const githubHeaders = (includeJson = false): HeadersInit => {
  const token = getToken()
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const decodeBase64Utf8 = (value: string) => {
  const binary = window.atob(value.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
const encodeBase64Utf8 = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return window.btoa(binary)
}

const normalizeLibrary = (value: unknown): LibraryData => {
  if (!value || typeof value !== 'object') return emptyLibrary()
  const raw = value as Partial<LibraryData>
  return {
    version: 1,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(0).toISOString(),
    websites: Array.isArray(raw.websites) ? raw.websites : [],
    categories: Array.isArray(raw.categories) ? raw.categories : [],
  }
}

async function fetchGitHubLibrary(): Promise<LibraryData> {
  const response = await fetch(githubContentsUrl(), { headers: githubHeaders(), cache: 'no-store' })
  if (response.status === 404) { cachedSha = null; return emptyLibrary() }
  if (!response.ok) throw new Error(`GitHub library request failed: ${response.status} ${response.statusText}`)
  const file = (await response.json()) as GitHubFileResponse
  cachedSha = file.sha ?? null
  if (!file.content || file.encoding !== 'base64') return emptyLibrary()
  return normalizeLibrary(JSON.parse(decodeBase64Utf8(file.content)))
}

async function fetchLegacyLibrary(): Promise<LibraryData | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 3500)
  try {
    const [websitesResponse, categoriesResponse] = await Promise.all([
      fetch(`${LEGACY_API_BASE}/websites`, { signal: controller.signal }),
      fetch(`${LEGACY_API_BASE}/categories`, { signal: controller.signal }),
    ])
    if (!websitesResponse.ok || !categoriesResponse.ok) return null
    const websites = await websitesResponse.json()
    const categories = await categoriesResponse.json()
    if (!Array.isArray(websites) || !Array.isArray(categories)) return null
    if (websites.length === 0 && categories.length === 0) return null
    return { version: 1, updatedAt: new Date().toISOString(), websites, categories }
  } catch { return null } finally { window.clearTimeout(timer) }
}

async function loadLibrary(force = false): Promise<LibraryData> {
  if (cachedLibrary && !force) return cachedLibrary
  const githubLibrary = await fetchGitHubLibrary()
  if (githubLibrary.websites.length === 0 && githubLibrary.categories.length === 0) {
    const legacy = await fetchLegacyLibrary()
    if (legacy) {
      cachedLibrary = legacy
      loadedFromLegacy = true
      if (hasGitHubToken()) await saveLibrary(legacy, 'Migrate LinkVault library to GitHub')
      return cachedLibrary
    }
  }
  loadedFromLegacy = false
  cachedLibrary = githubLibrary
  return cachedLibrary
}

async function ensureEditingToken() {
  if (hasGitHubToken()) return
  const token = window.prompt(
    'GitHub editing is not connected on this device.\n\nPaste your fine-grained GitHub token for Mjc-g3/LINKVAULT.\nRequired permission: Contents — Read and write.',
    '',
  )
  if (!token?.trim()) throw new Error('GitHub editing was not connected.')
  setGitHubToken(token)
  await testGitHubConnection()
}

async function saveLibrary(library: LibraryData, message = 'Update LinkVault library') {
  await ensureEditingToken()
  // Always refresh the SHA immediately before a write. This prevents stale-SHA
  // conflicts when another device has edited library.json since this page loaded.
  await fetchGitHubLibrary()

  const next: LibraryData = { ...library, version: 1, updatedAt: new Date().toISOString() }
  const body = {
    message,
    content: encodeBase64Utf8(`${JSON.stringify(next, null, 2)}\n`),
    branch: GITHUB_BRANCH,
    ...(cachedSha ? { sha: cachedSha } : {}),
  }
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_DATA_PATH}`,
    { method: 'PUT', headers: githubHeaders(true), body: JSON.stringify(body) },
  )
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`
    try {
      const errorBody = await response.json()
      if (typeof errorBody?.message === 'string') detail = errorBody.message
    } catch { /* keep HTTP status */ }
    throw new Error(`GitHub could not save the library: ${detail}`)
  }
  const result = await response.json()
  cachedSha = result?.content?.sha ?? cachedSha
  cachedLibrary = next
  loadedFromLegacy = false
}

export async function testGitHubConnection() {
  if (!hasGitHubToken()) throw new Error('No GitHub token is configured.')
  // Test the exact resource LinkVault needs, not merely public repo access.
  const response = await fetch(githubContentsUrl(), { headers: githubHeaders(), cache: 'no-store' })
  if (!response.ok) throw new Error(`GitHub connection failed: ${response.status} ${response.statusText}`)
  return true
}

export async function syncCurrentLibraryToGitHub() {
  await ensureEditingToken()
  const library = await loadLibrary(false)
  await saveLibrary(library, loadedFromLegacy ? 'Migrate LinkVault library to GitHub' : 'Sync LinkVault library')
  return library
}

class TableQuery {
  private readonly table: TableName
  constructor(table: TableName) { this.table = table }
  select(_columns = '*') {
    return { order: async (_column: string): Promise<ApiResult<any[]>> => {
      try { const library = await loadLibrary(); return { data: [...library[this.table]], error: null } }
      catch (error) { return { data: null, error: error instanceof Error ? error : new Error(String(error)) } }
    }}
  }
  delete() {
    const result = async (): Promise<ApiResult> => ({ data: null, error: null })
    return { gte: (_column: string, _value: unknown) => result(), neq: (_column: string, _value: unknown) => result() }
  }
  async insert(items: unknown | unknown[]): Promise<ApiResult> {
    try {
      const desired = (Array.isArray(items) ? items : [items]) as Record<string, unknown>[]
      const current = await loadLibrary()
      const next: LibraryData = { ...current, [this.table]: desired, updatedAt: new Date().toISOString() }
      await saveLibrary(next)
      return { data: desired, error: null }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      // Existing App.tsx uses generic catch messages, so surface the real GitHub
      // reason here as well. This makes permission/token problems diagnosable.
      window.alert(err.message)
      return { data: null, error: err }
    }
  }
}

// Kept as `supabase` only as an internal compatibility name for App.tsx.
export const supabase = {
  from(table: string) {
    if (table !== 'websites' && table !== 'categories') throw new Error(`Unsupported table: ${table}`)
    return new TableQuery(table)
  },
}
