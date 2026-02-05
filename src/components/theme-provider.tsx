'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface Settings {
  notifications: boolean
  reminderNotifications: boolean
  soundEnabled: boolean
  darkMode: boolean
  compactView: boolean
}

const defaultSettings: Settings = {
  notifications: true,
  reminderNotifications: true,
  soundEnabled: true,
  darkMode: false,
  compactView: false
}

interface SettingsContextType {
  settings: Settings
  updateSetting: (key: keyof Settings, value: boolean) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [mounted, setMounted] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('whatszap-settings')
    if (saved) {
      const parsed = { ...defaultSettings, ...JSON.parse(saved) }
      setSettings(parsed)
    }
    setMounted(true)
  }, [])

  // Apply dark mode to document
  useEffect(() => {
    if (!mounted) return
    
    if (settings.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [settings.darkMode, mounted])

  const updateSetting = (key: keyof Settings, value: boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('whatszap-settings', JSON.stringify(newSettings))
  }

  // Prevent flash of wrong theme
  if (!mounted) {
    return null
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
