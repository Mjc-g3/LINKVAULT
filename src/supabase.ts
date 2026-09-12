const API_BASE = (
  import.meta.env.VITE_API_URL ||
  'https://debian.tail924747.ts.net:8443/api'
).replace(/\/$/, '')

type TableName = 'websites' | 'categories'

type ApiResult<T = unknown> = {
  data: T | null
  error: Error | null
}

const endpointFor = (table: TableName) => `${API_BASE}/${table}`

async function requestJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`

    try {
      const body = await response.json()
      if (body?.error) message = String(body.error)
    } catch {
      // Keep the HTTP status as the error message.
    }

    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

const itemKey = (table: TableName, item: Record<string, unknown>) =>
  table === 'websites' ? String(item.id) : String(item.name)

const itemUrl = (table: TableName, key: string) =>
  `${endpointFor(table)}/${encodeURIComponent(key)}`

async function syncTable(
  table: TableName,
  desiredItems: Record<string, unknown>[],
) {
  const existingItems = await requestJson<Record<string, unknown>[]>(
    endpointFor(table),
  )

  const existingByKey = new Map(
    existingItems.map((item) => [itemKey(table, item), item]),
  )
  const desiredByKey = new Map(
    desiredItems.map((item) => [itemKey(table, item), item]),
  )

  const operations: Promise<unknown>[] = []

  for (const [key] of existingByKey) {
    if (!desiredByKey.has(key)) {
      operations.push(
        requestJson(itemUrl(table, key), { method: 'DELETE' }),
      )
    }
  }

  for (const [key, desired] of desiredByKey) {
    const existing = existingByKey.get(key)

    if (!existing) {
      operations.push(
        requestJson(endpointFor(table), {
          method: 'POST',
          body: JSON.stringify(desired),
        }),
      )
      continue
    }

    if (JSON.stringify(existing) !== JSON.stringify(desired)) {
      operations.push(
        requestJson(itemUrl(table, key), {
          method: 'PUT',
          body: JSON.stringify(desired),
        }),
      )
    }
  }

  await Promise.all(operations)
}

class TableQuery {
  private readonly table: TableName

  constructor(table: TableName) {
    this.table = table
  }

  select(_columns = '*') {
    return {
      order: async (_column: string): Promise<ApiResult<any[]>> => {
        try {
          const data = await requestJson<any[]>(endpointFor(this.table))
          return { data, error: null }
        } catch (error) {
          return {
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
          }
        }
      },
    }
  }

  delete() {
    // App.tsx always follows this with a full insert of the desired state.
    // Deletion is therefore handled by syncTable() during insert().
    const result = async (): Promise<ApiResult> => ({ data: null, error: null })

    return {
      gte: (_column: string, _value: unknown) => result(),
      neq: (_column: string, _value: unknown) => result(),
    }
  }

  async insert(items: unknown | unknown[]): Promise<ApiResult> {
    try {
      const desired = (Array.isArray(items) ? items : [items]) as Record<
        string,
        unknown
      >[]

      await syncTable(this.table, desired)
      return { data: desired, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }
}

export const supabase = {
  from(table: string) {
    if (table !== 'websites' && table !== 'categories') {
      throw new Error(`Unsupported table: ${table}`)
    }

    return new TableQuery(table)
  },
}
