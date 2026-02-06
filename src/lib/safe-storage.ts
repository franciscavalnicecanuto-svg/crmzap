/**
 * Safe localStorage wrapper with quota handling
 * Bug fix #154: Handle localStorage quota exceeded errors gracefully
 */

interface StorageOptions {
  /** Max size in KB before warning (default: 4000 = ~4MB) */
  warnThresholdKB?: number
  /** Callback when storage is getting full */
  onQuotaWarning?: (usedKB: number, totalKB: number) => void
}

const DEFAULT_OPTIONS: StorageOptions = {
  warnThresholdKB: 4000,
}

/**
 * Safely get item from localStorage
 */
export function safeGetItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue
    return JSON.parse(item) as T
  } catch (e) {
    console.warn(`[SafeStorage] Failed to read "${key}":`, e)
    return defaultValue
  }
}

/**
 * Safely set item in localStorage with quota handling
 * Returns true if successful, false if failed
 */
export function safeSetItem<T>(
  key: string, 
  value: T, 
  options: StorageOptions = DEFAULT_OPTIONS
): boolean {
  try {
    const serialized = JSON.stringify(value)
    
    // Check size before writing
    const sizeKB = new Blob([serialized]).size / 1024
    
    // Try to estimate total storage used
    let totalUsedKB = 0
    for (const k of Object.keys(localStorage)) {
      const item = localStorage.getItem(k)
      if (item) totalUsedKB += new Blob([item]).size / 1024
    }
    
    // Warn if approaching limit
    if (options.onQuotaWarning && totalUsedKB > (options.warnThresholdKB || 4000)) {
      options.onQuotaWarning(totalUsedKB, 5000) // Assume ~5MB limit
    }
    
    localStorage.setItem(key, serialized)
    return true
  } catch (e) {
    // QuotaExceededError handling
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      console.error(`[SafeStorage] Storage quota exceeded for "${key}". Attempting cleanup...`)
      
      // Try to free up space by removing old/less important data
      const cleanupSuccess = cleanupStorage(key)
      
      if (cleanupSuccess) {
        // Retry after cleanup
        try {
          localStorage.setItem(key, JSON.stringify(value))
          return true
        } catch (retryError) {
          console.error('[SafeStorage] Still failed after cleanup')
        }
      }
      
      return false
    }
    
    console.error(`[SafeStorage] Failed to write "${key}":`, e)
    return false
  }
}

/**
 * Safely remove item from localStorage
 */
export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key)
    return true
  } catch (e) {
    console.warn(`[SafeStorage] Failed to remove "${key}":`, e)
    return false
  }
}

/**
 * Cleanup old/large items to free space
 * Returns true if cleanup was performed
 */
function cleanupStorage(preserveKey?: string): boolean {
  try {
    const itemsToCleanup = [
      'whatszap-completed-reminders', // Cleanup old completed reminders
      'whatszap-action-history', // Cleanup old action history
      'whatszap-analysis-history', // Cleanup old AI analysis cache
    ]
    
    let cleaned = false
    
    for (const key of itemsToCleanup) {
      if (key === preserveKey) continue
      
      const item = localStorage.getItem(key)
      if (item) {
        try {
          const data = JSON.parse(item)
          
          if (Array.isArray(data) && data.length > 20) {
            // Keep only last 20 items
            localStorage.setItem(key, JSON.stringify(data.slice(0, 20)))
            cleaned = true
          }
        } catch {
          // If parsing fails, remove the corrupted item
          localStorage.removeItem(key)
          cleaned = true
        }
      }
    }
    
    return cleaned
  } catch {
    return false
  }
}

/**
 * Get storage usage stats
 */
export function getStorageStats(): { usedKB: number; items: { key: string; sizeKB: number }[] } {
  const items: { key: string; sizeKB: number }[] = []
  let totalKB = 0
  
  try {
    for (const key of Object.keys(localStorage)) {
      const item = localStorage.getItem(key)
      if (item) {
        const sizeKB = new Blob([item]).size / 1024
        items.push({ key, sizeKB })
        totalKB += sizeKB
      }
    }
    
    // Sort by size descending
    items.sort((a, b) => b.sizeKB - a.sizeKB)
  } catch (e) {
    console.error('[SafeStorage] Failed to get stats:', e)
  }
  
  return { usedKB: totalKB, items }
}

/**
 * Compress leads data by removing unnecessary fields
 * Bug fix #154: Reduce storage footprint
 */
export function compressLeadsForStorage<T extends Record<string, unknown>[]>(leads: T): T {
  return leads.map(lead => {
    const compressed = { ...lead }
    
    // Remove empty/null fields
    for (const key of Object.keys(compressed)) {
      const value = compressed[key]
      if (value === null || value === undefined || value === '') {
        delete compressed[key]
      }
    }
    
    return compressed
  }) as T
}
