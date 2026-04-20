"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import type { TextBlock } from "@/components/tile-card"
import type { GhostNote } from "@/components/ghost-panel"
import type { ContentType } from "@/lib/content-types"
import { INITIAL_PROJECTS } from "@/lib/initial-data"
import { useAISettings, getModelsForProvider } from "@/lib/ai-settings"
import { enrichBlockClient } from "@/lib/ai-enrich"
import { generateGhostClient } from "@/lib/ai-ghost"
import { useSyncSettings } from "@/lib/sync-settings"
import { exportToMarkdown, downloadMarkdown, copyToClipboard } from "@/lib/export"
import { downloadNodepadFile, parseNodepadFile, NodepadParseError } from "@/lib/nodepad-format"
import { detectContentType } from "@/lib/detect-content-type"

export interface Project {
  id: string
  name: string
  blocks: TextBlock[]
  collapsedIds: string[]
  ghostNotes: GhostNote[]
  lastGhostBlockCount?: number
  lastGhostTimestamp?: number
  lastGhostTexts?: string[]
}

function generateId() {
  return Math.random().toString(36).substring(2, 10)
}

function parseSubTasks(text: string, existingSubTasks?: { id: string; text: string; isDone: boolean; timestamp: number }[]) {
  const lines = text.split('\n').filter(t => t.trim().length > 0)
  return lines.map(line => {
    const rawText = line.trim()
    const isDone = rawText.toLowerCase().startsWith("[x]")
    const cleanText = rawText.replace(/^\[[\sx]?\]\s*/i, "").replace(/^(todo|fixme|hack)\s*/i, "").trim() || rawText
    
    const existing = existingSubTasks?.find(st => st.text === cleanText)
    if (existing) {
      return { ...existing, isDone: isDone || existing.isDone }
    }
    
    return {
      id: generateId(),
      text: cleanText,
      isDone,
      timestamp: Date.now()
    }
  })
}

export function useNodepad() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string>("")
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isIndexOpen, setIsIndexOpen] = useState(false)
  const [isGhostPanelOpen, setIsGhostPanelOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"tiling" | "kanban" | "graph" | "inbox">("tiling")
  const [isCommandKOpen, setIsCommandKOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isIntroOpen, setIsIntroOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [showHelpTooltip, setShowHelpTooltip] = useState(false)
  const [highlightedSection, setHighlightedSection] = useState<{ section: "ai" | "cloud", timestamp: number } | null>(null)
  const helpTooltipTimer = useRef<NodeJS.Timeout | null>(null)
  const { settings, updateSettings, resolvedModelId, currentModel, isHydrated, markModelAsExhausted } = useAISettings()
  const { settings: syncSettings, updateSettings: updateSyncSettings, isHydrated: isSyncHydrated } = useSyncSettings()
  const debounceTimers = useRef<Record<string, Record<string, NodeJS.Timeout>>>({})

  // ── Undo history ring ──────────────────────────────────────────────────────
  const blockHistoryRef = useRef<Record<string, TextBlock[][]>>({})
  const [undoToast, setUndoToast] = useState<string | null>(null)
  const undoToastTimer = useRef<NodeJS.Timeout | null>(null)

  const showUndoToast = useCallback((msg: string) => {
    if (undoToastTimer.current) clearTimeout(undoToastTimer.current)
    setUndoToast(msg)
    undoToastTimer.current = setTimeout(() => setUndoToast(null), 2200)
  }, [])

  const pushHistory = useCallback((projectId: string, currentBlocks: TextBlock[]) => {
    if (!blockHistoryRef.current[projectId]) blockHistoryRef.current[projectId] = []
    const stack = blockHistoryRef.current[projectId]
    stack.push(currentBlocks.map(b => ({ ...b })))
    if (stack.length > 20) stack.shift()
  }, [])

  const undo = useCallback(() => {
    const stack = blockHistoryRef.current[activeProjectId]
    if (!stack || stack.length === 0) {
      showUndoToast("Nothing to undo")
      return
    }
    const previousBlocks = stack.pop()!
    setProjects(prev => prev.map(p => p.id === activeProjectId
      ? { ...p, blocks: previousBlocks }
      : p
    ))
    showUndoToast("↩ Undone")
  }, [activeProjectId, showUndoToast])

  const activeProject = useMemo(() =>
    projects.find(p => p.id === activeProjectId) || projects[0],
  [projects, activeProjectId])

  const blocks = activeProject?.blocks || []
  const ghostNotes = activeProject?.ghostNotes || []

  const updateActiveProject = useCallback((updater: (p: Project) => Project) => {
    setProjects(prev => prev.map(p => p.id === activeProjectId ? updater(p) : p))
  }, [activeProjectId])

  // Clear debounce timers for the previous project when switching
  const prevActiveProjectId = useRef<string | null>(null)
  useEffect(() => {
    const prev = prevActiveProjectId.current
    if (prev && prev !== activeProjectId && debounceTimers.current[prev]) {
      Object.values(debounceTimers.current[prev]).forEach(clearTimeout)
      delete debounceTimers.current[prev]
    }
    prevActiveProjectId.current = activeProjectId
  }, [activeProjectId])

  // Persistence: Initial Load
  useEffect(() => {
    const savedProjects = localStorage.getItem("nodepad-projects")
    const savedActiveId = localStorage.getItem("nodepad-active-project")
    const backupProjects = localStorage.getItem("nodepad-backup")

    let initialProjects: Project[] = []
    let initialActiveId = ""

    if (savedProjects) {
      try {
        initialProjects = JSON.parse(savedProjects)
        initialActiveId = savedActiveId || initialProjects[0]?.id || ""
        if (!initialProjects.some(p => p.id === initialActiveId)) {
          initialActiveId = initialProjects[0]?.id || ""
        }
      } catch (e) {
        console.error("Failed to parse saved projects", e)
      }
    }

    if (initialProjects.length === 0 && backupProjects) {
      try {
        initialProjects = JSON.parse(backupProjects)
        initialActiveId = initialProjects[0]?.id || ""
      } catch (e) {
        console.error("Backup restore failed", e)
      }
    }

    if (initialProjects.length === 0) {
      initialProjects = INITIAL_PROJECTS
      initialActiveId = INITIAL_PROJECTS[0].id
    }

    setProjects(initialProjects)
    setActiveProjectId(initialActiveId)
    setIsLoaded(true)

    if (!localStorage.getItem("nodepad-intro-seen")) {
      setIsIntroOpen(true)
    }
  }, [])

  // Cloud Sync
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle")
  const isInitialCloudLoadDone = useRef(false)
  const lastSyncPayloadRef = useRef<string>("")

  const normalizeSyncUrl = useCallback((url: string) => {
    if (!url) return ""
    let target = url.trim()
    if (target.includes("jsonbin.io/app/bins/")) {
      target = target.replace("/app/bins/", "/v3/b/")
    }
    return target
  }, [])

  useEffect(() => {
    if (!isSyncHydrated || !syncSettings.enabled || !syncSettings.url || isInitialCloudLoadDone.current) return
    let isSubscribed = true

    const fetchCloud = async () => {
      setSyncStatus("syncing")
      const normalizedUrl = normalizeSyncUrl(syncSettings.url)
      const trimmedKey = syncSettings.apiKey?.trim()

      try {
        let headers: Record<string, string> = { "Content-Type": "application/json" }
        if (trimmedKey) {
          headers["X-Master-Key"] = trimmedKey
          if (!trimmedKey.startsWith("$")) {
            headers["Authorization"] = `Bearer ${trimmedKey}`
          }
        }
        
        let res = await fetch(normalizedUrl, { method: "GET", headers })
        
        if (res.status === 401 && trimmedKey?.startsWith("$") && normalizedUrl.includes("jsonbin")) {
           headers = { "Content-Type": "application/json", "X-Access-Key": trimmedKey }
           res = await fetch(normalizedUrl, { method: "GET", headers })
        }

        if (!res.ok) throw new Error("Cloud fetch failed")
        
        let data = await res.json()
        if (data && data.record && Array.isArray(data.record)) data = data.record

        if (Array.isArray(data) && data.length > 0 && isSubscribed) {
          lastSyncPayloadRef.current = JSON.stringify(data)
          setProjects(data)
          setActiveProjectId(prev => data.some((p: Project) => p.id === prev) ? prev : data[0].id)
          setSyncStatus("success")
        }
      } catch (err) {
        console.error(err)
        if (isSubscribed) setSyncStatus("error")
      } finally {
        if (isSubscribed) isInitialCloudLoadDone.current = true
      }
    }
    
    fetchCloud()
    return () => { isSubscribed = false }
  }, [syncSettings.url, syncSettings.apiKey, isSyncHydrated, normalizeSyncUrl])

  useEffect(() => {
    if (!isLoaded) return
    const payloadStr = JSON.stringify(projects)
    localStorage.setItem("nodepad-projects", payloadStr)
    localStorage.setItem("nodepad-active-project", activeProjectId)

    if (syncSettings.enabled && syncSettings.url && isInitialCloudLoadDone.current && payloadStr !== lastSyncPayloadRef.current) {
      if (debounceTimers.current["sync"]) clearTimeout(debounceTimers.current["sync"]["push"])
      if (!debounceTimers.current["sync"]) debounceTimers.current["sync"] = {}

      setSyncStatus("syncing")
      debounceTimers.current["sync"]["push"] = setTimeout(async () => {
        const normalizedUrl = normalizeSyncUrl(syncSettings.url)
        const trimmedKey = syncSettings.apiKey?.trim()

        try {
          let headers: Record<string, string> = { "Content-Type": "application/json" }
          if (trimmedKey) {
            headers["X-Master-Key"] = trimmedKey
            if (!trimmedKey.startsWith("$")) {
              headers["Authorization"] = `Bearer ${trimmedKey}`
            }
          }
          
          let res = await fetch(normalizedUrl, { method: "PUT", headers, body: payloadStr })

          if (res.status === 401 && trimmedKey?.startsWith("$") && normalizedUrl.includes("jsonbin")) {
            headers = { "Content-Type": "application/json", "X-Access-Key": trimmedKey }
            res = await fetch(normalizedUrl, { method: "PUT", headers, body: payloadStr })
          }
          
          if (!res.ok) throw new Error("PUT failed")
          lastSyncPayloadRef.current = payloadStr
          setSyncStatus("success")
        } catch (err) {
          console.error(err)
          setSyncStatus("error")
        }
      }, 2500)
    }
  }, [projects, activeProjectId, isLoaded, syncSettings.url, syncSettings.apiKey, normalizeSyncUrl])

  useEffect(() => {
    if (!isLoaded || projects.length === 0) return
    try {
      localStorage.setItem("nodepad-backup", JSON.stringify(projects))
    } catch { /* ignore */ }
  }, [projects, isLoaded])

  const projectsRef = useRef(projects)
  useEffect(() => { projectsRef.current = projects }, [projects])

  const blocksRef = useRef<TextBlock[]>([])
  useEffect(() => { blocksRef.current = blocks }, [blocks])

  const generatingRef = useRef<Set<string>>(new Set())

  // Ghost logic...
  const generateGhostNote = useCallback(async (projectId: string) => {
    if (!settings.enabled) return
    const targetProject = projectsRef.current.find(p => p.id === projectId)
    if (!targetProject) return
    const enrichedBlocks = targetProject.blocks.filter(b => !b.isEnriching && b.category)
    if (enrichedBlocks.length < 5) return
    if ((targetProject.ghostNotes || []).length >= 5) return
    if (generatingRef.current.has(projectId)) return
    
    // ...Simplified for brevity, following the logic of the original
    generatingRef.current.add(projectId)
    const ghostId = "ghost-" + generateId()

    setProjects(prev => prev.map(p => p.id === projectId ? {
      ...p,
      ghostNotes: [...(p.ghostNotes || []), { id: ghostId, text: "", category: "thesis", isGenerating: true }],
      lastGhostBlockCount: enrichedBlocks.length,
      lastGhostTimestamp: Date.now()
    } : p))

    try {
      const context = enrichedBlocks.slice(-10).map(b => ({
        text: b.text,
        category: b.category,
        contentType: b.contentType,
      }))
      const previousSyntheses = (targetProject.lastGhostTexts || []).slice(-5)
      const data = await generateGhostClient(context, previousSyntheses)
      setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p
        return {
          ...p,
          ghostNotes: (p.ghostNotes || []).map(n =>
            n.id === ghostId ? { ...n, text: data.text, category: data.category, isGenerating: false } : n
          ),
          lastGhostTexts: [...(p.lastGhostTexts || []), data.text].slice(-10),
        }
      }))
    } catch (e: any) {
      console.error(e)
      const errorMsg = e?.message || ""
      const isRateLimited = errorMsg.includes("Too many requests") || errorMsg.includes("Insufficient credits") || errorMsg.includes("rate-limiting")

      if (isRateLimited && settings.modelId) {
        markModelAsExhausted(settings.modelId)
        // Fallback to Lite model
        const models = getModelsForProvider(settings.provider)
        const liteModel = models.find(m => m.id.includes("flash-lite") || m.id.includes("lite")) || models[models.length - 1]
        if (liteModel && liteModel.id !== settings.modelId) {
          updateSettings({ modelId: liteModel.id })
        }
      }

      setProjects(prev => prev.map(p => p.id === projectId
        ? { ...p, ghostNotes: (p.ghostNotes || []).filter(n => n.id !== ghostId) }
        : p
      ))
    } finally {
      generatingRef.current.delete(projectId)
    }
  }, [settings.enabled])

  // Clear AI errors across all projects when AI is turned off
  // Also retroactively parse subTasks for any existing tasks that lack them
  useEffect(() => {
    setProjects((current: Project[]) => {
      let changed = false
      const next = current.map(proj => {
        let projChanged = false
        const nextBlocks = proj.blocks.map(b => {
          let updatedBlock = { ...b }
          let blockChanged = false
          
          if (!settings.enabled && (b.isError || b.isEnriching)) {
            updatedBlock = { ...updatedBlock, isError: false, isEnriching: false, statusText: undefined }
            blockChanged = true
          }
          
          if (b.contentType === "task" && !b.subTasks) {
            updatedBlock = { ...updatedBlock, subTasks: parseSubTasks(b.text) }
            blockChanged = true
          }
          
          if (blockChanged) {
            projChanged = true
            return updatedBlock
          }
          return b
        })
        if (projChanged) changed = true
        return projChanged ? { ...proj, blocks: nextBlocks } : proj
      })
      return changed ? next : current
    })
  }, [settings.enabled])

    const enrichBlock = useCallback(async (projectId: string, id: string, text: string, category?: string, forcedType?: string, forceEnrich: boolean = false) => {
    if (!settings.enabled && !forceEnrich) {
      setProjects((current: Project[]) => current.map(proj => {
        if (proj.id !== projectId) return proj
        const block = proj.blocks.find(b => b.id === id)
        if (!block) return proj

        const isTask = block.contentType === "task" || forcedType === "task"
        if (isTask) {
          // Offline merging: Merge into the first existing task tile WITH THE SAME CATEGORY
          // Use block.category (already set in addBlock) or the passed category
          const targetCategory = block.category || category
          const mergeTarget = proj.blocks.find(b => 
            b.id !== id && 
            b.contentType === "task" && 
            (b.category === targetCategory || (!b.category && !targetCategory))
          )
          
          if (mergeTarget) {
            const mergedText = mergeTarget.text + "\n" + block.text
            return {
              ...proj,
              blocks: proj.blocks
                .filter(b => b.id !== id)
                .map(b => b.id === mergeTarget.id ? { 
                  ...b, 
                  text: mergedText, 
                  subTasks: parseSubTasks(mergedText, b.subTasks) 
                } : b)
            }
          }
        }

        // No merge target or not a task: just finalize
        return {
          ...proj,
          blocks: proj.blocks.map(b => b.id === id ? { 
            ...b, 
            isEnriching: false, 
            isError: false, 
            statusText: undefined, 
            subTasks: b.contentType === "task" ? parseSubTasks(b.text, b.subTasks) : b.subTasks 
          } : b)
        }
      }))
      return
    }
    const targetProject = projectsRef.current.find(p => p.id === projectId)
    if (!targetProject) return

    const context = targetProject.blocks
      .filter((b) => b.id !== id && !b.isEnriching)
      .map((b) => ({ id: b.id, text: b.text, category: b.category, annotation: b.annotation }))
      .slice(-15)

    try {
      const data = await enrichBlockClient(text, context.map(({ id: itemId, ...rest }) => ({ id: itemId, ...rest })), forcedType, category)
      const influencedBy = data.influencedByIndices ? (data.influencedByIndices as number[]).map((idx) => context[idx]?.id).filter(Boolean) as string[] : []

      setProjects((current: Project[]) => {
        let mergeTargetId = data.mergeWithIndex !== null && context[data.mergeWithIndex] ? context[data.mergeWithIndex].id : null

        const targetProject = current.find(p => p.id === projectId)
        if (targetProject && category && (forcedType === "task" || data.contentType === "task")) {
          const existingCategorized = targetProject.blocks.find(b => b.contentType === "task" && b.category === category && b.id !== id)
          if (existingCategorized) {
            mergeTargetId = existingCategorized.id
          }
        }

        const finalCategory = category || data.category

        return current.map(proj => {
          if (proj.id !== projectId) return proj
          if (mergeTargetId) {
            return {
              ...proj,
              blocks: proj.blocks.filter(b => b.id !== id).map(b => {
                if (b.id === mergeTargetId) {
                  const newText = b.text + "\n\n" + text
                  let newAnnotation = b.annotation || ""
                  if (data.annotation && !newAnnotation.includes(data.annotation)) {
                    newAnnotation = newAnnotation ? newAnnotation + "\n\n---\n\n" + data.annotation : data.annotation
                  }
                  return {
                    ...b,
                    text: newText,
                    contentType: b.contentType,
                    category: b.category || finalCategory,
                    annotation: newAnnotation,
                    confidence: data.confidence,
                    influencedBy,
                    isUnrelated: data.isUnrelated,
                    sources: data.sources ?? undefined,
                    isEnriching: false,
                    statusText: undefined,
                    isError: false,
                    subTasks: b.contentType === "task" || data.contentType === "task" ? parseSubTasks(newText, b.subTasks) : undefined
                  }
                }
                return b
              })
            }
          }
          return {
            ...proj,
            blocks: proj.blocks.map(b => b.id === id ? {
              ...b,
              contentType: forcedType || data.contentType,
              category: finalCategory,
              annotation: data.annotation,
              confidence: data.confidence,
              influencedBy,
              isUnrelated: data.isUnrelated,
              sources: data.sources ?? undefined,
              isEnriching: false,
              statusText: undefined,
              isError: false,
              subTasks: (forcedType || data.contentType) === "task" ? parseSubTasks(b.text, b.subTasks) : undefined
            } : b)
          }
        })
      })
      setTimeout(() => generateGhostNote(projectId), 2500)
    } catch (e: any) {
      console.warn(e)
      const errorMsg = e?.message || ""
      const isNoKey = errorMsg.includes("No API key") || errorMsg.includes("Invalid or missing API key")
      const isRateLimited = errorMsg.includes("Too many requests") || errorMsg.includes("Insufficient credits") || errorMsg.includes("rate-limiting")

      if (isRateLimited && settings.modelId) {
        markModelAsExhausted(settings.modelId)
        // Fallback to Lite model
        const models = getModelsForProvider(settings.provider)
        const liteModel = models.find(m => m.id.includes("flash-lite") || m.id.includes("lite")) || models[models.length - 1]
        if (liteModel && liteModel.id !== settings.modelId) {
          updateSettings({ modelId: liteModel.id })
        }
      }

      setProjects((current: Project[]) => current.map(proj => proj.id === projectId ? {
        ...proj,
        blocks: proj.blocks.map(b => b.id === id ? { ...b, isEnriching: false, isError: true, statusText: isNoKey ? "no-api-key" : (isRateLimited ? "rate-limited" : e.message) } : b)
      } : proj))
    }
  }, [generateGhostNote, settings.enabled])

  const addBlock = useCallback((text: string, forcedType?: ContentType) => {
    let resolvedText = text
    let resolvedType = forcedType
    let resolvedCategory: string | undefined = undefined

    if (!resolvedType) {
      const tagMatch = text.match(/^#([a-z]+)(?:\/([a-z]+))?\s+(.+)/i)
      if (tagMatch) {
        resolvedType = tagMatch[1].toLowerCase() as ContentType
        resolvedCategory = tagMatch[2]?.toLowerCase()
        resolvedText = tagMatch[3].trim()
      }
    }
    const newId = generateId()
    const heuristicType = resolvedType ?? detectContentType(resolvedText)
    const HIGH_CONFIDENCE_TYPES = new Set<ContentType>(["question", "reference", "quote", "task"])
    const enrichForcedType = resolvedType ?? (HIGH_CONFIDENCE_TYPES.has(heuristicType) ? heuristicType : undefined)
    const initialDisplayType: ContentType = resolvedType ?? (HIGH_CONFIDENCE_TYPES.has(heuristicType) ? heuristicType : "general")

    pushHistory(activeProjectId, blocksRef.current)
    updateActiveProject(p => ({
      ...p,
      blocks: [...p.blocks, { id: newId, text: resolvedText, category: resolvedCategory, timestamp: Date.now(), contentType: initialDisplayType, isEnriching: settings.enabled, subTasks: initialDisplayType === "task" ? parseSubTasks(resolvedText) : undefined }]
    }))
    setIsCommandKOpen(false)
    enrichBlock(activeProjectId, newId, resolvedText, resolvedCategory, enrichForcedType).catch(console.error)
  }, [activeProjectId, pushHistory, updateActiveProject, enrichBlock, settings.enabled])

  const deleteBlock = useCallback((id: string) => {
    pushHistory(activeProjectId, blocksRef.current)
    updateActiveProject(p => ({ ...p, blocks: p.blocks.filter(b => b.id !== id) }))
  }, [activeProjectId, pushHistory, updateActiveProject])

  const editBlock = useCallback((id: string, newText: string) => {
    const currentProj = projectsRef.current.find(p => p.id === activeProjectId)
    if (currentProj) {
      const currentBlock = currentProj.blocks.find(b => b.id === id)
      if (currentBlock && currentBlock.text !== newText) pushHistory(activeProjectId, currentProj.blocks)
    }
    setProjects(prev => {
      const proj = prev.find(p => p.id === activeProjectId)
      if (!proj) return prev
      const block = proj.blocks.find(b => b.id === id)
      if (!block || block.text === newText) return prev
      if (!debounceTimers.current[activeProjectId]) debounceTimers.current[activeProjectId] = {}
      if (debounceTimers.current[activeProjectId][id]) clearTimeout(debounceTimers.current[activeProjectId][id])
      debounceTimers.current[activeProjectId][id] = setTimeout(() => {
        enrichBlock(activeProjectId, id, newText, block.category).catch(console.error)
        delete debounceTimers.current[activeProjectId][id]
      }, 800)
      return prev.map(p => p.id === activeProjectId ? {
        ...p,
        blocks: p.blocks.map(b => b.id === id ? { ...b, text: newText, isEnriching: settings.enabled, isError: false, subTasks: b.contentType === "task" ? parseSubTasks(newText, b.subTasks) : b.subTasks } : b)
      } : p)
    })
  }, [activeProjectId, enrichBlock, pushHistory, settings.enabled])

  const reEnrichBlock = useCallback((id: string, newCategory?: string) => {
    const block = blocksRef.current.find(b => b.id === id)
    if (!block) return
    updateActiveProject(p => ({
      ...p,
      blocks: p.blocks.map(b => b.id === id ? { ...b, category: newCategory !== undefined ? newCategory : b.category, isEnriching: true } : b)
    }))
    enrichBlock(activeProjectId, id, block.text, newCategory || block.category, block.contentType, true).catch(console.error)
  }, [activeProjectId, updateActiveProject, enrichBlock])

  const editAnnotation = useCallback((id: string, newAnnotation: string) => {
    updateActiveProject(p => ({ ...p, blocks: p.blocks.map(b => b.id === id ? { ...b, annotation: newAnnotation } : b) }))
  }, [updateActiveProject])

  const toggleCollapse = useCallback((id: string) => {
    updateActiveProject(p => {
      const next = new Set(p.collapsedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...p, collapsedIds: [...next] }
    })
  }, [updateActiveProject])

  const handleTogglePin = useCallback((id: string) => {
    setProjects(current => current.map(p => p.id === activeProjectId ? {
      ...p,
      blocks: p.blocks.map(b => b.id === id ? { ...b, isPinned: !b.isPinned } : b)
    } : p))
  }, [activeProjectId])

  const handleToggleSubTask = useCallback((blockId: string, subTaskId: string) => {
    setProjects(current => current.map(p => p.id === activeProjectId ? {
      ...p,
      blocks: p.blocks.map(b => {
        if (b.id !== blockId || !b.subTasks) return b
        const nextSubTasks = b.subTasks.map(st => st.id === subTaskId ? { ...st, isDone: !st.isDone } : st)
        const updatedText = nextSubTasks.map(st => (st.isDone ? "[x] " : "[ ] ") + st.text).join('\n')
        return { ...b, subTasks: nextSubTasks, text: updatedText }
      })
    } : p))
  }, [activeProjectId])

  const handleDeleteSubTask = useCallback((blockId: string, subTaskId: string) => {
    setProjects(current => current.map(p => p.id === activeProjectId ? {
      ...p,
      blocks: p.blocks.map(b => {
        if (b.id !== blockId || !b.subTasks) return b
        const nextSubTasks = b.subTasks.filter(st => st.id !== subTaskId)
        const updatedText = nextSubTasks.length > 0 
          ? nextSubTasks.map(st => (st.isDone ? "[x] " : "[ ] ") + st.text).join('\n')
          : ""
        return { ...b, subTasks: nextSubTasks, text: updatedText }
      })
    } : p))
  }, [activeProjectId])

  const handleChangeType = useCallback((id: string, newType: ContentType) => {
    const block = blocksRef.current.find(b => b.id === id)
    if (!block) return
    pushHistory(activeProjectId, blocksRef.current)
    updateActiveProject(p => ({
      ...p,
      blocks: p.blocks.map(b => b.id === id ? { ...b, contentType: newType, isEnriching: true, subTasks: newType === "task" && !b.subTasks ? parseSubTasks(b.text) : (newType === "task" ? b.subTasks : undefined) } : b)
    }))
    enrichBlock(activeProjectId, id, block.text, block.category, newType).catch(console.error)
  }, [activeProjectId, pushHistory, updateActiveProject, enrichBlock])

  const clearBlocks = useCallback(() => {
    pushHistory(activeProjectId, blocksRef.current)
    updateActiveProject(p => ({ ...p, blocks: [], collapsedIds: [] }))
  }, [activeProjectId, pushHistory, updateActiveProject])

  const createProject = useCallback(() => {
    const newProject: Project = { id: generateId(), name: "New Space", blocks: [], collapsedIds: [], ghostNotes: [] }
    setProjects(prev => [...prev, newProject])
    setActiveProjectId(newProject.id)
  }, [])

  const renameProject = useCallback((id: string, newName: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p))
  }, [])

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => {
      if (prev.length <= 1) return prev
      const nextProjects = prev.filter(p => p.id !== id)
      if (activeProjectId === id) setActiveProjectId(nextProjects[0].id)
      return nextProjects
    })
  }, [activeProjectId])

  const claimGhostNote = useCallback((id: string) => {
    const note = (activeProject?.ghostNotes || []).find(n => n.id === id)
    if (!note || note.isGenerating) return
    const newId = generateId()
    const { text, category } = note
    updateActiveProject(p => {
      const updatedProject = {
        ...p,
        blocks: [...p.blocks, { id: newId, text, timestamp: Date.now(), contentType: "thesis" as ContentType, category, isEnriching: true }],
        ghostNotes: (p.ghostNotes || []).filter(n => n.id !== id),
      }
      enrichBlock(p.id, newId, text, category, "thesis")
      return updatedProject
    })
  }, [activeProject, updateActiveProject, enrichBlock])

  const dismissGhostNote = useCallback((id: string) => {
    updateActiveProject(p => ({
      ...p,
      ghostNotes: (p.ghostNotes || []).filter(n => n.id !== id),
    }))
  }, [updateActiveProject])

  const handleCommand = useCallback((cmd: string, text?: string) => {
    setIsCommandKOpen(false)
    if (cmd === "kanban") setViewMode("kanban")
    else if (cmd === "tiling") setViewMode("tiling")
    else if (cmd === "graph") setViewMode("graph")
    else if (cmd === "inbox") setViewMode("inbox")
    else if (cmd === "open-projects") setIsSidebarOpen(prev => !prev)
    else if (cmd === "new-project") createProject()
    else if (cmd === "open-index") setIsIndexOpen(prev => !prev)
    else if (cmd === "open-synthesis") setIsGhostPanelOpen(prev => !prev)
    else if (cmd === "clear") clearBlocks()
    else if (cmd === "export-nodepad") {
      const proj = projectsRef.current.find(p => p.id === activeProjectId)
      if (proj) downloadNodepadFile(proj)
    } else if (cmd === "export-md") {
      const proj = projectsRef.current.find(p => p.id === activeProjectId)
      if (proj) downloadMarkdown(`${proj.name.toLowerCase().replace(/\s+/g, "-")}.md`, exportToMarkdown(proj.name, proj.blocks))
    } else if (cmd === "copy-md") {
      const proj = projectsRef.current.find(p => p.id === activeProjectId)
      if (proj) copyToClipboard(exportToMarkdown(proj.name, proj.blocks))
    } else if (cmd === "task" && text) addBlock(text, "task")
    else if (cmd === "thesis" && text) addBlock(text, "thesis")
  }, [clearBlocks, addBlock, activeProjectId, createProject])

  return {
    projects, setProjects,
    activeProjectId, setActiveProjectId,
    activeProject,
    blocks, ghostNotes,
    highlightedBlockId, setHighlightedBlockId,
    isLoaded,
    isSidebarOpen, setIsSidebarOpen,
    isIndexOpen, setIsIndexOpen,
    isGhostPanelOpen, setIsGhostPanelOpen,
    viewMode, setViewMode,
    isCommandKOpen, setIsCommandKOpen,
    isSettingsOpen, setIsSettingsOpen,
    isIntroOpen, setIsIntroOpen,
    isAboutOpen, setIsAboutOpen,
    showHelpTooltip, setShowHelpTooltip,
    highlightedSection, setHighlightedSection,
    helpTooltipTimer,
    undoToast, setUndoToast,
    syncStatus,
    settings, updateSettings, resolvedModelId, currentModel, isHydrated,
    syncSettings, updateSyncSettings, isSyncHydrated,
    undo, addBlock, deleteBlock, editBlock, reEnrichBlock, editAnnotation,
    toggleCollapse, handleTogglePin, handleToggleSubTask, handleDeleteSubTask,
    handleChangeType, clearBlocks, createProject, renameProject, deleteProject,
    claimGhostNote, dismissGhostNote, handleCommand,
  }
}
