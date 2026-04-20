"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trello, Grid, Trash2, Clipboard, Download,
  FolderOpen, FolderPlus, BookOpen, Sparkles,
  FolderDown, FolderInput, GitFork, X, Hash
} from "lucide-react"
import { Command } from "cmdk"
import { useModKey } from "@/lib/utils"
import { CONTENT_TYPE_CONFIG, type ContentType } from "@/lib/content-types"

const ACTION_ITEMS = [
  { id: "export-nodepad", icon: FolderDown,  label: "Export",  sub: ".nodepad"  },
  { id: "import-nodepad", icon: FolderInput, label: "Import",  sub: ".nodepad"  },
  { id: "export-md",      icon: Download,    label: "Export",  sub: "markdown"  },
  { id: "copy-md",        icon: Clipboard,   label: "Copy",    sub: "markdown"  },
  { id: "clear",          icon: Trash2,      label: "Clear",   sub: "canvas"    },
]

// ─── Props ───────────────────────────────────────────────────────────────────

interface VimInputProps {
  onSubmit: (text: string) => void
  onCommand: (cmd: string, text?: string) => void
  isCommandKOpen: boolean
  setIsCommandKOpen: (open: boolean) => void
  viewMode?: string
  existingCategories?: string[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VimInput({ onSubmit, onCommand, isCommandKOpen, setIsCommandKOpen, viewMode, existingCategories }: VimInputProps) {
  const [value, setValue] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [focusedIdx, setFocusedIdx] = React.useState(0)
  const [suggestIdx, setSuggestIdx] = React.useState(0)
  const mod = useModKey()

  const mainInputRef = React.useRef<HTMLInputElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  // ── Items (mod-key aware) ───────────────────────────────────────────────

  const VIEW_ITEMS = React.useMemo(() => [
    { id: "tiling", icon: Grid,    label: "Tiling", sub: "" },
    { id: "kanban", icon: Trello,  label: "Kanban", sub: "" },
    { id: "graph",  icon: GitFork, label: "Graph",  sub: "" },
  ], [])

  const NAV_ITEMS = React.useMemo(() => [
    { id: "open-projects",  icon: FolderOpen, label: "Projects",    sub: "" },
    { id: "new-project",    icon: FolderPlus, label: "New Project", sub: "" },
    { id: "open-index",     icon: BookOpen,   label: "Index",       sub: "" },
    { id: "open-synthesis", icon: Sparkles,   label: "Synthesis",   sub: "" },
  ], [])

  // ── Filtered items ──────────────────────────────────────────────────────

  const q = search.toLowerCase()
  const viewItems   = q ? VIEW_ITEMS.filter(i => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q))   : VIEW_ITEMS
  const navItems    = q ? NAV_ITEMS.filter(i  => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q))    : NAV_ITEMS
  const actionItems = q ? ACTION_ITEMS.filter(i => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)) : ACTION_ITEMS

  const viewCount   = viewItems.length
  const navCount    = navItems.length
  const actionCount = actionItems.length
  const totalItems  = viewCount + navCount + actionCount

  // Section boundaries for keyboard nav
  // Section 0: views   [0 .. viewCount)
  // Section 1: nav     [viewCount .. viewCount+navCount)
  // Section 2: actions [viewCount+navCount .. total)
  const sections = React.useMemo(() => [
    { start: 0,                    count: viewCount,   cols: 3 },
    { start: viewCount,            count: navCount,    cols: 4 },
    { start: viewCount + navCount, count: actionCount, cols: 5 },
  ], [viewCount, navCount, actionCount])

  const getSectionForIdx = React.useCallback((idx: number) => {
    return sections.find(s => idx >= s.start && idx < s.start + s.count) ?? sections[0]
  }, [sections])

  // ── Lifecycle ───────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (isCommandKOpen) {
      setSearch("")
      setFocusedIdx(0)
      requestAnimationFrame(() => searchInputRef.current?.focus())
    }
  }, [isCommandKOpen])

  React.useEffect(() => { setFocusedIdx(0) }, [search])

  // Scroll focused item into view
  React.useEffect(() => {
    itemRefs.current[focusedIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [focusedIdx])

  // ── Helpers ─────────────────────────────────────────────────────────────

  const close = React.useCallback(() => {
    setIsCommandKOpen(false)
    requestAnimationFrame(() => mainInputRef.current?.focus())
  }, [setIsCommandKOpen])

  const handleSelect = React.useCallback((cmd: string) => {
    onCommand(cmd, value)
    setSearch("")
    close()
  }, [onCommand, value, close])

  // ── Autocomplete Suggestions ──────────────────────────────────────────────
  const suggestMatch = value.match(/^#([a-z]*)(?:\/([a-z0-9-]*))?$/i)
  const isCategoryMode = suggestMatch && suggestMatch[2] !== undefined
  const typeQuery = suggestMatch ? suggestMatch[1].toLowerCase() : ""
  const categoryQuery = isCategoryMode ? suggestMatch[2]!.toLowerCase() : ""
  
  const suggestItems = React.useMemo(() => {
    if (!suggestMatch) return []
    
    if (isCategoryMode) {
      const allCats = existingCategories || []
      const filtered = allCats.filter(c => c.toLowerCase().includes(categoryQuery))
      return filtered.map(c => ({
        id: c,
        label: "Category",
        icon: Hash,
        accentVar: "var(--type-general)",
        isCategory: true
      }))
    } else {
      const items = (Object.entries(CONTENT_TYPE_CONFIG) as [ContentType, typeof CONTENT_TYPE_CONFIG[ContentType]][])
        .map(([id, config]) => ({ id, ...config, isCategory: false }))
      return items.filter(i => i.id.toLowerCase().includes(typeQuery) || i.label.toLowerCase().includes(typeQuery))
    }
  }, [suggestMatch, isCategoryMode, typeQuery, categoryQuery, existingCategories])

  React.useEffect(() => {
    setSuggestIdx(0)
  }, [typeQuery, categoryQuery])

  // ── Grid keyboard navigation ─────────────────────────────────────────────

  const getItemAtIdx = React.useCallback((idx: number): string | null => {
    if (idx < viewCount)                        return viewItems[idx]?.id ?? null
    if (idx < viewCount + navCount)             return navItems[idx - viewCount]?.id ?? null
    if (idx < viewCount + navCount + actionCount) return actionItems[idx - viewCount - navCount]?.id ?? null
    return null
  }, [viewCount, navCount, actionCount, viewItems, navItems, actionItems])

  const handlePopupKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (totalItems === 0) return
    const sec      = getSectionForIdx(focusedIdx)
    const localIdx = focusedIdx - sec.start
    const rowStart = sec.start + Math.floor(localIdx / sec.cols) * sec.cols
    const rowEnd   = Math.min(rowStart + sec.cols - 1, sec.start + sec.count - 1)

    switch (e.key) {
      case "Escape":
        e.preventDefault()
        close()
        break

      case "Enter": {
        e.preventDefault()
        const id = getItemAtIdx(focusedIdx)
        if (id) handleSelect(id)
        break
      }

      case "ArrowRight":
        e.preventDefault()
        setFocusedIdx(focusedIdx >= rowEnd ? rowStart : focusedIdx + 1)
        break

      case "ArrowLeft":
        e.preventDefault()
        setFocusedIdx(focusedIdx <= rowStart ? rowEnd : focusedIdx - 1)
        break

      case "ArrowDown": {
        e.preventDefault()
        const nextInSec = focusedIdx + sec.cols
        if (nextInSec < sec.start + sec.count) {
          setFocusedIdx(nextInSec)
        } else {
          // Move to first item of next section
          const nextSecStart = sec.start + sec.count
          if (nextSecStart < totalItems) {
            const col = localIdx % sec.cols
            const ns  = getSectionForIdx(nextSecStart)
            setFocusedIdx(Math.min(nextSecStart + col, nextSecStart + ns.count - 1))
          }
        }
        break
      }

      case "ArrowUp": {
        e.preventDefault()
        const prevInSec = focusedIdx - sec.cols
        if (prevInSec >= sec.start) {
          setFocusedIdx(prevInSec)
        } else if (sec.start > 0) {
          // Move to last row of previous section
          const prevSecEnd   = sec.start - 1
          const ps           = getSectionForIdx(prevSecEnd)
          const col          = localIdx % sec.cols
          const lastRowStart = ps.start + Math.floor((ps.count - 1) / ps.cols) * ps.cols
          setFocusedIdx(Math.min(lastRowStart + col, ps.start + ps.count - 1))
        }
        break
      }
    }
  }, [focusedIdx, totalItems, getSectionForIdx, getItemAtIdx, close, handleSelect])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full relative z-[110] flex flex-col items-center">
      <Command
        className="w-full"
        onKeyDown={(e) => {
          if (suggestItems.length > 0 && suggestMatch && !isCommandKOpen) {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setSuggestIdx(prev => (prev + 1) % suggestItems.length)
              return
            }
            if (e.key === "ArrowUp") {
              e.preventDefault()
              setSuggestIdx(prev => (prev - 1 + suggestItems.length) % suggestItems.length)
              return
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault()
              const selected = suggestItems[suggestIdx]
              if (selected) {
                if (selected.isCategory) {
                  setValue(`#${typeQuery}/${selected.id} `)
                } else {
                  setValue(`#${selected.id} `)
                }
              }
              return
            }
            if (e.key === "Escape") {
              // Just hide the menu by appending a space, or we could add a state, but space is easiest
              // Actually, better to just let it fall through or do nothing, 
              // but to really dismiss we can just clear the match by setting value to "# "
              e.preventDefault()
              setValue(value + " ")
              return
            }
          }

          if (e.key === "Enter" && value.trim() && !isCommandKOpen) {
            onSubmit(value.trim())
            setValue("")
          }
          if (e.key === "Escape") setIsCommandKOpen(false)
        }}
      >
        {/* ── Command Popup ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {isCommandKOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[-1] bg-black/20"
                onClick={() => setIsCommandKOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute bottom-full left-0 right-0 w-full border-t border-white/10 bg-black/85 backdrop-blur-3xl shadow-[0_-24px_60px_-12px_rgba(0,0,0,0.6)]"
                onKeyDown={handlePopupKeyDown}
              >
              {/* Search input */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">

                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search commands…"
                  className="flex-1 bg-transparent font-mono text-xs text-white/70 placeholder:text-white/55 outline-none"
                />
                {search ? (
                  <button
                    onClick={() => setSearch("")}
                    className="text-white/40 hover:text-white/70 transition-colors text-[10px] font-mono"
                  >
                    clear
                  </button>
                ) : (
                  <button
                    onClick={() => setIsCommandKOpen(false)}
                    className="text-white/40 hover:text-white/70 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="p-3 max-h-[360px] overflow-y-auto scrollbar-none space-y-3">

                {/* ── Views ──────────────────────────────────────────────── */}
                {viewItems.length > 0 && (
                  <div>
                    <p className="px-1 pb-2 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-white/45">Views</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {viewItems.map((item, i) => {
                        const focused = focusedIdx === i
                        return (
                          <button
                            key={item.id}
                            ref={el => { itemRefs.current[i] = el }}
                            onClick={() => handleSelect(item.id)}
                            onMouseEnter={() => setFocusedIdx(i)}
                            className={`group flex flex-col items-center justify-center gap-2 rounded-sm border py-4 px-2 transition-all duration-100 outline-none ${focused ? "bg-primary/12 border-primary/35 text-primary shadow-[0_0_0_1px_var(--primary),inset_0_1px_0_rgba(255,255,255,0.05)]" : "bg-white/[0.03] border-white/[0.07] text-white/55 hover:bg-white/[0.06] hover:border-white/20 hover:text-white/80"}`}
                          >
                            <item.icon className={`h-[18px] w-[18px] transition-transform duration-100 ${focused ? "scale-110" : "group-hover:scale-105"}`} />
                            <div className="text-center leading-tight">
                              <div className="font-mono text-[10px] font-bold tracking-tight">{item.label}</div>
                              {item.sub && <div className={`font-mono text-[7px] uppercase tracking-[0.15em] mt-0.5 ${focused ? "text-primary/60" : "text-white/40"}`}>{item.sub}</div>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Navigate ───────────────────────────────────────────── */}
                {navItems.length > 0 && (
                  <div className="border-t border-white/10 pt-3">
                    <p className="px-1 pb-2 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-white/45">Navigate</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {navItems.map((item, i) => {
                        const idx     = viewCount + i
                        const focused = focusedIdx === idx
                        return (
                          <button
                            key={item.id}
                            ref={el => { itemRefs.current[idx] = el }}
                            onClick={() => handleSelect(item.id)}
                            onMouseEnter={() => setFocusedIdx(idx)}
                            className={`group flex flex-col items-center justify-center gap-2 rounded-sm border py-4 px-2 transition-all duration-100 outline-none ${focused ? "bg-primary/12 border-primary/35 text-primary shadow-[0_0_0_1px_var(--primary),inset_0_1px_0_rgba(255,255,255,0.05)]" : "bg-white/[0.03] border-white/[0.07] text-white/55 hover:bg-white/[0.06] hover:border-white/20 hover:text-white/80"}`}
                          >
                            <item.icon className={`h-[18px] w-[18px] transition-transform duration-100 ${focused ? "scale-110" : "group-hover:scale-105"}`} />
                            <div className="text-center leading-tight">
                              <div className="font-mono text-[10px] font-bold tracking-tight">{item.label}</div>
                              {item.sub && <div className={`font-mono text-[7px] uppercase tracking-[0.15em] mt-0.5 ${focused ? "text-primary/60" : "text-white/40"}`}>{item.sub}</div>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Actions ────────────────────────────────────────────── */}
                {actionItems.length > 0 && (
                  <div className="border-t border-white/10 pt-3">
                    <p className="px-1 pb-2 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-white/45">Actions</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {actionItems.map((item, i) => {
                        const idx     = viewCount + navCount + i
                        const focused = focusedIdx === idx
                        return (
                          <button
                            key={item.id}
                            ref={el => { itemRefs.current[idx] = el }}
                            onClick={() => handleSelect(item.id)}
                            onMouseEnter={() => setFocusedIdx(idx)}
                            className={`group flex flex-col items-center justify-center gap-2 rounded-sm border py-4 px-2 transition-all duration-100 outline-none ${focused ? "bg-primary/12 border-primary/35 text-primary shadow-[0_0_0_1px_var(--primary),inset_0_1px_0_rgba(255,255,255,0.05)]" : "bg-white/[0.03] border-white/[0.07] text-white/55 hover:bg-white/[0.06] hover:border-white/20 hover:text-white/80"}`}
                          >
                            <item.icon className={`h-[18px] w-[18px] transition-transform duration-100 ${focused ? "scale-110" : "group-hover:scale-105"}`} />
                            <div className="text-center leading-tight">
                              <div className="font-mono text-[10px] font-bold tracking-tight">{item.label}</div>
                              <div className={`font-mono text-[7px] uppercase tracking-[0.15em] mt-0.5 ${focused ? "text-primary/60" : "text-white/40"}`}>{item.sub}</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Empty state ────────────────────────────────────────── */}
                {totalItems === 0 && (
                  <div className="py-10 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">
                    No commands match
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="flex items-center justify-end gap-4 px-5 py-2 border-t border-white/10">
                {[
                  ["↑↓", "rows"],
                  ["←→", "tiles"],
                  ["↵",  "select"],
                  ["esc","close"],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <kbd className="font-mono text-[9px] text-white/50 bg-white/8 border border-white/15 rounded px-1 py-0.5">{key}</kbd>
                    <span className="font-mono text-[8px] uppercase tracking-wider text-white/60">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Autocomplete Menu ──────────────────────────────────────────── */}
        <AnimatePresence>
          {suggestMatch && suggestItems.length > 0 && !isCommandKOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-3 w-[300px] overflow-hidden rounded-md border border-white/10 bg-[#0d0d10] shadow-2xl z-[120] custom-scrollbar max-h-[320px] flex flex-col"
            >
              <div className="px-3 py-2 border-b border-white/5 font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex justify-between items-center">
                <span>{isCategoryMode ? "Suggested Categories" : "Suggested Blocks"}</span>
                <span className="text-[8px] opacity-50 font-normal normal-case">Tab / Enter</span>
              </div>
              <div className="p-1.5 flex flex-col gap-0.5 overflow-y-auto">
                {suggestItems.map((item, i) => {
                  const Icon = item.icon
                  const isActive = i === suggestIdx
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-2 py-2 rounded-sm cursor-pointer transition-colors ${
                        isActive ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                      onClick={() => {
                        if (item.isCategory) {
                          setValue(`#${typeQuery}/${item.id} `)
                        } else {
                          setValue(`#${item.id} `)
                        }
                        mainInputRef.current?.focus()
                      }}
                      onMouseEnter={() => setSuggestIdx(i)}
                    >
                      <div className="flex items-center justify-center w-5 h-5 rounded bg-white/5 text-muted-foreground" style={{ color: item.accentVar }}>
                        <Icon size={12} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono text-[11px] font-bold text-white capitalize">{item.id}</span>
                        <span className="font-mono text-[9px] text-muted-foreground">{item.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Input Bar ─────────────────────────────────────────────── */}
        <div className="w-full border-t border-white/20 bg-black/80 backdrop-blur-3xl px-6 py-5 flex items-center gap-4 transition-all duration-300 focus-within:border-primary/40 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <div className="flex items-center gap-3 flex-1">
            <div className="font-mono text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] select-none">
              Entry
            </div>
            <Command.Input
              ref={mainInputRef}
              value={value}
              onValueChange={setValue}
              placeholder="Capture something..."
              className="flex-1 bg-transparent font-mono text-sm tracking-tight text-white outline-none placeholder:text-white/55"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-3">
            <button

              onClick={() => {
                if (value.trim()) {
                  onSubmit(value.trim())
                  setValue("")
                  setIsCommandKOpen(false)
                }
              }}
              className="font-mono text-[10px] font-bold text-primary uppercase tracking-widest hover:brightness-125 transition-all active:scale-95 disabled:opacity-20"
              disabled={!value.trim()}
            >
              Submit
            </button>
          </div>
        </div>
      </Command>
    </div>
  )
}
