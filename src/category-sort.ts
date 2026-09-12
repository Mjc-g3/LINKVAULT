const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })

function sortCategoryList() {
  const list = document.querySelector('.category-list')
  if (!list) return false

  const groups = Array.from(list.querySelectorAll<HTMLElement>(':scope > .category-group'))
  if (groups.length < 2) return true

  const sorted = [...groups].sort((a, b) => {
    const aName = a.querySelector('.category-select span')?.textContent?.trim() ?? ''
    const bName = b.querySelector('.category-select span')?.textContent?.trim() ?? ''
    return collator.compare(aName, bName)
  })

  if (sorted.some((group, index) => group !== groups[index])) {
    sorted.forEach((group) => list.appendChild(group))
  }

  return true
}

export function initAlphabeticalCategorySort() {
  let sorting = false

  const run = () => {
    if (sorting) return
    sorting = true
    requestAnimationFrame(() => {
      sortCategoryList()
      sorting = false
    })
  }

  run()

  const observer = new MutationObserver(run)
  observer.observe(document.body, { childList: true, subtree: true })
}
