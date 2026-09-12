import {
  clearGitHubToken,
  hasGitHubToken,
  setGitHubToken,
  syncCurrentLibraryToGitHub,
  testGitHubConnection,
} from './supabase'

const STYLE_ID = 'linkvault-github-sync-style'
const SECTION_ID = 'linkvault-github-sync'

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .github-sync-section{margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)}
    .github-sync-title{margin:0 0 8px;color:#8f90a0;font-size:11px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
    .github-sync-status{display:flex;align-items:center;gap:7px;margin:0 0 9px;color:#a8a9b4;font-size:11px;line-height:1.35}
    .github-sync-dot{width:7px;height:7px;border-radius:50%;background:#666879;box-shadow:0 0 0 3px rgba(255,255,255,.025)}
    .github-sync-section.connected .github-sync-dot{background:#55d68a;box-shadow:0 0 10px rgba(85,214,138,.45)}
    .github-sync-actions{display:grid;gap:7px}
    .github-sync-button{width:100%;min-height:38px;padding:9px 11px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#15161c;color:#ddd;font-size:12px;font-weight:750;text-align:left;cursor:pointer}
    .github-sync-button.primary{background:linear-gradient(180deg,#7655e8,#6544d2);border-color:#8b6af0;color:white;text-align:center}
    .github-sync-button.danger{color:#ff8d95;border-color:rgba(255,105,115,.22)}
    .github-sync-help{margin:8px 0 0;color:#6f7180;font-size:10px;line-height:1.45}
  `
  document.head.appendChild(style)
}

function promptForToken() {
  return window.prompt(
    'Paste a GitHub fine-grained personal access token for Mjc-g3/LINKVAULT.\n\nRequired permission: Repository contents — Read and write.\n\nThe token is stored only in this browser on this device.',
    '',
  )
}

function renderSection(section: HTMLElement) {
  const connected = hasGitHubToken()
  section.classList.toggle('connected', connected)
  section.innerHTML = `
    <p class="github-sync-title">GitHub Sync</p>
    <p class="github-sync-status"><span class="github-sync-dot"></span><span>${connected ? 'Connected on this device' : 'Read-only until connected'}</span></p>
    <div class="github-sync-actions">
      <button type="button" class="github-sync-button primary" data-github-connect>${connected ? 'Sync to GitHub now' : 'Connect GitHub for editing'}</button>
      ${connected ? '<button type="button" class="github-sync-button danger" data-github-disconnect>Remove token from this device</button>' : ''}
    </div>
    <p class="github-sync-help">The shared library is stored in this GitHub repo. Reading works on any device. A token is only needed on devices that should be allowed to edit.</p>
  `

  section.querySelector('[data-github-connect]')?.addEventListener('click', async () => {
    const button = section.querySelector('[data-github-connect]') as HTMLButtonElement | null
    if (!button) return
    const original = button.textContent || ''

    try {
      if (!hasGitHubToken()) {
        const token = promptForToken()
        if (!token?.trim()) return
        setGitHubToken(token)
        button.textContent = 'Checking GitHub…'
        await testGitHubConnection()
      }

      button.textContent = 'Syncing library…'
      await syncCurrentLibraryToGitHub()
      window.alert('LinkVault is now synced to GitHub.')
      renderSection(section)
    } catch (error) {
      console.error(error)
      if (!connected) clearGitHubToken()
      window.alert(error instanceof Error ? error.message : 'GitHub sync failed.')
      button.textContent = original
      renderSection(section)
    }
  })

  section.querySelector('[data-github-disconnect]')?.addEventListener('click', () => {
    if (!window.confirm('Remove the GitHub editing token from this device? The shared library in GitHub will not be deleted.')) return
    clearGitHubToken()
    renderSection(section)
  })
}

function mount() {
  ensureStyle()
  if (document.getElementById(SECTION_ID)) return true

  const sidebarContent = document.querySelector('.sidebar-content')
  if (!sidebarContent) return false

  const section = document.createElement('div')
  section.id = SECTION_ID
  section.className = 'github-sync-section'
  renderSection(section)

  const backup = sidebarContent.querySelector('.backup-section')
  if (backup) backup.insertAdjacentElement('afterend', section)
  else sidebarContent.appendChild(section)
  return true
}

export function initGitHubSyncUI() {
  if (mount()) return
  const observer = new MutationObserver(() => {
    if (mount()) observer.disconnect()
  })
  observer.observe(document.body, { childList: true, subtree: true })
}
