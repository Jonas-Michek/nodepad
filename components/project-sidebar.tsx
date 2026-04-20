"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Settings,
  Trash2,
  Check,
  X,
  Edit3,
  LayoutGrid,
  ArrowLeft,
  Key,
  ChevronDown,
  Globe,
  Eye,
  EyeOff,
  Save,
  FolderInput,
  Sparkles,
  HelpCircle,
  AlertCircle,
} from "lucide-react"
import {
  AI_PROVIDER_PRESETS,
  getModelsForProvider,
  getPreset,
  type AISettings,
  type AIProvider,
} from "@/lib/ai-settings"
import type { SyncSettings } from "@/lib/sync-settings"
import { Cloud, CloudOff } from "lucide-react"

interface Project {
  id: string
  name: string
  blocks: any[]
  collapsedIds: string[]
}

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  projects: Project[]
  activeProjectId: string
  onSelectProject: (id: string) => void
  onCreateProject: () => void
  onImportProject: () => void
  onRenameProject: (id: string, newName: string) => void
  onDeleteProject: (id: string) => void
  showSettings: boolean
  onShowSettingsChange: (val: boolean) => void
  // AI Settings
  aiSettings: AISettings
  onUpdateAISettings: (patch: Partial<AISettings>) => void
  // Sync Settings
  syncSettings: SyncSettings
  onUpdateSyncSettings: (patch: Partial<SyncSettings>) => void
  onGhostPanelToggle: () => void
  ghostNoteCount: number
  onAboutClick: () => void
  highlightedSection?: { section: "ai" | "cloud", timestamp: number } | null
  syncStatus?: "idle" | "syncing" | "success" | "error"
  isOnline?: boolean
  className?: string
}

export function ProjectSidebar({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onImportProject,
  onRenameProject,
  onDeleteProject,
  aiSettings,
  onUpdateAISettings,
  syncSettings,
  onUpdateSyncSettings,
  onGhostPanelToggle,
  ghostNoteCount,
  onAboutClick,
  showSettings,
  onShowSettingsChange,
  highlightedSection,
  syncStatus,
  isOnline = true,
  className = "",
}: ProjectSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [providerOpen, setProviderOpen] = useState(false)
  // local draft for settings (only save on "Save")
  const [draft, setDraft] = useState<AISettings>(aiSettings)
  const [syncDraft, setSyncDraft] = useState<SyncSettings>(syncSettings)
  const [showSyncKey, setShowSyncKey] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [cloudOpen, setCloudOpen] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  // Sync draft when panel opens
  useEffect(() => {
    if (showSettings) {
      setDraft(aiSettings)
      setSyncDraft(syncSettings)
    }
  }, [showSettings, aiSettings, syncSettings])

  // Auto-expand and highlight when triggered from navbar
  useEffect(() => {
    if (!highlightedSection) return

    if (highlightedSection.section === 'ai') {
      if (aiOpen) {
        setAiOpen(false)
        if (!cloudOpen) setTimeout(onClose, 200)
      } else {
        setAiOpen(true)
      }
    }
    if (highlightedSection.section === 'cloud') {
      if (cloudOpen) {
        setCloudOpen(false)
        if (!aiOpen) setTimeout(onClose, 200)
      } else {
        setCloudOpen(true)
      }
    }
  }, [highlightedSection])



  const handleRename = (id: string) => {
    if (editName.trim()) onRenameProject(id, editName.trim())
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    onDeleteProject(id)
    setDeletingId(null)
  }

  const persistSettings = () => {
    // Trim key to strip accidental whitespace/newlines from paste
    const trimmedKey = draft.apiKey.trim()
    const providerKeys: Partial<Record<AIProvider, string>> = {
      ...(draft.providerKeys ?? {}),
      [draft.provider]: trimmedKey,
    }
    onUpdateAISettings({ ...draft, apiKey: trimmedKey, providerKeys })
    onUpdateSyncSettings({
      url: syncDraft.url.trim(),
      apiKey: syncDraft.apiKey.trim(),
      enabled: syncDraft.enabled
    })
  }

  const handleSaveSettings = () => {
    persistSettings()
    onShowSettingsChange(false)
  }

  const hasUnsavedChanges = useMemo(() => {
    // Compare AI settings
    const aiChanged = 
      draft.enabled !== aiSettings.enabled ||
      draft.apiKey.trim() !== aiSettings.apiKey.trim() ||
      draft.modelId !== aiSettings.modelId ||
      draft.provider !== aiSettings.provider ||
      draft.webGrounding !== aiSettings.webGrounding ||
      draft.customBaseUrl !== aiSettings.customBaseUrl

    // Compare Sync settings
    const syncChanged = 
      syncDraft.enabled !== syncSettings.enabled ||
      syncDraft.url.trim() !== syncSettings.url.trim() ||
      syncDraft.apiKey.trim() !== syncSettings.apiKey.trim()

    return aiChanged || syncChanged
  }, [draft, syncDraft, aiSettings, syncSettings])

  // Improved close logic with confirmation
  const handleClose = () => {
    if (showSettings && hasUnsavedChanges) {
      setShowUnsavedConfirm(true)
      return
    }
    onClose()
  }

  const handleDiscardAndClose = () => {
    setDraft(aiSettings)
    setSyncDraft(syncSettings)
    setShowUnsavedConfirm(false)
    onClose()
  }

  const handleSaveAndClose = () => {
    persistSettings()
    setShowUnsavedConfirm(false)
    onClose()
  }

  const currentPreset = getPreset(draft.provider)
  const models = getModelsForProvider(draft.provider)
  const selectedModel = models.find(m => m.id === draft.modelId) || models[0] || undefined

  return (
    <motion.div
      initial={false}
      animate={{ 
        width: isOpen ? (typeof window !== 'undefined' && window.innerWidth < 768 ? '100dvw' : 240) : 0,
        opacity: isOpen ? 1 : 0,
        x: isOpen ? 0 : -20
      }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className={`relative z-50 overflow-hidden border-l md:border-l-0 md:border-r border-border bg-black/90 md:bg-black/20 backdrop-blur-3xl flex flex-col h-full shrink-0 ${
        isOpen ? "visible" : "invisible"
      } ${className}`}
    >
      <div className="w-screen md:w-[240px] flex flex-col h-full shrink-0">
        {/* Header */}
        <div className="flex h-10 items-center justify-between border-b border-border bg-card/5 backdrop-blur-md px-3 py-1.5 shrink-0">
          <button
            onClick={handleClose}
            className="p-1 px-1.5 hover:bg-white/5 rounded-sm transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-2.5">
            {showSettings ? (
              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="font-mono text-xs font-bold uppercase tracking-tight">Settings</span>
              </button>
            ) : (
              <>
                <h2 className="font-mono text-xs font-bold uppercase tracking-tight text-foreground/80 select-none">
                  Spaces
                </h2>
                <div className="flex items-center justify-center h-5 w-5 bg-primary/10 rounded-sm">
                  <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content — animated slide between projects/settings */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            {!showSettings ? (
              <motion.div
                key="projects"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 overflow-y-auto px-2 py-2 space-y-0.5 custom-scrollbar"
              >
                {/* Synthesis Button */}
                <button
                  onClick={onGhostPanelToggle}
                  className={`w-full flex items-center justify-between p-2 px-2.5 mb-2 rounded-sm transition-all duration-150 group border border-dashed ${
                    !aiSettings.enabled 
                      ? "bg-zinc-900/40 border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-80" 
                      : "bg-primary/10 border-primary/20 hover:bg-primary/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center h-5 w-5 rounded-sm ${!aiSettings.enabled ? "bg-white/5" : "bg-primary/20"}`}>
                      <Sparkles className={`h-3.5 w-3.5 ${!aiSettings.enabled ? "text-muted-foreground" : "text-primary"}`} />
                    </div>
                    <span className={`font-mono text-[12px] font-bold italic uppercase tracking-wider ${!aiSettings.enabled ? "text-muted-foreground" : "text-primary"}`}>Synthesis</span>
                  </div>
                  {aiSettings.enabled ? (
                    ghostNoteCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary font-mono text-[9px] font-black text-primary-foreground">
                        {ghostNoteCount}
                      </span>
                    )
                  ) : (
                    <span className="font-mono text-[8px] font-black text-white/20 uppercase tracking-tighter">OFF</span>
                  )}
                </button>

                {projects.map((project) => (
                  <div 
                    key={project.id}
                    className={`group relative rounded-sm transition-all duration-150 ${
                      activeProjectId === project.id 
                        ? "bg-primary/10 shadow-[inset_0_1px_0px_rgba(255,255,255,0.05)]" 
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center p-2 px-2.5">
                      <button
                        onClick={() => onSelectProject(project.id)}
                        className="flex-1 text-left flex flex-col gap-0 overflow-hidden"
                      >
                        {editingId === project.id ? (
                          <input
                            ref={inputRef}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(project.id)
                              if (e.key === "Escape") setEditingId(null)
                            }}
                            onBlur={() => handleRename(project.id)}
                            className="bg-transparent font-mono text-xs font-bold text-foreground focus:outline-none w-full border-b border-primary/50 py-0"
                          />
                        ) : (
                          <span className={`font-mono text-[12px] font-bold truncate ${
                            activeProjectId === project.id ? "text-primary" : "text-foreground/80 group-hover:text-foreground"
                          }`}>
                            {project.name}
                          </span>
                        )}
                        <span className="font-mono text-[8px] text-muted-foreground uppercase tracking-tighter font-bold">
                          {project.blocks.length} {project.blocks.length === 1 ? 'node' : 'nodes'}
                        </span>
                      </button>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editingId !== project.id && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditName(project.name)
                                setEditingId(project.id)
                              }}
                              className="p-1 hover:bg-white/10 rounded-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            {projects.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletingId(project.id)
                                }}
                                className="p-1 hover:bg-destructive/20 rounded-sm text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Delete Confirmation Overlay */}
                    <AnimatePresence>
                      {deletingId === project.id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0 }}
                          className="absolute inset-0 z-10 bg-destructive/95 backdrop-blur-md rounded-sm flex items-center justify-between px-3"
                        >
                          <span className="font-mono text-[8px] font-bold text-white uppercase tracking-tighter">
                            Delete Space?
                          </span>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleDelete(project.id)}
                              className="p-1 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={() => setDeletingId(null)}
                              className="p-1 bg-black/30 hover:bg-black/40 rounded-full text-white transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="settings"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="relative h-full overflow-y-auto px-3 py-4 flex flex-col gap-4 custom-scrollbar"
              >
                <div className="pb-64 flex flex-col gap-6">
                <motion.div 
                  className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden transition-colors"
                  animate={highlightedSection?.section === 'ai' ? { 
                    borderColor: ["#1e1e20", "#22c55e", "#1e1e20"],
                    backgroundColor: ["rgba(255,255,255,0.02)", "rgba(34,197,94,0.05)", "rgba(255,255,255,0.02)"],
                    boxShadow: ["0 0 0px rgba(34,197,94,0)", "0 0 20px rgba(34,197,94,0.2)", "0 0 0px rgba(34,197,94,0)"]
                  } : {}}
                  transition={{ duration: 1, repeat: 1 }}
                >
                  <button 
                    onClick={() => setAiOpen(!aiOpen)}
                    className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-black ${
                          !draft.enabled ? "bg-zinc-500" :
                          draft.apiKey ? "bg-green-500" :
                          "bg-destructive"
                        }`} />
                      </div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">AI Settings</span>
                    </div>
                    <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${aiOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {aiOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-3 pb-4 space-y-5">
                          {/* Provider Selector */}
                          <div className="flex flex-col gap-2">
                            <label className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                              Provider
                            </label>
                            <div className="relative">
                              <button
                                onClick={() => setProviderOpen(v => !v)}
                                className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-left hover:bg-white/[0.07] focus:outline-none transition-colors"
                              >
                                <span className="font-mono text-[11px] font-bold text-foreground">{currentPreset.label}</span>
                                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${providerOpen ? "rotate-180" : ""}`} />
                              </button>
                              <AnimatePresence>
                                {providerOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute top-full left-0 right-0 z-20 mt-1 overflow-hidden rounded-md border border-white/10 bg-[#0d0d10] shadow-xl"
                                  >
                                    {AI_PROVIDER_PRESETS.map(preset => (
                                      <button
                                        key={preset.id}
                                        onClick={() => {
                                          const newModels = getModelsForProvider(preset.id)
                                          setDraft(d => ({
                                            ...d,
                                            provider: preset.id,
                                            modelId: newModels[0]?.id ?? d.modelId,
                                            webGrounding: d.webGrounding,
                                            customBaseUrl: "",
                                            apiKey: d.providerKeys?.[preset.id] ?? "",
                                          }))
                                          setProviderOpen(false)
                                        }}
                                        className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left hover:bg-white/5 transition-colors"
                                      >
                                        <div className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                                          draft.provider === preset.id ? "border-primary bg-primary/20" : "border-white/10"
                                        }`}>
                                          {draft.provider === preset.id && <Check className="h-2.5 w-2.5 text-primary" />}
                                        </div>
                                        <span className="font-mono text-[10px] font-bold text-foreground">{preset.label}</span>
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          {/* API Key */}
                          <div className="flex flex-col gap-2">
                            <label className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                              API Key
                            </label>
                            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 focus-within:border-primary/50 transition-colors">
                              <Key className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <input
                                type="text"
                                value={draft.apiKey}
                                onChange={e => setDraft(d => ({ ...d, apiKey: e.target.value }))}
                                placeholder={currentPreset.keyPlaceholder || "Your API key"}
                                className="flex-1 bg-transparent font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/40"
                                style={showKey ? undefined : { WebkitTextSecurity: "disc" } as never}
                                autoComplete="off"
                                spellCheck={false}
                              />
                              <button onClick={() => setShowKey(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                                {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                            </div>
                            <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
                              Stored locally. Never sent to a server.{" "}
                              {currentPreset.keyUrl && (
                                <a href={currentPreset.keyUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-primary underline hover:brightness-125 transition-all">
                                  Get a key →
                                </a>
                              )}
                            </p>
                          </div>

                          {/* Model Selector */}
                          <div className="flex flex-col gap-2">
                            <label className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                              Model
                            </label>
                            {models.length === 0 ? (
                              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 focus-within:border-primary/50 transition-colors">
                                <input
                                  type="text"
                                  value={draft.modelId}
                                  onChange={e => setDraft(d => ({ ...d, modelId: e.target.value }))}
                                  placeholder="e.g. gpt-4o, claude-3-opus-20240229"
                                  className="flex-1 bg-transparent font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/40"
                                  autoComplete="off"
                                  spellCheck={false}
                                />
                              </div>
                            ) : (
                            <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => setModelOpen(v => !v)}
                                  className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-left hover:bg-white/[0.07] focus:outline-none transition-colors"
                                >
                                  <div>
                                    <div className="font-mono text-[11px] font-bold text-foreground">{selectedModel?.label ?? draft.modelId}</div>
                                    <div className="font-mono text-[9px] text-muted-foreground mt-0.5">{selectedModel?.description ?? "Custom model ID"}</div>
                                  </div>
                                  <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${modelOpen ? "rotate-180" : ""}`} />
                                </button>
                                <AnimatePresence>
                                  {modelOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="relative overflow-hidden rounded-md border border-white/10 bg-white/[0.02] custom-scrollbar"
                                    >
                                      <div className="max-h-[400px] overflow-y-auto">
                                        {(() => {
                                          const activeModels = models.filter(m => !m.label.includes("Legacy"))
                                          const legacyModels = models.filter(m => m.label.includes("Legacy"))
                                          
                                          const renderModel = (model: any) => (
                                            <button
                                              key={model.id}
                                              disabled={draft.exhaustedModels?.includes(model.id)}
                                              onClick={() => {
                                                setDraft(d => ({ ...d, modelId: model.id, webGrounding: model.supportsGrounding ? d.webGrounding : false }))
                                                setModelOpen(false)
                                              }}
                                              className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors ${
                                                draft.exhaustedModels?.includes(model.id) ? "opacity-50 cursor-not-allowed bg-red-500/5" : "hover:bg-white/5"
                                              }`}
                                            >
                                              <div className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                                                draft.modelId === model.id ? "border-primary bg-primary/20" : "border-white/10"
                                              }`}>
                                                {draft.modelId === model.id && <Check className="h-2.5 w-2.5 text-primary" />}
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                  <div className="font-mono text-[10px] font-bold text-foreground">{model.label}</div>
                                                  {draft.exhaustedModels?.includes(model.id) && (
                                                    <span className="font-mono text-[7px] font-bold uppercase tracking-tighter text-red-500 bg-red-500/10 px-1 rounded-sm border border-red-500/20">
                                                      Exhausted
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="font-mono text-[9px] text-muted-foreground">{model.description}</div>
                                              </div>
                                              {model.supportsGrounding && (draft.provider === "openrouter" || draft.provider === "openai") && <Globe className="ml-auto h-3 w-3 shrink-0 text-primary/50" />}
                                            </button>
                                          )

                                          return (
                                            <>
                                              {activeModels.length > 0 && (
                                                <div className="sticky top-0 z-10 px-2.5 py-1.5 font-mono text-[8px] font-bold uppercase tracking-widest text-muted-foreground bg-[#0d0d10] border-b border-white/5">
                                                  Active Models
                                                </div>
                                              )}
                                              {activeModels.map(renderModel)}
                                              {legacyModels.length > 0 && (
                                                <div className="px-2.5 py-1.5 font-mono text-[8px] font-bold uppercase tracking-widest text-muted-foreground bg-white/[0.02] border-y border-white/5">
                                                  Legacy Models
                                                </div>
                                              )}
                                              {legacyModels.map(renderModel)}
                                            </>
                                          )
                                        })()}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </div>

                          {/* Web Grounding (OpenRouter + OpenAI) */}
                          {(draft.provider === "openrouter" || draft.provider === "openai") && selectedModel && (
                            <div className="flex items-start justify-between gap-3 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-2.5">
                              <div className="flex items-start gap-2">
                                <Globe className="h-3.5 w-3.5 mt-0.5 text-primary/60 shrink-0" />
                                <div>
                                  <div className="font-mono text-[11px] font-bold text-foreground">Web Grounding</div>
                                  <div className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
                                    {selectedModel.supportsGrounding
                                      ? draft.provider === "openai"
                                        ? `Uses ${selectedModel.groundingModelId ?? "search-preview"} for live web access`
                                        : "Adds :online for live search"
                                      : "Not available for this model"}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => selectedModel.supportsGrounding && setDraft(d => ({ ...d, webGrounding: !d.webGrounding }))}
                                disabled={!selectedModel.supportsGrounding}
                                className={`relative shrink-0 h-5 w-9 rounded-full transition-all duration-200 ${
                                  draft.webGrounding && selectedModel.supportsGrounding ? "bg-primary" : "bg-white/10"
                                } disabled:opacity-30 disabled:cursor-not-allowed`}
                              >
                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${
                                  draft.webGrounding && selectedModel.supportsGrounding ? "left-5" : "left-0.5"
                                }`} />
                              </button>
                            </div>
                          )}

                          {/* AI Enable Toggle */}
                          <div className="flex items-start justify-between gap-3 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-2.5">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary/60 shrink-0" />
                              <div>
                                <div className="font-mono text-[11px] font-bold text-foreground">AI Enrichment</div>
                                <div className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
                                  Automatically classify and annotate your notes
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => setDraft(d => ({ ...d, enabled: !d.enabled }))}
                              className={`relative shrink-0 h-5 w-9 rounded-full transition-all duration-200 ${
                                draft.enabled ? "bg-primary" : "bg-white/10"
                              }`}
                            >
                              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${
                                draft.enabled ? "left-5" : "left-0.5"
                              }`} />
                            </button>
                          </div>

                          {/* API Status */}
                          <div className={`flex items-center gap-2 rounded-md px-2.5 py-2 font-mono text-[9px] ${
                            draft.enabled && draft.apiKey
                              ? "bg-primary/10 border border-primary/20 text-primary"
                              : "bg-white/5 border border-white/5 text-muted-foreground"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${draft.enabled && draft.apiKey ? "bg-primary animate-pulse" : "bg-white/30"}`} />
                            {!draft.enabled ? "AI Enrichment disabled" : draft.apiKey ? `${currentPreset.label} — API key configured` : "No API key — AI disabled"}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div 
                  className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden transition-colors"
                  animate={highlightedSection?.section === 'cloud' ? { 
                    borderColor: ["#1e1e20", "#22c55e", "#1e1e20"],
                    backgroundColor: ["rgba(255,255,255,0.02)", "rgba(34,197,94,0.05)", "rgba(255,255,255,0.02)"],
                    boxShadow: ["0 0 0px rgba(34,197,94,0)", "0 0 20px rgba(34,197,94,0.2)", "0 0 0px rgba(34,197,94,0)"]
                  } : {}}
                  transition={{ duration: 1, repeat: 1 }}
                >
                  <button 
                    onClick={() => setCloudOpen(!cloudOpen)}
                    className="flex items-center justify-between w-full px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-black ${
                          !syncDraft.enabled ? "bg-zinc-500" :
                          syncStatus === "syncing" ? "bg-amber-500 animate-pulse" :
                          syncStatus === "error" ? "bg-destructive" :
                          "bg-green-500"
                        }`} />
                      </div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">Cloud Settings</span>
                    </div>
                    <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${cloudOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {cloudOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-3 pb-4 space-y-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 focus-within:border-primary/50 transition-colors">
                              <input
                                type="url"
                                value={syncDraft.url}
                                onChange={e => setSyncDraft(d => ({ ...d, url: e.target.value }))}
                                placeholder="https://api.jsonbin.io/v3/b/..."
                                className="flex-1 bg-transparent font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/40"
                                autoComplete="off"
                                spellCheck={false}
                              />
                            </div>
                            <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
                              GET/PUT JSON Endpoint URL.{" "}
                              <a href="https://jsonbin.io/" target="_blank" rel="noopener noreferrer"
                                className="text-primary underline hover:brightness-125 transition-all">
                                Get an endpoint →
                              </a>
                            </p>

                            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 focus-within:border-primary/50 transition-colors">
                              <Key className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <input
                                type="text"
                                value={syncDraft.apiKey}
                                onChange={e => setSyncDraft(d => ({ ...d, apiKey: e.target.value }))}
                                placeholder="API Key / Auth Header (Optional)"
                                className="flex-1 bg-transparent font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/40"
                                style={showSyncKey ? undefined : { WebkitTextSecurity: "disc" } as never}
                                autoComplete="off"
                                spellCheck={false}
                              />
                              <button onClick={() => setShowSyncKey(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors" title="Toggle visibility">
                                {showSyncKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                            </div>
                            {/* Cloud Enable Toggle */}
                            <div className="flex items-start justify-between gap-3 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-2.5 mt-2">
                              <div className="flex items-start gap-2">
                                <Cloud className="h-3.5 w-3.5 mt-0.5 text-primary/60 shrink-0" />
                                <div>
                                  <div className="font-mono text-[11px] font-bold text-foreground">Cloud Sync</div>
                                  <div className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-relaxed">
                                    Keep your notes synced across devices
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => setSyncDraft(d => ({ ...d, enabled: !d.enabled }))}
                                className={`relative shrink-0 h-5 w-9 rounded-full transition-all duration-200 ${
                                  syncDraft.enabled ? "bg-primary" : "bg-white/10"
                                }`}
                              >
                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${
                                  syncDraft.enabled ? "left-5" : "left-0.5"
                                }`} />
                              </button>
                            </div>

                            <div className={`flex items-center gap-2 mt-1 rounded-md px-2.5 py-2 font-mono text-[9px] ${
                              syncDraft.enabled && syncDraft.url
                                ? "bg-primary/10 border border-primary/20 text-primary"
                                : "bg-white/5 border border-white/5 text-muted-foreground"
                            }`}>
                              {syncDraft.enabled && syncDraft.url ? <Cloud className="h-2.5 w-2.5 shrink-0" /> : <CloudOff className="h-2.5 w-2.5 shrink-0" />}
                              {!syncDraft.enabled ? "Cloud sync disabled" : syncDraft.url ? "Cloud sync enabled" : "No endpoint configured"}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 bg-black/10 shrink-0">
          {showSettings ? (
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleSaveSettings}
                className="flex items-center justify-between w-full h-8 px-2.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition-all active:scale-[0.98] shadow-sm"
              >
                <span>Save Settings</span>
                <Save className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onShowSettingsChange(false)}
                className="flex items-center justify-center w-full h-8 px-2.5 rounded-sm bg-white/5 hover:bg-white/10 text-muted-foreground font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition-all active:scale-[0.98] border border-white/5"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <button
                onClick={onCreateProject}
                className="flex items-center justify-between w-full h-8 px-2.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition-all active:scale-[0.98] shadow-sm"
              >
                <span>New Space</span>
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onImportProject}
                className="flex items-center justify-between w-full h-8 px-2.5 rounded-sm bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition-all active:scale-[0.98] border border-white/5"
                title="Import a .nodepad file"
              >
                <span>Import .nodepad</span>
                <FolderInput className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onAboutClick}
                className="flex items-center justify-between w-full h-8 px-2.5 rounded-sm bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition-all active:scale-[0.98] border border-white/5"
              >
                <span>About nodepad</span>
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
              <div className="h-px bg-white/5 my-1" />
              <button
                onClick={() => onShowSettingsChange(true)}
                className="flex items-center justify-between w-full h-8 px-2.5 rounded-sm bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition-all active:scale-[0.98] border border-white/5"
              >
                <span>Settings</span>
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Unsaved Changes Confirmation Overlay */}
        <AnimatePresence>
          {showUnsavedConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-[200px] bg-[#1a1a1c] border border-white/10 rounded-lg p-5 shadow-2xl flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1 text-center">
                  <div className="flex justify-center mb-1">
                    <AlertCircle className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">Unsaved Changes</h3>
                  <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
                    You have modified settings. Would you like to save them?
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleSaveAndClose}
                    className="w-full py-2 bg-primary hover:bg-primary/90 rounded-sm text-primary-foreground font-mono text-[9px] font-bold uppercase tracking-wider transition-all"
                  >
                    Save & Close
                  </button>
                  <button
                    onClick={handleDiscardAndClose}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-sm text-foreground font-mono text-[9px] font-bold uppercase tracking-wider transition-all border border-white/5"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={() => setShowUnsavedConfirm(false)}
                    className="w-full py-2 text-muted-foreground hover:text-foreground font-mono text-[9px] font-bold uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
