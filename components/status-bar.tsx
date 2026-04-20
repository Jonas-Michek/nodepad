"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CONTENT_TYPE_CONFIG } from "@/lib/content-types"
import type { TextBlock } from "@/components/tile-card"
import { AboutPanel } from "@/components/about-panel"

import { Menu, LayoutList, Cloud, CloudOff, RefreshCw, AlertCircle, Briefcase, Bot, Settings, Wifi, WifiOff, WifiSync } from "lucide-react"


interface StatusBarProps {
  blockCount: number
  blocks: TextBlock[]
  activeProjectName: string
  isSidebarOpen: boolean
  isIndexOpen: boolean
  isGhostPanelOpen: boolean
  ghostNoteCount: number
  onMenuClick: () => void
  onIndexToggle: () => void
  onGhostPanelToggle: () => void
  modelLabel?: string
  providerLabel?: string
  modelId?: string
  showHelpTooltip?: boolean
  onHelpTooltipDismiss?: () => void
  syncStatus?: "idle" | "syncing" | "success" | "error"
  onToolsClick: () => void
  onSettingsClick?: (section: 'ai' | 'cloud') => void
  isOnline?: boolean
  aiEnabled?: boolean
  syncEnabled?: boolean
}

export function StatusBar({
  blockCount,
  blocks,
  activeProjectName,
  isSidebarOpen,
  isIndexOpen,
  isGhostPanelOpen,
  ghostNoteCount,
  onMenuClick,
  onIndexToggle,
  onHelpTooltipDismiss,
  syncStatus,
  onToolsClick,
  modelLabel,
  providerLabel,
  modelId,
  onSettingsClick,
  isOnline = true,
  aiEnabled = true,
  syncEnabled = true,
}: StatusBarProps) {
  const [time, setTime] = useState("")
  const [showDetails, setShowDetails] = useState(false)
  const [showAiConfig, setShowAiConfig] = useState(false)
  const [showSyncConfig, setShowSyncConfig] = useState(false)
  const [showNetworkConfig, setShowNetworkConfig] = useState(false)

  const aiLetter = useMemo(() => {
    if (!modelLabel) return null
    const label = modelLabel.toLowerCase()
    const id = (modelId || "").toLowerCase()
    const provider = (providerLabel || "").toLowerCase()

    if (provider.includes("google") || label.includes("gemini")) return "G"
    if (provider.includes("z.ai") || provider.includes("zai")) return "Z"
    if (provider.includes("openai") || label.includes("gpt") || label.includes("chatgpt")) return "O"
    if (label.includes("claude") || id.includes("anthropic")) return "C"
    if (label.includes("deepseek") || id.includes("deepseek")) return "D"
    if (label.includes("mistral") || id.includes("mistral")) return "M"
    if (label.includes("nemotron") || id.includes("nemotron") || id.includes("nvidia")) return "N"
    
    return modelLabel.charAt(0).toUpperCase()
  }, [modelLabel, modelId, providerLabel])

  const activity = useMemo(() => {
    return {
      enriching: blocks.filter(b => b.isEnriching).length,
      errors: blocks.filter(b => b.isError).length
    }
  }, [blocks])

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    blocks.forEach((b) => {
      counts[b.contentType] = (counts[b.contentType] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [blocks])

  return (
    <header className="flex h-10 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-3 py-1.5 z-50">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-2.5 ml-1">
          <button 
            onClick={onMenuClick}
            className={`hidden md:flex p-1.5 rounded-sm transition-all duration-200 mr-2 ${
              isSidebarOpen 
                ? "bg-primary/20 text-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]" 
                : "hover:bg-secondary text-muted-foreground/50 hover:text-foreground"
            }`}
            title="Menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          
          <div className="hidden md:flex items-center gap-0.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-primary" />
            <span className="inline-block h-2 w-2 rounded-sm bg-primary/60" />
            <span className="inline-block h-2 w-2 rounded-sm bg-primary/30" />
          </div>
          <h1 className="hidden md:block font-mono text-xs font-bold text-foreground tracking-tight select-none">
            nodepad
          </h1>
          {activeProjectName && (
            <div className="flex items-center gap-2 md:ml-1">
              <span className="hidden md:inline text-muted-foreground/20 font-mono text-[10px]">/</span>
              <span className="font-mono text-[11px] md:text-[9px] text-foreground md:text-muted-foreground font-bold uppercase tracking-[0.2em]">{activeProjectName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {blockCount > 0 && (
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className={`font-mono text-[9px] font-bold uppercase tracking-wider transition-all duration-200 py-1 px-1.5 rounded-sm -ml-1.5 ${
                  showDetails 
                    ? "text-muted-foreground/80 bg-white/5" 
                    : "text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-white/5"
                }`}
              >
                {blockCount} {blockCount === 1 ? 'node' : 'nodes'}
              </button>
              
              {activity.enriching > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-primary/10 border border-primary/20">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
                  <span className="font-mono text-[10px] text-primary">
                    {activity.enriching} {blocks.length > activity.enriching ? "contextualizing..." : "processing..."}
                  </span>
                </div>
              )}

              {activity.errors > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-destructive/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  <span className="font-mono text-[10px] text-destructive font-bold">
                    {activity.errors} failed
                  </span>
                </div>
              )}

              <AnimatePresence>
                {showDetails && typeCounts.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -5, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: "auto" }}
                    exit={{ opacity: 0, x: -5, width: 0 }}
                    className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap"
                  >
                    <span className="text-muted-foreground/20 italic">{"//"}</span>
                    <div className="flex items-center gap-3">
                      {typeCounts.map(([type, count]) => {
                        const config = CONTENT_TYPE_CONFIG[type as keyof typeof CONTENT_TYPE_CONFIG]
                        return (
                          <span
                            key={type}
                            className="font-mono text-[9px] font-bold uppercase tracking-tighter"
                            style={{ color: config.accentVar }}
                          >
                            {count} {config.label}
                          </span>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5 md:gap-2 border-l border-white/5 pl-2 md:pl-4 ml-0 md:ml-4">
          
          {/* Cloud sync status indicator */}
          {syncEnabled && syncStatus && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowSyncConfig(!showSyncConfig)}
                className={`hidden md:flex items-center justify-center transition-colors p-1 rounded-sm hover:bg-white/5 active:scale-95 ${
                  syncStatus === "syncing" ? "text-amber-500" :
                  syncStatus === "success" ? "text-green-500" :
                  syncStatus === "error" ? "text-destructive" :
                  "text-muted-foreground/30"
                }`}
                title={syncStatus === "idle" ? "Cloud Disconnected" : `Sync Status: ${syncStatus}`}
              >
                {syncStatus === "error" || syncStatus === "idle" ? (
                  <CloudOff className="h-4 w-4 text-destructive" />
                ) : (
                  <Cloud className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`} />
                )}
              </button>

              <AnimatePresence>
                {showSyncConfig && (
                  <motion.div
                    initial={{ opacity: 0, x: -5, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: "auto" }}
                    exit={{ opacity: 0, x: -5, width: 0 }}
                    className="flex items-center gap-1 overflow-hidden"
                  >
                    <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider px-1.5 py-1 whitespace-nowrap">
                      {syncStatus === "success" ? "synced" :
                       syncStatus === "syncing" ? "syncing" :
                       syncStatus === "error" ? "sync failed" :
                       "not connected"}
                    </span>
                    <button 
                      onClick={() => onSettingsClick?.('cloud')}
                      className="p-1 hover:bg-white/5 rounded-sm text-muted-foreground/40 hover:text-foreground transition-colors"
                    >
                      <Settings className="h-3 w-3" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* AI indicator */}
          {aiEnabled && (
            <div className="hidden md:flex items-center gap-1 ml-1">
              <button
                onClick={() => setShowAiConfig(!showAiConfig)}
                className={`font-mono text-[11px] font-bold p-1 rounded-sm transition-all duration-200 ${
                  modelLabel ? "text-green-500 hover:bg-green-500/10" : "text-destructive hover:bg-destructive/10"
                }`}
              >
                {modelLabel ? (
                  <span className="w-4 h-4 flex items-center justify-center text-[12px] leading-none mb-[1px]">{aiLetter}</span>
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </button>

              <AnimatePresence>
                {showAiConfig && (
                  <motion.div
                    initial={{ opacity: 0, x: -5, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: "auto" }}
                    exit={{ opacity: 0, x: -5, width: 0 }}
                    className="flex items-center gap-1 overflow-hidden whitespace-nowrap"
                  >
                    {modelLabel ? (
                      <>
                        <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider px-1.5 py-1">
                          {providerLabel ? `${providerLabel} - ` : ""}{modelLabel}
                        </span>
                        <button 
                          onClick={() => onSettingsClick?.('ai')}
                          className="p-1 hover:bg-white/5 rounded-sm text-muted-foreground/40 hover:text-foreground transition-colors"
                        >
                          <Settings className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => onSettingsClick?.('ai')}
                        className="px-1.5 py-0.5 rounded-sm bg-destructive/10 text-destructive text-[8px] font-bold uppercase border border-destructive/20"
                      >
                        Setup AI
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Network indicator */}
          {(aiEnabled || syncEnabled) && (
            <div className="flex items-center">
              <button
                onClick={() => setShowNetworkConfig(!showNetworkConfig)}
                className={`flex items-center justify-center p-1 rounded-sm transition-all duration-200 hover:bg-white/5 ${
                  !isOnline ? "text-destructive" : "text-green-500"
                }`}
              >
                {!isOnline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
              </button>

              <AnimatePresence>
                {showNetworkConfig && (
                  <motion.div
                    initial={{ opacity: 0, x: -5, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: "auto" }}
                    exit={{ opacity: 0, x: -5, width: 0 }}
                    className="flex items-center overflow-hidden"
                  >
                    <span className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider px-1.5 py-1 whitespace-nowrap">
                      {!isOnline ? "Offline" : "Online"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={onToolsClick}
              className="flex items-center gap-2 h-7 px-3 rounded-sm bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all active:scale-[0.98] group"
            >
              <Briefcase className="h-3.5 w-3.5 transition-transform group-hover:rotate-6" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">Tools</span>
            </button>
            <button
              onClick={onIndexToggle}
              className={`p-1.5 rounded-sm transition-all duration-200 ${
                isIndexOpen ? "bg-primary/20 text-primary" : "hover:bg-secondary text-muted-foreground/50 hover:text-foreground"
              }`}
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <span className="w-px h-4 bg-white/5 mx-0.5" />
            <button 
              onClick={onMenuClick}
              className={`flex md:hidden p-1.5 rounded-sm transition-all duration-200 ${
                isSidebarOpen ? "bg-primary/20 text-primary" : "hover:bg-secondary text-muted-foreground/50 hover:text-foreground"
              }`}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
