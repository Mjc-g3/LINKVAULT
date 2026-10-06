export type BackupData<
  TWebsite = unknown,
  TCategory = string,
> = {
  version: 1
  createdAt: string
  websites: TWebsite[]
  categories: TCategory[]
}

type ReadWritePermissionDescriptor = {
  mode: 'readwrite'
}

type BackupDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission: (
    options?: ReadWritePermissionDescriptor,
  ) => Promise<PermissionState>

  requestPermission: (
    options?: ReadWritePermissionDescriptor,
  ) => Promise<PermissionState>

  entries: () => AsyncIterableIterator<
    [string, FileSystemHandle]
  >
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string
    mode?: 'read' | 'readwrite'
    startIn?: FileSystemHandle | string
  }) => Promise<BackupDirectoryHandle>
}

const DB_NAME = 'powerful-backup-db'
const STORE_NAME = 'handles'
const DIRECTORY_KEY = 'backup-directory'

const AUTO_BACKUP_PREFIX = 'powerful-auto-backup-'
const MAX_AUTO_BACKUPS = 30

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

export async function saveBackupDirectory(
  handle: BackupDirectoryHandle,
) {
  const database = await openDatabase()

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      'readwrite',
    )

    const store = transaction.objectStore(STORE_NAME)

    store.put(handle, DIRECTORY_KEY)

    transaction.oncomplete = () => {
      database.close()
      resolve()
    }

    transaction.onerror = () => {
      database.close()
      reject(transaction.error)
    }
  })
}

export async function loadBackupDirectory(): Promise<
  BackupDirectoryHandle | null
> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      'readonly',
    )

    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(DIRECTORY_KEY)

    request.onsuccess = () => {
      database.close()
      resolve(
        (request.result as BackupDirectoryHandle | undefined) ??
          null,
      )
    }

    request.onerror = () => {
      database.close()
      reject(request.error)
    }
  })
}

export async function chooseBackupDirectory(): Promise<
  BackupDirectoryHandle
> {
  const pickerWindow = window as DirectoryPickerWindow

  if (!pickerWindow.showDirectoryPicker) {
    throw new Error(
      'Folder backups are not supported by this browser.',
    )
  }

  const handle = await pickerWindow.showDirectoryPicker({
    id: 'powerful-backups',
    mode: 'readwrite',
  })

  await saveBackupDirectory(handle)

  return handle
}

export async function hasWritePermission(
  handle: BackupDirectoryHandle,
): Promise<boolean> {
  try {
    const permission = await handle.queryPermission({
      mode: 'readwrite',
    })

    return permission === 'granted'
  } catch {
    return false
  }
}

export async function requestWritePermission(
  handle: BackupDirectoryHandle,
): Promise<boolean> {
  const currentPermission = await handle.queryPermission({
    mode: 'readwrite',
  })

  if (currentPermission === 'granted') {
    return true
  }

  const permission = await handle.requestPermission({
    mode: 'readwrite',
  })

  return permission === 'granted'
}

function formatFileDate(date: Date) {
  const pad = (value: number) =>
    String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    '-',
    pad(date.getMinutes()),
    '-',
    pad(date.getSeconds()),
  ].join('')
}

async function removeOldAutoBackups(
  directory: BackupDirectoryHandle,
) {
  const backupFiles: string[] = []

  for await (const [name, handle] of directory.entries()) {
    if (
      handle.kind === 'file' &&
      name.startsWith(AUTO_BACKUP_PREFIX) &&
      name.endsWith('.json')
    ) {
      backupFiles.push(name)
    }
  }

  backupFiles.sort().reverse()

  const filesToDelete = backupFiles.slice(MAX_AUTO_BACKUPS)

  for (const fileName of filesToDelete) {
    await directory.removeEntry(fileName)
  }
}

export async function writeBackupToFolder<TWebsite>(
  directory: BackupDirectoryHandle,
  data: BackupData<TWebsite>,
) {
  const now = new Date()

  const fileName =
    `${AUTO_BACKUP_PREFIX}${formatFileDate(now)}.json`

  const fileHandle = await directory.getFileHandle(
    fileName,
    {
      create: true,
    },
  )

  const writable = await fileHandle.createWritable()

  await writable.write(
    JSON.stringify(data, null, 2),
  )

  await writable.close()

  await removeOldAutoBackups(directory)

  return fileName
}

export function downloadBackup<
  TWebsite,
  TCategory,
>(
  data: BackupData<TWebsite, TCategory>,
) {
  const now = new Date()

  const fileName =
    `powerful-backup-${formatFileDate(now)}.json`

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    {
      type: 'application/json',
    },
  )

  const downloadUrl = URL.createObjectURL(blob)

  const anchor = document.createElement('a')

  anchor.href = downloadUrl
  anchor.download = fileName
  anchor.click()

  URL.revokeObjectURL(downloadUrl)
}

export function createBackupSignature(
  data: unknown,
) {
  const input = JSON.stringify(data)

  let hash = 0

  for (let index = 0; index < input.length; index += 1) {
    hash =
      (hash * 31 + input.charCodeAt(index)) | 0
  }

  return String(hash)
}

export type {
  BackupDirectoryHandle,
}