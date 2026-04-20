"use client"

import { useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TilingArea } from "@/components/tiling-area"
import { KanbanArea } from "@/components/kanban-area"
import { GraphArea } from "@/components/graph-area"
import { InboxArea } from "@/components/inbox-area"
import { ProjectSidebar } from "@/components/project-sidebar"
import { StatusBar } from "@/components/status-bar"
import { GhostPanel } from "@/components/ghost-panel"
import { VimInput } from "@/components/vim-input"
import { IntroModal } from "@/components/intro-modal"
import { AboutPanel } from "@/components/about-panel"
import { TileIndex } from "@/components/tile-index"
import { useNodepad } from "@/hooks/use-nodepad"
import { useNetwork } from "@/hooks/use-network"
import { AI_PROVIDER_PRESETS } from "@/lib/ai-settings"

export default function Page() {
  const {
    projects, setProjects,
    activeProjectId, setActiveProjectId,
    activeProject,
    blocks, ghostNotes,
    highlightedBlockId, setHighlightedBlockId,
    isLoaded,
    isSidebarOpen, setIsSidebarOpen,
    isIndexOpen, setIsIndexOpen,
    isGhostPanelOpen, setIsGhostPanelOpen,
    isAboutOpen, setIsAboutOpen,
    viewMode, setViewMode,
    isCommandKOpen, setIsCommandKOpen,
    isSettingsOpen, setIsSettingsOpen,
    isIntroOpen, setIsIntroOpen,
    showHelpTooltip, setShowHelpTooltip,
    helpTooltipTimer,
    highlightedSection, setHighlightedSection,
    undoToast,
    syncStatus,
    settings, updateSettings, currentModel, isHydrated,
    syncSettings, updateSyncSettings, isSyncHydrated,
    undo, addBlock, deleteBlock, editBlock, reEnrichBlock, editAnnotation,
    toggleCollapse, handleTogglePin, handleToggleSubTask, handleDeleteSubTask,
    handleChangeType, createProject, renameProject, deleteProject,
    claimGhostNote, dismissGhostNote, handleCommand,
  } = useNodepad()
  const isOnline = useNetwork()

  const importInputRef = useRef<HTMLInputElement>(null)

  const existingCategories = useMemo(() => {
    const cats = new Set<string>()
    blocks.forEach(b => {
      if (b.category) cats.add(b.category)
    })
    return Array.from(cats).sort()
  }, [blocks])

  // Force Inbox view on small screens automatically
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("inbox")
    }
  }, [setViewMode])

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsCommandKOpen(prev => !prev)
      }
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault()
          undo()
        }
      }
      if (e.key === "Escape") {
        if (isCommandKOpen) setIsCommandKOpen(false)
        else if (isGhostPanelOpen) setIsGhostPanelOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeys)
    return () => window.removeEventListener("keydown", handleKeys)
  }, [isCommandKOpen, isGhostPanelOpen, undo, setIsCommandKOpen, setIsGhostPanelOpen])

  const handleIntroClose = () => {
    setIsIntroOpen(false)
    localStorage.setItem("nodepad-intro-seen", "true")
    setShowHelpTooltip(true)
    if (helpTooltipTimer.current) clearTimeout(helpTooltipTimer.current)
    helpTooltipTimer.current = setTimeout(() => setShowHelpTooltip(false), 6000)
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <input
        ref={importInputRef}
        type="file"
        accept=".nodepad,.json"
        className="hidden"
        onChange={(e) => {
           // Basic import logic kept minimal in page, uses useNodepad 
           // but the actual input handler might need more logic
           // so I'll move handleImportFile to hook too next
        }}
      />
      
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => { setIsSidebarOpen(false); setIsSettingsOpen(false); }}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onCreateProject={createProject}
        onRenameProject={renameProject}
        onDeleteProject={deleteProject}
        onImportProject={() => importInputRef.current?.click()}
        aiSettings={settings}
        onUpdateAISettings={updateSettings}
        syncSettings={syncSettings}
        onUpdateSyncSettings={updateSyncSettings}
        showSettings={isSettingsOpen}
        onShowSettingsChange={setIsSettingsOpen}
        highlightedSection={highlightedSection}
        syncStatus={syncStatus}
        isOnline={isOnline}
        onGhostPanelToggle={() => setIsGhostPanelOpen(prev => !prev)}
        ghostNoteCount={ghostNotes.filter(n => !n.isGenerating).length}
        onAboutClick={() => setIsAboutOpen(true)}
        className="order-last md:order-first"
      />



      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <StatusBar
          blockCount={blocks.length}
          blocks={blocks}
          isSidebarOpen={isSidebarOpen}
          isIndexOpen={isIndexOpen}
          isGhostPanelOpen={isGhostPanelOpen}
          ghostNoteCount={ghostNotes.filter(n => !n.isGenerating).length}
          activeProjectName={activeProject?.name || ""}
          onMenuClick={() => {
            if (!isSidebarOpen) {
              setIsSettingsOpen(false)
              setIsSidebarOpen(true)
            } else {
              if (isSettingsOpen) setIsSettingsOpen(false)
              else setIsSidebarOpen(false)
            }
          }}
          onIndexToggle={() => setIsIndexOpen(!isIndexOpen)}
          onGhostPanelToggle={() => setIsGhostPanelOpen(prev => !prev)}
          modelLabel={isHydrated && settings.enabled && settings.apiKey ? currentModel.shortLabel : undefined}
          providerLabel={isHydrated && settings.enabled && settings.apiKey ? AI_PROVIDER_PRESETS.find(p => p.id === settings.provider)?.label : undefined}
          modelId={isHydrated && settings.enabled && settings.apiKey ? currentModel.id : undefined}
          showHelpTooltip={showHelpTooltip}
          onHelpTooltipDismiss={() => {
            setShowHelpTooltip(false)
            if (helpTooltipTimer.current) clearTimeout(helpTooltipTimer.current)
          }}
          onToolsClick={() => setIsCommandKOpen(prev => !prev)}
          syncStatus={syncStatus}
          isOnline={isOnline}
          aiEnabled={isHydrated && settings.enabled}
          syncEnabled={isHydrated && syncSettings.enabled}
          onSettingsClick={(section) => {
            setHighlightedSection({ section, timestamp: Date.now() })
            if (!isSidebarOpen) {
              setIsSettingsOpen(true)
              setIsSidebarOpen(true)
            } else {
              if (!isSettingsOpen) {
                setIsSettingsOpen(true)
              }
            }
            // Clear highlight reference after 2 seconds
            setTimeout(() => setHighlightedSection(null), 2000)
          }}
        />

        {isHydrated && settings.enabled && !settings.apiKey && (
          <div className="flex items-center justify-center gap-3 px-4 py-2 bg-amber-950/80 border-b border-amber-800/60 text-amber-200 text-xs shrink-0">
            <span className="opacity-80">⚡ AI enrichment requires an <strong className="text-amber-200">API key</strong></span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setHighlightedSection({ section: 'ai', timestamp: Date.now() })
                  if (!isSidebarOpen) {
                    setIsSettingsOpen(true)
                    setIsSidebarOpen(true)
                  } else {
                    if (!isSettingsOpen) {
                      setIsSettingsOpen(true)
                    }
                  }
                  setTimeout(() => setHighlightedSection(null), 2000)
                }}
                className="px-2.5 py-1 rounded bg-amber-700/60 hover:bg-amber-600/70 text-amber-100 font-medium transition-colors cursor-pointer border border-amber-600/50"
              >
                Add API key →
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden relative">
          <main className="relative flex-1 overflow-hidden">
            {isLoaded ? (
              viewMode === "tiling" ? (
                <TilingArea
                  key={`tiling-${activeProjectId}`}
                  blocks={activeProject.blocks}
                  collapsedIds={new Set(activeProject.collapsedIds)}
                  onDelete={deleteBlock}
                  onEdit={editBlock}
                  onEditAnnotation={editAnnotation}
                  onReEnrich={reEnrichBlock}
                  onChangeType={handleChangeType}
                  onToggleCollapse={toggleCollapse}
                  onTogglePin={handleTogglePin}
                  onToggleSubTask={handleToggleSubTask}
                  onDeleteSubTask={handleDeleteSubTask}
                  highlightedBlockId={highlightedBlockId}
                  onHighlight={setHighlightedBlockId}
                />
              ) : viewMode === "kanban" ? (
                <KanbanArea
                  key={`kanban-${activeProjectId}`}
                  blocks={activeProject.blocks}
                  onDelete={deleteBlock}
                  onEdit={editBlock}
                  onEditAnnotation={editAnnotation}
                  onReEnrich={reEnrichBlock}
                  onChangeType={handleChangeType}
                  onToggleCollapse={toggleCollapse}
                  onTogglePin={handleTogglePin}
                  onToggleSubTask={handleToggleSubTask}
                  onDeleteSubTask={handleDeleteSubTask}
                  collapsedIds={new Set(activeProject.collapsedIds)}
                />
              ) : viewMode === "graph" ? (
                <GraphArea
                  key={`graph-${activeProjectId}`}
                  blocks={activeProject.blocks}
                  ghostNote={ghostNotes[ghostNotes.length - 1]}
                  projectName={activeProject.name}
                  onReEnrich={reEnrichBlock}
                  onChangeType={handleChangeType}
                  onTogglePin={handleTogglePin}
                  onEdit={editBlock}
                  onEditAnnotation={editAnnotation}
                  highlightedBlockId={highlightedBlockId}
                  onHighlight={setHighlightedBlockId}
                />
              ) : (
                <InboxArea
                  key={`inbox-${activeProjectId}`}
                  blocks={activeProject.blocks}
                  collapsedIds={new Set(activeProject.collapsedIds)}
                  onDelete={deleteBlock}
                  onEdit={editBlock}
                  onEditAnnotation={editAnnotation}
                  onReEnrich={reEnrichBlock}
                  onChangeType={handleChangeType}
                  onToggleCollapse={toggleCollapse}
                  onTogglePin={handleTogglePin}
                  onToggleSubTask={handleToggleSubTask}
                  onDeleteSubTask={handleDeleteSubTask}
                  highlightedBlockId={highlightedBlockId}
                  onHighlight={setHighlightedBlockId}
                />
              )
            ) : (
              <div className="h-full w-full" />
            )}
          </main>

          <GhostPanel
            ghostNotes={ghostNotes}
            isOpen={isGhostPanelOpen}
            aiEnabled={isHydrated && settings.enabled}
            onClose={() => setIsGhostPanelOpen(false)}
            onClaim={claimGhostNote}
            onDismiss={dismissGhostNote}
          />
        </div>

        <AnimatePresence>
          {undoToast && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute bottom-[72px] left-1/2 -translate-x-1/2 z-[130] pointer-events-none"
            >
              <div className="px-3 py-1.5 rounded-sm bg-black/90 border border-white/15 backdrop-blur-md shadow-xl">
                <span className="font-mono text-[10px] text-white/70 tracking-tight whitespace-nowrap">{undoToast}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <VimInput
          onSubmit={addBlock}
          onCommand={handleCommand}
          isCommandKOpen={isCommandKOpen}
          setIsCommandKOpen={setIsCommandKOpen}
          viewMode={viewMode}
          existingCategories={existingCategories}
        />
      </div>

      <TileIndex 
        blocks={blocks} 
        onHighlight={setHighlightedBlockId} 
        highlightedId={highlightedBlockId}
        onClose={() => setIsIndexOpen(false)}
        isOpen={isIndexOpen}
        viewMode={viewMode === "inbox" ? "tiling" : viewMode}
      />

      <IntroModal open={isIntroOpen} onClose={handleIntroClose} />
      <AboutPanel open={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  )
}
