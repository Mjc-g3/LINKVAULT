const sortWebsiteCards = () => {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>('.website-card-wrapper'),
  )

  const parents = new Set<HTMLElement>()

  cards.forEach((card) => {
    if (card.parentElement) parents.add(card.parentElement)
  })

  parents.forEach((parent) => {
    const websiteCards = Array.from(
      parent.querySelectorAll<HTMLElement>(':scope > .website-card-wrapper'),
    )

    if (websiteCards.length < 2) return

    const sorted = [...websiteCards].sort((a, b) => {
      const aName = a.querySelector('h2')?.textContent?.trim() ?? ''
      const bName = b.querySelector('h2')?.textContent?.trim() ?? ''

      return aName.localeCompare(bName, 'nb', {
        sensitivity: 'base',
        numeric: true,
      })
    })

    const alreadySorted = sorted.every(
      (card, index) => card === websiteCards[index],
    )

    if (alreadySorted) return

    sorted.forEach((card) => parent.appendChild(card))
  })
}

export const initAlphabeticalWebsiteSort = () => {
  let scheduled = false

  const scheduleSort = () => {
    if (scheduled) return
    scheduled = true

    window.requestAnimationFrame(() => {
      scheduled = false
      sortWebsiteCards()
    })
  }

  scheduleSort()

  const observer = new MutationObserver(scheduleSort)
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })
}
