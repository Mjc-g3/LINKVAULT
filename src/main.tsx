import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initGitHubSyncUI } from './github-sync-ui'
import { initStorageMessageFix } from './storage-message-fix'
import { initAlphabeticalCategorySort } from './category-sort'

initStorageMessageFix()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

initGitHubSyncUI()
initAlphabeticalCategorySort()
