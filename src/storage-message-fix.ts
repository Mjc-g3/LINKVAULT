const replacements: Array<[RegExp, string]> = [
  [/Could not load your online library from Supabase\. Check the browser console for details\./i, 'Could not load your LinkVault library from GitHub. Check the browser console for details.'],
  [/The category could not be saved to Supabase\./i, 'The category could not be saved to GitHub. Make sure GitHub editing is connected on this device.'],
  [/The category could not be deleted from Supabase\./i, 'The category could not be deleted from GitHub. Make sure GitHub editing is connected on this device.'],
  [/Backup imported to Supabase successfully\./i, 'Backup imported to GitHub successfully.'],
  [/The category order could not be saved to Supabase\./i, 'The category order could not be saved to GitHub.'],
  [/The website order could not be saved to Supabase\./i, 'The website order could not be saved to GitHub.'],
  [/The favorite could not be saved to Supabase\./i, 'The favorite could not be saved to GitHub.'],
  [/The website could not be deleted from Supabase\./i, 'The website could not be deleted from GitHub.'],
  [/Supabase/gi, 'GitHub'],
]

export function initStorageMessageFix() {
  const originalAlert = window.alert.bind(window)

  window.alert = (message?: unknown) => {
    let text = String(message ?? '')
    for (const [pattern, replacement] of replacements) {
      text = text.replace(pattern, replacement)
    }
    originalAlert(text)
  }
}
