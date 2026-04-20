import { useState, useEffect } from "react"

export interface SyncSettings {
  url: string
  apiKey: string
  enabled: boolean
}

const DEFAULT_SETTINGS: SyncSettings = {
  url: "",
  apiKey: "$2a$10$.RlEN4IPmHxIgl4XbpVp2.SYXcpuW1ltpzFp6Yi1p4EivNIL31B9C",
  enabled: true,
}

export function useSyncSettings() {
  const [settings, setSettings] = useState<SyncSettings>(DEFAULT_SETTINGS)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nodepad-sync-settings")
      if (stored) {
        const parsed = JSON.parse(stored)
        setSettings({ 
          ...DEFAULT_SETTINGS, 
          ...parsed,
          apiKey: parsed.apiKey || DEFAULT_SETTINGS.apiKey
        })
      }
    } catch {
      // Ignored
    }
    setIsHydrated(true)
  }, [])

  const updateSettings = (patch: Partial<SyncSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem("nodepad-sync-settings", JSON.stringify(next))
      return next
    })
  }

  return { settings, updateSettings, isHydrated }
}
