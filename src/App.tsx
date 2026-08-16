import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  type RefObject,
  type ChangeEvent,
} from 'react'
import './App.css'

import ShinyText from './ShinyText'
import BorderGlow from './BorderGlow'
import GradientWaves from './GradientWaves'
import Galaxy from './Galaxy'
import { supabase } from './supabase'

import { icons, Folder } from 'lucide-react'

import {
  downloadBackup,
  type BackupData,
} from './backup'

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'

import {
  SortableContext,
  arrayMove,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { CSS } from '@dnd-kit/utilities'


type Website = {
  id: number
  name: string
  url: string
  description: string
  category: string
  tags: string[]
  favorite: boolean
  order: number
}

type Category = {
  name: string
  icon: string
  parent: string | null
}

const getWebsiteHostname = (value: string) => {
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

type ClassificationRule = {
  keywords: string[]
  categoryHints: string[]
  tags: string[]
  defaultCategory: string
}

const classificationRules: ClassificationRule[] = [
  {
    keywords: ['plex', 'netflix', 'hulu', 'disneyplus', 'primevideo', 'streaming', 'movie', 'movies', 'television', 'watch', 'video'],
    categoryHints: ['streaming', 'movies', 'film', 'television', 'video', 'media', 'entertainment'],
    tags: ['streaming', 'movies', 'television', 'media'],
    defaultCategory: 'Entertainment',
  },
  {
    keywords: ['spotify', 'soundcloud', 'bandcamp', 'music', 'audio', 'radio', 'podcast'],
    categoryHints: ['music', 'audio', 'entertainment', 'media'],
    tags: ['music', 'audio', 'streaming'],
    defaultCategory: 'Music',
  },
  {
    keywords: ['github', 'gitlab', 'stackoverflow', 'npmjs', 'developer', 'programming', 'coding', 'repository', 'api'],
    categoryHints: ['development', 'developer', 'programming', 'coding', 'tools'],
    tags: ['development', 'programming', 'code', 'tools'],
    defaultCategory: 'Development',
  },
  {
    keywords: ['figma', 'canva', 'behance', 'dribbble', 'photoshop', 'design', 'font', 'fonts', 'icon', 'icons', 'color'],
    categoryHints: ['design', 'creative', 'graphics', 'resources'],
    tags: ['design', 'creative', 'graphics', 'resources'],
    defaultCategory: 'Design',
  },
  {
    keywords: ['ifixit', 'repair', 'teardown', 'manual', 'service-manual', 'parts-catalog'],
    categoryHints: ['repair', 'guides', 'reference', 'tools'],
    tags: ['repair', 'guide', 'parts', 'reference'],
    defaultCategory: 'Repair',
  },
  {
    keywords: ['bmw', 'audi', 'mercedes', 'volkswagen', 'toyota', 'nissan', 'automotive', 'vehicle', 'car', 'cars', 'parts'],
    categoryHints: ['automotive', 'cars', 'vehicles', 'parts'],
    tags: ['automotive', 'cars', 'parts'],
    defaultCategory: 'Automotive',
  },
  {
    keywords: ['steam', 'playstation', 'xbox', 'nintendo', 'gaming', 'game', 'games', 'modding'],
    categoryHints: ['gaming', 'games', 'entertainment'],
    tags: ['gaming', 'games'],
    defaultCategory: 'Gaming',
  },
  {
    keywords: ['amazon', 'ebay', 'etsy', 'aliexpress', 'shopping', 'shop', 'store', 'marketplace', 'deals'],
    categoryHints: ['shopping', 'stores', 'marketplace'],
    tags: ['shopping', 'store', 'marketplace'],
    defaultCategory: 'Shopping',
  },
  {
    keywords: ['wikipedia', 'archive', 'dictionary', 'reference', 'encyclopedia', 'documentation', 'docs'],
    categoryHints: ['reference', 'information', 'education', 'resources'],
    tags: ['reference', 'information'],
    defaultCategory: 'Reference',
  },
  {
    keywords: ['book', 'books', 'ebook', 'ebooks', 'pdf', 'library', 'reading'],
    categoryHints: ['books', 'reading', 'education', 'downloads'],
    tags: ['books', 'reading', 'pdf'],
    defaultCategory: 'Books',
  },
  {
    keywords: ['chatgpt', 'openai', 'claude', 'gemini', 'artificial-intelligence', 'machine-learning'],
    categoryHints: ['ai', 'artificial intelligence', 'tools'],
    tags: ['ai', 'tools', 'productivity'],
    defaultCategory: 'AI Tools',
  },
  {
    keywords: ['google-drive', 'dropbox', 'onedrive', 'cloud', 'storage', 'file-sharing', 'upload'],
    categoryHints: ['cloud', 'storage', 'files', 'tools'],
    tags: ['cloud', 'storage', 'files'],
    defaultCategory: 'Cloud Storage',
  },
  {
    keywords: ['torrent', 'usenet', 'nzb', 'download', 'downloads', 'magnet'],
    categoryHints: ['downloads', 'torrent', 'usenet', 'files'],
    tags: ['downloads', 'files'],
    defaultCategory: 'Downloads',
  },
  {
    keywords: ['reddit', 'facebook', 'instagram', 'tiktok', 'twitter', 'social', 'community', 'forum'],
    categoryHints: ['social', 'community', 'forums'],
    tags: ['social', 'community'],
    defaultCategory: 'Social',
  },
  {
    keywords: ['news', 'newspaper', 'magazine', 'journal', 'weather'],
    categoryHints: ['news', 'information'],
    tags: ['news', 'information'],
    defaultCategory: 'News',
  },
]

const normalizeClassificationText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const textContainsKeyword = (text: string, keyword: string) => {
  const normalizedKeyword = normalizeClassificationText(keyword)
  return ` ${text} `.includes(` ${normalizedKeyword} `)
}


type SortableWebsiteCardProps = {
  site: Website
  openMenuId: number | null
  setOpenMenuId: Dispatch<SetStateAction<number | null>>
  toggleFavorite: (id: number) => void
  openEditModal: (site: Website) => void
  deleteWebsite: (id: number) => void
  menuRef: RefObject<HTMLDivElement | null>
  animateGlow: boolean
}

function SortableWebsiteCard({
  site,
  openMenuId,
  setOpenMenuId,
  toggleFavorite,
  openEditModal,
  deleteWebsite,
  menuRef,
  animateGlow,
}: SortableWebsiteCardProps) {
const {
  attributes,
  listeners,
  setNodeRef,
  setActivatorNodeRef,
  transform,
  transition,
  isDragging,
} = useSortable({ id: site.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  }

  return (
    <article
  ref={setNodeRef}
  style={style}
  className="website-card-wrapper"
>
  <BorderGlow
    className="website-card"
    animated={animateGlow}
  >
    <div
      className="website-card-inner"
      onClick={() =>
        window.open(
          site.url,
          '_blank',
          'noopener,noreferrer',
        )
      }
    >
      <div className="card-top">
        <div
  ref={setActivatorNodeRef}
  className="drag-handle"
  {...attributes}
  {...listeners}
          onClick={(event) => event.stopPropagation()}
          title="Drag to reorder"
        >
          ⋮⋮
        </div>

        <img
          src={`https://www.google.com/s2/favicons?domain=${site.url}&sz=64`}
          alt=""
        />

        <div className="card-controls">
          <button
            className="favorite-button"
            onClick={(event) => {
              event.stopPropagation()
              toggleFavorite(site.id)
            }}
            title={
              site.favorite
                ? 'Remove from favorites'
                : 'Add to favorites'
            }
          >
            {site.favorite ? '★' : '☆'}
          </button>

          <div
            className="menu-wrapper"
            ref={openMenuId === site.id ? menuRef : null}
          >
            <button
              className="menu-button"
              title="More options"
              onClick={(event) => {
                event.stopPropagation()

                setOpenMenuId(
                  openMenuId === site.id ? null : site.id,
                )
              }}
            >
              ⋯
            </button>

            {openMenuId === site.id && (
              <div
                className="card-menu"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  onClick={() => {
                    window.open(
                      site.url,
                      '_blank',
                      'noopener,noreferrer',
                    )
                    setOpenMenuId(null)
                  }}
                >
                  Open website
                </button>

                <button
                  onClick={() => {
                    openEditModal(site)
                    setOpenMenuId(null)
                  }}
                >
                  Edit
                </button>

                <div className="menu-divider" />

                <button
                  className="delete-menu-item"
                  onClick={() => {
                    setOpenMenuId(null)
                    deleteWebsite(site.id)
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <h2>{site.name}</h2>

      <p>{site.description || 'No description provided.'}</p>

      <div className="badges">
  ...
</div>

    </div>
  </BorderGlow>
</article>
  )
}

type SortableCategoryProps = {
  item: Category
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  openCategoryMenu: string | null
  setOpenCategoryMenu: Dispatch<SetStateAction<string | null>>
  renameCategory: (category: string) => void
  deleteCategory: (category: string) => void
  categoryMenuRef: RefObject<HTMLDivElement | null>
}

function SortableCategory({
  item,
  selectedCategory,
  setSelectedCategory,
  openCategoryMenu,
  setOpenCategoryMenu,
  renameCategory,
  deleteCategory,
  categoryMenuRef,
}: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `category-${item.name}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="category-row"
    >
      <div
        ref={setActivatorNodeRef}
        className="category-drag-handle"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
      >
        ⋮⋮
      </div>

      <button
  className={
    selectedCategory === item.name
      ? 'category-select active'
      : 'category-select'
  }
  onClick={() => setSelectedCategory(item.name)}
>
  {(() => {
    const Icon =
  iconOptions[item.icon as keyof typeof iconOptions] ?? Folder

    return (
      <>
        <Icon
          className="category-icon"
          size={17}
          strokeWidth={1.8}
        />

        <span>{item.name}</span>
      </>
    )
  })()}
</button>

      <div
        className="category-menu-wrapper"
        ref={
          openCategoryMenu === item.name
            ? categoryMenuRef
            : null
        }
      >
        <button
          className="category-more-button"
          title="Category options"
          onClick={(event) => {
            event.stopPropagation()

            setOpenCategoryMenu(
              openCategoryMenu === item.name
              ? null
  : item.name
            )
          }}
        >
          ⋯
        </button>

        {openCategoryMenu === item.name && (
  <div className="category-menu">
    <button
      onClick={() => renameCategory(item.name)}
    >
      Edit category
    </button>

    <div className="menu-divider" />

    <button
      className="delete-menu-item"
      onClick={() => deleteCategory(item.name)}
    >
      Delete
    </button>
  </div>
)}
      </div>
    </div>
  )
}

const iconOptions = icons

function App() {
  const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  }),
)


  const [websites, setWebsites] = useState<Website[]>([])

  const [categories, setCategories] = useState<Category[]>([])
  const [libraryLoaded, setLibraryLoaded] = useState(false)

  const categoryRows = (items: Category[]) =>
    items.map((item, index) => ({
      name: item.name,
      icon: item.icon,
      parent: item.parent,
      order: index,
    }))

  const replaceWebsites = async (items: Website[]) => {
    const { error: deleteError } = await supabase
      .from('websites')
      .delete()
      .gte('id', 0)

    if (deleteError) throw deleteError

    if (items.length > 0) {
      const { error: insertError } = await supabase
        .from('websites')
        .insert(items)

      if (insertError) throw insertError
    }
  }

  const replaceCategories = async (items: Category[]) => {
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .neq('name', '')

    if (deleteError) throw deleteError

    if (items.length > 0) {
      const { error: insertError } = await supabase
        .from('categories')
        .insert(categoryRows(items))

      if (insertError) throw insertError
    }
  }

  const replaceLibrary = async (
    nextWebsites: Website[],
    nextCategories: Category[],
  ) => {
    await replaceWebsites(nextWebsites)
    await replaceCategories(nextCategories)
  }

  useEffect(() => {
    let cancelled = false

    const loadLibrary = async () => {
      try {
        const [websiteResult, categoryResult] = await Promise.all([
          supabase.from('websites').select('*').order('order'),
          supabase.from('categories').select('*').order('order'),
        ])

        if (websiteResult.error) throw websiteResult.error
        if (categoryResult.error) throw categoryResult.error
        if (cancelled) return

        const loadedWebsites = (websiteResult.data ?? []).map(
          (site, index) => ({
            id: Number(site.id),
            name: String(site.name ?? ''),
            url: String(site.url ?? ''),
            description: String(site.description ?? ''),
            category: String(site.category ?? 'Uncategorized'),
            tags: Array.isArray(site.tags) ? site.tags.map(String) : [],
            favorite: Boolean(site.favorite),
            order: Number(site.order ?? index),
          }),
        )

        const loadedCategories = (categoryResult.data ?? []).map(
          (item) => ({
            name: String(item.name ?? ''),
            icon: String(item.icon ?? 'Folder'),
            parent: typeof item.parent === 'string' ? item.parent : null,
          }),
        )

        setWebsites(loadedWebsites)
        setCategories(loadedCategories)
      } catch (error) {
        console.error('Could not load Supabase library:', error)
        alert(
          'Could not load your online library from Supabase. Check the browser console for details.',
        )
      } finally {
        if (!cancelled) setLibraryLoaded(true)
      }
    }

    void loadLibrary()

    return () => {
      cancelled = true
    }
  }, [])

const importBackupRef =
  useRef<HTMLInputElement | null>(null)

  const [search, setSearch] = useState('')
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const mainScrollRef = useRef<HTMLElement | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [backgroundEffect, setBackgroundEffect] = useState<'galaxy' | 'waves'>(
    () =>
      window.localStorage.getItem('website-library-background') === 'waves'
        ? 'waves'
        : 'galaxy',
  )
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [openCategoryMenu, setOpenCategoryMenu] = useState<string | null>(null)
const categoryMenuRef = useRef<HTMLDivElement | null>(null)
const [showCategoryModal, setShowCategoryModal] =
  useState(false)

const [
  editingCategoryName,
  setEditingCategoryName,
] = useState<string | null>(null)

const [
  categoryNameInput,
  setCategoryNameInput,
] = useState('')

const [
  categoryIconInput,
  setCategoryIconInput,
] = useState('Folder')
const [
  categoryParentInput,
  setCategoryParentInput,
] = useState<string | null>(null)
  const [iconSearch, setIconSearch] = useState('')
  const filteredIconEntries = Object.entries(iconOptions).filter(
  ([iconName]) =>
    iconName
      .toLowerCase()
      .includes(iconSearch.trim().toLowerCase()),
)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Tools')
  const [tags, setTags] = useState('')
  const [autoSort, setAutoSort] = useState(true)

  useEffect(() => {
  const handleOutsideClick = (event: MouseEvent) => {
    if (
      openMenuId !== null &&
      menuRef.current &&
      !menuRef.current.contains(event.target as Node)
    ) {
      setOpenMenuId(null)
    }
  }

  document.addEventListener('mousedown', handleOutsideClick)

  return () => {
    document.removeEventListener('mousedown', handleOutsideClick)
  }
}, [openMenuId])

useEffect(() => {
  const handleOutsideClick = (event: MouseEvent) => {
    if (
      openCategoryMenu !== null &&
      categoryMenuRef.current &&
      !categoryMenuRef.current.contains(event.target as Node)
    ) {
      setOpenCategoryMenu(null)
    }
  }

  document.addEventListener('mousedown', handleOutsideClick)

  return () => {
    document.removeEventListener('mousedown', handleOutsideClick)
  }
}, [openCategoryMenu])

const getCategoryAndChildren = (
  categoryName: string,
) => {
  const names = [categoryName]

  categories
    .filter(
      (item) =>
        item.parent === categoryName,
    )
    .forEach((item) => {
      names.push(item.name)
    })

  return names
}

  const filteredWebsites = websites.filter((site) => {
    const searchText = search.toLowerCase().trim()

    const selectedCategoryNames =
  selectedCategory === 'All' ||
  selectedCategory === 'Favorites'
    ? []
    : getCategoryAndChildren(
        selectedCategory,
      )

const matchesCategory =
  selectedCategory === 'All' ||
  selectedCategory === 'Favorites' ||
  selectedCategoryNames.includes(
    site.category,
  )

    const matchesFavorite =
      selectedCategory !== 'Favorites' || site.favorite

    const matchesSearch =
      !searchText ||
      site.name.toLowerCase().includes(searchText) ||
      site.description.toLowerCase().includes(searchText) ||
      site.url.toLowerCase().includes(searchText) ||
      site.category.toLowerCase().includes(searchText) ||
      site.tags.some((tag) => tag.toLowerCase().includes(searchText))

    return matchesCategory && matchesFavorite && matchesSearch
}).sort((a, b) => a.order - b.order)

const usedTags = Array.from(
  new Set(
    websites.flatMap((site) => site.tags),
  ),
).sort()

const currentTagInput =
  tags.split(',').pop()?.trim().toLowerCase() ?? ''

const tagSuggestions = usedTags
  .filter((tag) => {
    if (!currentTagInput) return false

    const alreadySelected = tags
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .includes(tag.toLowerCase())

    return (
      !alreadySelected &&
      tag.toLowerCase().startsWith(currentTagInput)
    )
  })
  .slice(0, 6)

  const selectTagSuggestion = (suggestedTag: string) => {
  const parts = tags.split(',')

  parts[parts.length - 1] = suggestedTag

  const newTags =
    parts
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ') + ', '

  setTags(newTags)
}

const createCategory = () => {
  setEditingCategoryName(null)
  setCategoryNameInput('')
  setCategoryIconInput('Folder')
  setCategoryParentInput(null)
  setIconSearch('')
  setShowCategoryModal(true)
}

const renameCategory = (
  oldName: string,
) => {
  const existing =
    categories.find(
      (item) =>
        item.name === oldName,
    )

  if (!existing) return

  setEditingCategoryName(oldName)
  setCategoryNameInput(
    existing.name,
  )
  setCategoryIconInput(
    existing.icon,
  )
  setCategoryParentInput(
  existing.parent ?? null,
)
  setIconSearch('')
  setOpenCategoryMenu(null)
  setShowCategoryModal(true)
}

const saveCategory = async () => {
  const cleanName = categoryNameInput.trim()

  if (!cleanName) {
    alert('Please enter a category name.')
    return
  }

  const alreadyExists = categories.some(
    (item) =>
      item.name.toLowerCase() === cleanName.toLowerCase() &&
      item.name !== editingCategoryName,
  )

  if (alreadyExists) {
    alert('That category already exists.')
    return
  }

  let nextCategories: Category[]
  let nextWebsites = websites

  if (editingCategoryName) {
    nextCategories = categories.map((item) => {
      if (item.name === editingCategoryName) {
        return {
          name: cleanName,
          icon: categoryIconInput,
          parent: categoryParentInput,
        }
      }

      if (item.parent === editingCategoryName) {
        return { ...item, parent: cleanName }
      }

      return item
    })

    nextWebsites = websites.map((site) =>
      site.category === editingCategoryName
        ? { ...site, category: cleanName }
        : site,
    )
  } else {
    nextCategories = [
      ...categories,
      {
        name: cleanName,
        icon: categoryIconInput,
        parent: categoryParentInput,
      },
    ]
  }

  try {
    if (editingCategoryName) {
      await replaceLibrary(nextWebsites, nextCategories)
    } else {
      await replaceCategories(nextCategories)
    }

    setCategories(nextCategories)
    setWebsites(nextWebsites)

    if (selectedCategory === editingCategoryName) {
      setSelectedCategory(cleanName)
    }

    setShowCategoryModal(false)
    setEditingCategoryName(null)
    setCategoryNameInput('')
    setCategoryIconInput('Folder')
    setCategoryParentInput(null)
  } catch (error) {
    console.error(error)
    alert('The category could not be saved to Supabase.')
  }
}

const deleteCategory = async (categoryName: string) => {
  const websitesInCategory = websites.filter(
    (site) => site.category === categoryName,
  )

  if (websitesInCategory.length > 0) {
    const shouldDelete = window.confirm(
      `"${categoryName}" contains ${websitesInCategory.length} website(s).\n\nDeleting the category will move them to "Uncategorized".`,
    )

    if (!shouldDelete) return
  } else {
    const shouldDelete = window.confirm(
      `Delete the "${categoryName}" category?`,
    )

    if (!shouldDelete) return
  }

  let nextWebsites = websites
  let nextCategories = categories
    .filter((item) => item.name !== categoryName)
    .map((item) =>
      item.parent === categoryName ? { ...item, parent: null } : item,
    )

  if (websitesInCategory.length > 0) {
    nextWebsites = websites.map((site) =>
      site.category === categoryName
        ? { ...site, category: 'Uncategorized' }
        : site,
    )

    if (!nextCategories.some((item) => item.name === 'Uncategorized')) {
      nextCategories = [
        ...nextCategories,
        { name: 'Uncategorized', icon: 'Folder', parent: null },
      ]
    }
  }

  try {
    await replaceLibrary(nextWebsites, nextCategories)
    setWebsites(nextWebsites)
    setCategories(nextCategories)

    if (selectedCategory === categoryName) {
      setSelectedCategory(
        websitesInCategory.length > 0 ? 'Uncategorized' : 'All',
      )
    }

    setOpenCategoryMenu(null)
  } catch (error) {
    console.error(error)
    alert('The category could not be deleted from Supabase.')
  }
}

const getBackupData = (): BackupData<
  Website,
  Category
> => ({
  version: 1,
  createdAt: new Date().toISOString(),
  websites,
  categories,
})

const handleExportBackup = () => {
  downloadBackup(getBackupData())
}

const handleImportBackup = async (
  event: ChangeEvent<HTMLInputElement>,
) => {
  const file = event.target.files?.[0]

  if (!file) return

  try {
    const text = await file.text()
    const backup = JSON.parse(text)

    if (
      !backup ||
      backup.version !== 1 ||
      !Array.isArray(backup.websites) ||
      !Array.isArray(backup.categories)
    ) {
      alert('This is not a valid Powerful backup.')
      return
    }

    const restoredWebsites: Website[] =
      backup.websites.map(
        (site: Website, index: number) => ({
          ...site,
          tags: site.tags ?? [],
          favorite: site.favorite ?? false,
          order: site.order ?? index,
        }),
      )

   const restoredCategories: Category[] =
  backup.categories
    .map((item: unknown) => {
      if (typeof item === 'string') {
        return {
  name: item,
  icon: 'Folder',
  parent: null,
}
      }

      if (
        typeof item === 'object' &&
        item !== null &&
        'name' in item
      ) {
        const category = item as {
  name: unknown
  icon?: unknown
  parent?: unknown
}

        if (typeof category.name !== 'string') {
          return null
        }

        return {
  name: category.name,
  icon:
    typeof category.icon === 'string'
      ? category.icon
      : 'Folder',
  parent:
    typeof category.parent === 'string'
      ? category.parent
      : null,
}
      }

      return null
    })
.filter(
  (item: Category | null): item is Category =>
    item !== null,
)

    const shouldRestore =
      window.confirm(
        `Restore backup from ${file.name}?\n\nThis will replace your current library.`,
      )

    if (!shouldRestore) return

    await replaceLibrary(restoredWebsites, restoredCategories)

    setWebsites(restoredWebsites)
    setCategories(restoredCategories)
    setSelectedCategory('All')

    alert('Backup imported to Supabase successfully.')
  } catch (error) {
    console.error(error)

    alert(
      'The backup could not be imported.',
    )
  } finally {
    event.target.value = ''
  }
}

  const resetForm = () => {
    setName('')
    setUrl('')
    setDescription('')
    setCategory(
  categories[0]?.name ?? '',
)
    setTags('')
    setAutoSort(true)
    setEditingId(null)
  }

  const openAddModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (site: Website) => {
    setEditingId(site.id)
    setName(site.name)
    setUrl(site.url)
    setDescription(site.description)
    setCategory(site.category)
    setTags(site.tags.join(', '))
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    resetForm()
  }

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim()

    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://')
    ) {
      return trimmed
    }

    return `https://${trimmed}`
  }

  const getAutomaticOrganization = (value: string) => {
    const hostname = getWebsiteHostname(value)

    if (!hostname) {
      return {
        category: 'Uncategorized',
        tags: [] as string[],
        matchedSites: 0,
        method: 'fallback' as const,
      }
    }

    const domainMatches = websites.filter(
      (site) =>
        site.id !== editingId &&
        getWebsiteHostname(site.url) === hostname,
    )

    const classifiedDomainMatches = domainMatches.filter(
      (site) =>
        site.category !== 'Uncategorized' ||
        site.tags.length > 0,
    )

    if (classifiedDomainMatches.length === 0) {
      return {
        ...getContentBasedOrganization(hostname),
        matchedSites: 0,
      }
    }

    const categoryCounts = new Map<string, number>()
    const tagCounts = new Map<string, number>()

    classifiedDomainMatches.forEach((site) => {
      categoryCounts.set(
        site.category,
        (categoryCounts.get(site.category) ?? 0) + 1,
      )

      site.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
      })
    })

    const inferredCategory = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Uncategorized'

    const inferredTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .map(([tag]) => tag)

    return {
      category: inferredCategory,
      tags: inferredTags,
      matchedSites: classifiedDomainMatches.length,
      method: 'domain' as const,
    }
  }

  const getContentBasedOrganization = (hostname: string) => {
    const domainText = normalizeClassificationText(hostname)
    const nameText = normalizeClassificationText(name)
    const urlText = normalizeClassificationText(url)
    const descriptionText = normalizeClassificationText(description)

    const scoredRules = classificationRules
      .map((rule) => ({
        rule,
        score: rule.keywords.reduce((score, keyword) => {
          if (textContainsKeyword(domainText, keyword)) score += 5
          if (textContainsKeyword(nameText, keyword)) score += 4
          if (textContainsKeyword(urlText, keyword)) score += 2
          if (textContainsKeyword(descriptionText, keyword)) score += 2
          return score
        }, 0),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)

    if (scoredRules.length === 0) {
      return {
        category: 'Uncategorized',
        tags: [] as string[],
        method: 'fallback' as const,
      }
    }

    const strongestRules = scoredRules
      .filter((item) => item.score >= scoredRules[0].score * 0.6)
      .slice(0, 2)

    const generatedTags = Array.from(
      new Set(strongestRules.flatMap((item) => item.rule.tags)),
    ).slice(0, 6)

    const categoryScores = categories
      .filter((item) => item.name !== 'Uncategorized')
      .map((item) => {
        const parentName = item.parent ?? ''
        const categoryText = normalizeClassificationText(
          `${item.name} ${parentName}`,
        )

        let score = 0

        strongestRules.forEach(({ rule, score: ruleScore }) => {
          rule.categoryHints.forEach((hint) => {
            const normalizedHint = normalizeClassificationText(hint)
            if (
              categoryText.includes(normalizedHint) ||
              normalizedHint.includes(categoryText)
            ) {
              score += 8 + ruleScore
            }
          })

          rule.tags.forEach((tag) => {
            if (categoryText.includes(normalizeClassificationText(tag))) {
              score += 4
            }
          })
        })

        websites.forEach((site) => {
          const sharedTags = site.tags.filter((tag) =>
            generatedTags.some(
              (generatedTag) =>
                generatedTag.toLowerCase() === tag.toLowerCase(),
            ),
          ).length

          if (site.category === item.name) score += sharedTags * 3
        })

        return { name: item.name, score }
      })
      .sort((a, b) => b.score - a.score)

    const bestCategory = categoryScores[0]

    return {
      category:
        bestCategory && bestCategory.score > 0
          ? bestCategory.name
          : strongestRules[0].rule.defaultCategory,
      tags: generatedTags,
      method: 'content' as const,
    }
  }

  const automaticOrganization = getAutomaticOrganization(url)

  const saveWebsite = async () => {
    if (!name.trim()) {
      alert('Please enter a website name.')
      return
    }

    if (!url.trim()) {
      alert('Please enter a website URL.')
      return
    }

    if (!(editingId === null && autoSort) && !category.trim()) {
      alert('Please enter a category.')
      return
    }

    const normalizedUrl = normalizeUrl(url)

    try {
      new URL(normalizedUrl)
    } catch {
      alert('Please enter a valid website URL.')
      return
    }

    const manuallyEnteredTags = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    const shouldAutoSort = editingId === null && autoSort
    const cleanCategory = shouldAutoSort
      ? automaticOrganization.category
      : category.trim()
    const parsedTags = Array.from(
      new Set([
        ...(shouldAutoSort ? automaticOrganization.tags : []),
        ...manuallyEnteredTags,
      ]),
    )
    const categoryExists = categories.some(
      (item) => item.name.toLowerCase() === cleanCategory.toLowerCase(),
    )

    const nextCategories = categoryExists
      ? categories
      : [
          ...categories,
          { name: cleanCategory, icon: 'Folder', parent: null },
        ]

    let nextWebsites: Website[]

    if (editingId !== null) {
      nextWebsites = websites.map((site) =>
        site.id === editingId
          ? {
              ...site,
              name: name.trim(),
              url: normalizedUrl,
              description: description.trim(),
              category: cleanCategory,
              tags: parsedTags,
            }
          : site,
      )
    } else {
      const newWebsite: Website = {
        id: Date.now(),
        name: name.trim(),
        url: normalizedUrl,
        description: description.trim(),
        category: cleanCategory,
        tags: parsedTags,
        favorite: false,
        order: websites.length,
      }

      nextWebsites = [...websites, newWebsite]
    }

    try {
      if (!categoryExists) {
        await replaceCategories(nextCategories)
      }
      await replaceWebsites(nextWebsites)

      setCategories(nextCategories)
      setWebsites(nextWebsites)
      closeModal()
    } catch (error) {
      console.error(error)
      alert('The website could not be saved to Supabase.')
    }
  }

const handleCategoryDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event

  if (!over || active.id === over.id) return

  const oldCategory = String(active.id).replace('category-', '')
  const newCategory = String(over.id).replace('category-', '')
  const oldIndex = categories.findIndex((item) => item.name === oldCategory)
  const newIndex = categories.findIndex((item) => item.name === newCategory)

  if (oldIndex === -1 || newIndex === -1) return

  const nextCategories = arrayMove(categories, oldIndex, newIndex)

  try {
    await replaceCategories(nextCategories)
    setCategories(nextCategories)
  } catch (error) {
    console.error(error)
    alert('The category order could not be saved to Supabase.')
  }
}

const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event

  if (!over || active.id === over.id) return

  const sorted = [...websites].sort((a, b) => a.order - b.order)
  const oldIndex = sorted.findIndex((site) => site.id === active.id)
  const newIndex = sorted.findIndex((site) => site.id === over.id)

  if (oldIndex === -1 || newIndex === -1) return

  const nextWebsites = arrayMove(sorted, oldIndex, newIndex).map(
    (site, index) => ({ ...site, order: index }),
  )

  try {
    await replaceWebsites(nextWebsites)
    setWebsites(nextWebsites)
  } catch (error) {
    console.error(error)
    alert('The website order could not be saved to Supabase.')
  }
}

const toggleFavorite = async (id: number) => {
  const nextWebsites = websites.map((site) =>
    site.id === id ? { ...site, favorite: !site.favorite } : site,
  )

  try {
    await replaceWebsites(nextWebsites)
    setWebsites(nextWebsites)
  } catch (error) {
    console.error(error)
    alert('The favorite could not be saved to Supabase.')
  }
}

const deleteWebsite = async (id: number) => {
  const site = websites.find((website) => website.id === id)

  if (!site) return

  const shouldDelete = window.confirm(
    `Delete "${site.name}" from your library?`,
  )

  if (!shouldDelete) return

  const nextWebsites = websites
    .filter((website) => website.id !== id)
    .sort((a, b) => a.order - b.order)
    .map((website, index) => ({ ...website, order: index }))

  try {
    await replaceWebsites(nextWebsites)
    setWebsites(nextWebsites)
  } catch (error) {
    console.error(error)
    alert('The website could not be deleted from Supabase.')
  }
}

const rootCategories = categories.filter(
  (item) => item.parent === null,
)

const getChildCategories = (
  parentName: string,
) =>
  categories.filter(
    (item) =>
      item.parent === parentName,
  )

const selectCategory = (categoryName: string) => {
  setSelectedCategory(categoryName)
  setMobileNavigationOpen(false)
}

useEffect(() => {
  mainScrollRef.current?.scrollTo({
    top: 0,
    behavior: 'auto',
  })
}, [selectedCategory])

useEffect(() => {
  window.localStorage.setItem(
    'website-library-background',
    backgroundEffect,
  )
}, [backgroundEffect])

  
if (!libraryLoaded) {
  return <div className="app"><div className="app-background" /></div>
}

return (
  <div className="app">
    <div className="app-background">
  {backgroundEffect === 'galaxy' ? (
    <Galaxy
      mouseRepulsion={false}
      mouseInteraction
      density={0.8}
      glowIntensity={0.2}
      saturation={0.2}
      hueShift={140}
      twinkleIntensity={0.3}
      rotationSpeed={0.1}
      repulsionStrength={0}
      autoCenterRepulsion={0}
      starSpeed={1.3}
      speed={0.2}
    />
  ) : (
  <GradientWaves
    horizonColor="#2731ff"
    waveColor="#6268a5"
    crestColor="#FFFFFF"
    speed={0.7}
    amplitude={2.5}
    waveScale={0.6}
    waveRatio={1.1}
    swell={20.5}
    turbulence={20}
    tilt={1.11}
    zoom={0.65}
    height={6.4}
    fogDepth={16}
    detail="medium"
    brightness={1}
    opacity={1}
    mouseInteraction={true}
    parallaxStrength={12}
    grain
    grainIntensity={0.05}
  />
  )}
</div>

    <aside className={mobileNavigationOpen ? 'sidebar mobile-open' : 'sidebar'}>
      <div className="sidebar-header">
        <div className="logo">
  <ShinyText
    text="Website Library"
    speed={4}
  />
</div>

        <button
          className="mobile-menu-button"
          type="button"
          aria-expanded={mobileNavigationOpen}
          aria-controls="sidebar-navigation"
          onClick={() => setMobileNavigationOpen((isOpen) => !isOpen)}
        >
          <span className="mobile-menu-icon" aria-hidden="true" />
          <span>{mobileNavigationOpen ? 'Close' : 'Browse'}</span>
        </button>
      </div>

      <div className="sidebar-content" id="sidebar-navigation">

        <nav className="nav">
          <button
            className={selectedCategory === 'All' ? 'active' : ''}
            onClick={() => selectCategory('All')}
          >
            Library
          </button>

          <button
            className={
              selectedCategory === 'Favorites' ? 'active' : ''
            }
            onClick={() => selectCategory('Favorites')}
          >
            Favorites
          </button>
        </nav>

        <div className="sidebar-section">
  <div className="sidebar-section-heading">
    <p>Categories</p>

    <button
      className="add-category-button"
      onClick={createCategory}
      title="Add category"
    >
      +
    </button>
  </div>

  <DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleCategoryDragEnd}
>
  <SortableContext
    items={categories.map(
  (item) =>
    `category-${item.name}`,
)}
    strategy={verticalListSortingStrategy}
  >
    <div className="category-list">
      {rootCategories.map((item) => {
  const children =
    getChildCategories(item.name)

  return (
    <div
      className="category-group"
      key={item.name}
    >
      <SortableCategory
        item={item}
        selectedCategory={selectedCategory}
        setSelectedCategory={selectCategory}
        openCategoryMenu={openCategoryMenu}
        setOpenCategoryMenu={setOpenCategoryMenu}
        renameCategory={renameCategory}
        deleteCategory={deleteCategory}
        categoryMenuRef={categoryMenuRef}
      />

      {children.length > 0 && (
        <div className="subcategory-list">
          {children.map((child) => (
            <SortableCategory
              key={child.name}
              item={child}
              selectedCategory={
                selectedCategory
              }
              setSelectedCategory={
                selectCategory
              }
              openCategoryMenu={
                openCategoryMenu
              }
              setOpenCategoryMenu={
                setOpenCategoryMenu
              }
              renameCategory={
                renameCategory
              }
              deleteCategory={
                deleteCategory
              }
              categoryMenuRef={
                categoryMenuRef
              }
            />
          ))}
        </div>
      )}
    </div>
  )
})}

      
    </div>
    
  </SortableContext>
</DndContext>
</div>


<div className="backup-section">
  <p className="backup-heading">
    Backup
  </p>

  <button
    className="backup-button"
    onClick={handleExportBackup}
  >
    Export Backup
  </button>

  <button
    className="backup-button"
    onClick={() =>
      importBackupRef.current?.click()
    }
  >
    Import Backup
  </button>

  <input
    ref={importBackupRef}
    className="backup-file-input"
    type="file"
    accept=".json,application/json"
    onChange={handleImportBackup}
  />
</div>

<div className="background-section">
  <p className="backup-heading">Background</p>
  <div className="background-options" role="group" aria-label="Background effect">
    <button
      className={backgroundEffect === 'galaxy' ? 'active' : ''}
      onClick={() => setBackgroundEffect('galaxy')}
    >
      Galaxy
    </button>
    <button
      className={backgroundEffect === 'waves' ? 'active' : ''}
      onClick={() => setBackgroundEffect('waves')}
    >
      Waves
    </button>
  </div>
</div>

      </div>
    </aside>

      <main
        className="main"
        ref={mainScrollRef}
        onScroll={(event) =>
          setShowBackToTop(event.currentTarget.scrollTop > 260)
        }
      >
        <header className="topbar">
          <BorderGlow
            className="search-glow"
            borderRadius={10}
            glowRadius={22}
            glowIntensity={0.65}
            fillOpacity={0.16}
            followNearestEdge
            fullStrengthOnHover
          >
            <input
              type="text"
              placeholder="Search websites, tags, categories..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </BorderGlow>

          <button
            className="add-button"
            onClick={openAddModal}
          >
            + Add Website
          </button>
        </header>

        <section className="content">
          <div className="content-heading">
            <div>
              <h1>
                {selectedCategory === 'Favorites'
                  ? 'Favorites'
                  : selectedCategory === 'All'
                    ? 'All Websites'
                    : selectedCategory}
              </h1>

              <p>{filteredWebsites.length} websites</p>
            </div>
          </div>

          <DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={filteredWebsites.map((site) => site.id)}
    strategy={rectSortingStrategy}
  >
    <div className="website-grid">
      {filteredWebsites.map((site) => (
        <SortableWebsiteCard
          key={site.id}
          site={site}
          openMenuId={openMenuId}
          setOpenMenuId={setOpenMenuId}
          toggleFavorite={toggleFavorite}
          openEditModal={openEditModal}
          deleteWebsite={deleteWebsite}
          menuRef={menuRef}
          animateGlow={selectedCategory === 'Favorites'}
        />
      ))}
    </div>
  </SortableContext>
</DndContext>
          {filteredWebsites.length === 0 && (
            <div className="empty-state">
              <h2>No websites found</h2>
              <p>
                Try another search or add a website to this
                category.
              </p>
            </div>
          )}
        </section>

        <button
          className={showBackToTop ? 'back-to-top visible' : 'back-to-top'}
          onClick={() =>
            mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
          }
          aria-label="Back to top"
          title="Back to top"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 19V5M6 11l6-6 6 6" />
          </svg>
        </button>
      </main>

      {showModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal()
            }
          }}
        >
          <div className="modal">
            <h2>
              {editingId !== null
                ? 'Edit Website'
                : 'Add Website'}
            </h2>

            <label>
              Name
              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="GitHub"
                autoFocus
              />
            </label>

            <label>
              URL
              <input
                value={url}
                onChange={(event) =>
                  setUrl(event.target.value)
                }
                placeholder="github.com"
              />
            </label>

            {editingId === null && (
              <label className="auto-sort-field">
                <span className="auto-sort-toggle">
                  <span>Automatically sort this website</span>

                  <span className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={autoSort}
                      onChange={(event) => setAutoSort(event.target.checked)}
                      aria-label="Automatically sort this website"
                    />
                    <span className="toggle-slider" aria-hidden="true" />
                  </span>
                </span>

                {autoSort && (
                  <span className="field-hint auto-sort-result">
                    {automaticOrganization.method === 'domain'
                      ? `Learned from ${automaticOrganization.matchedSites} saved site(s): ${automaticOrganization.category}${automaticOrganization.tags.length > 0 ? ` · ${automaticOrganization.tags.join(', ')}` : ''}`
                      : automaticOrganization.method === 'content'
                        ? `Detected from the website details: ${automaticOrganization.category}${automaticOrganization.tags.length > 0 ? ` · ${automaticOrganization.tags.join(', ')}` : ''}`
                        : 'No reliable match: this website will be saved in Uncategorized.'}
                  </span>
                )}
              </label>
            )}

            <label>
              Description
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="What is this website useful for?"
              />
            </label>

            <label>
  Category

  <select
    value={
      editingId === null && autoSort
        ? automaticOrganization.category
        : category
    }
    disabled={editingId === null && autoSort}
    onChange={(event) =>
      setCategory(event.target.value)
    }
  >
  {!categories.some((item) => item.name === 'Uncategorized') && (
    <option value="Uncategorized">Uncategorized</option>
  )}
  {rootCategories.map((item) => (
  <Fragment key={item.name}>
    <option value={item.name}>
      {item.name}
    </option>

    {getChildCategories(item.name).map(
      (child) => (
        <option
          value={child.name}
          key={child.name}
        >
          {'↳ '}{child.name}
        </option>
      ),
    )}
  </Fragment>
))}
  </select>
</label>

            <label className="tags-field">
  Tags

  <div className="tag-input-wrapper">
    <input
      value={tags}
      onChange={(event) =>
        setTags(event.target.value)
      }
      placeholder="bmw, parts, reference"
      autoComplete="off"
    />

    {tagSuggestions.length > 0 && (
  <div className="tag-suggestions">
    {tagSuggestions.map((tag) => (
      <button
        type="button"
        key={tag}
        onMouseDown={(event) => {
          event.preventDefault()
          selectTagSuggestion(tag)
        }}
      >
        #{tag}
      </button>
    ))}
  </div>
)}
  </div>

  <span className="field-hint">
    Separate tags with commas.
  </span>
</label>

            <div className="modal-actions">
              <button onClick={closeModal}>
                Cancel
              </button>

              <button
                className="primary"
                onClick={saveWebsite}
              >
                {editingId !== null
                  ? 'Save Changes'
                  : 'Add Website'}
              </button>
            </div>
          </div>
        </div>
      )}

          {showCategoryModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCategoryModal(false)
            }
          }}
        >
          <div className="modal category-modal">
            <h2>
              {editingCategoryName
                ? 'Edit Category'
                : 'Create Category'}
            </h2>

            <label>
              Name

              <input
                value={categoryNameInput}
                onChange={(event) =>
                  setCategoryNameInput(event.target.value)
                }
                placeholder="Gaming"
                autoFocus
              />
            </label>
<label>
  Parent Category

  <select
    value={categoryParentInput ?? ''}
    onChange={(event) =>
      setCategoryParentInput(
        event.target.value || null,
      )
    }
  >
    <option value="">
      None — Top Level
    </option>

    {categories
      .filter(
        (item) =>
          item.parent === null &&
          item.name !== editingCategoryName,
      )
      .map((item) => (
        <option
          key={item.name}
          value={item.name}
        >
          {item.name}
        </option>
      ))}
  </select>

  <span className="field-hint">
    Select a parent to make this a sub-category.
  </span>
</label>
            <div className="category-icon-section">
  <span className="category-icon-label">
    Icon
  </span>

  <input
    className="icon-search-input"
    type="text"
    value={iconSearch}
    onChange={(event) =>
      setIconSearch(event.target.value)
    }
    placeholder="Search icons..."
    autoComplete="off"
  />

<div className="icon-picker">
  {filteredIconEntries.map(
    ([iconName, Icon]) => (
      <button
        type="button"
        key={iconName}
        title={iconName}
        className={
          categoryIconInput === iconName
            ? 'icon-picker-button selected'
            : 'icon-picker-button'
        }
        onClick={() =>
          setCategoryIconInput(iconName)
        }
      >
        <Icon
          size={20}
          strokeWidth={1.8}
        />
      </button>
    ),
  )}

  {filteredIconEntries.length === 0 && (
    <div className="icon-search-empty">
      No icons found
    </div>
  )}
</div>

</div>

<div className="modal-actions">
              <button
                onClick={() =>
                  setShowCategoryModal(false)
                }
              >
                Cancel
              </button>

              <button
                className="primary"
                onClick={saveCategory}
              >
                {editingCategoryName
                  ? 'Save Changes'
                  : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
