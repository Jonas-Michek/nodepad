"use client"

import { useRef, useEffect, useState } from "react"
import { TileCard, type TextBlock } from "@/components/tile-card"
import { useModKey } from "@/lib/utils"

interface InboxAreaProps {
  blocks: TextBlock[]
  onDelete: (id: string) => void
  onEdit: (id: string, newText: string) => void
  onEditAnnotation: (id: string, newAnnotation: string) => void
  onReEnrich: (id: string, newCategory?: string) => void
  onChangeType: (id: string, newType: import("@/lib/content-types").ContentType) => void
  onToggleCollapse: (id: string) => void
  onTogglePin: (id: string) => void
  onToggleSubTask: (id: string, subTaskId: string) => void
  onDeleteSubTask: (id: string, subTaskId: string) => void
  collapsedIds: Set<string>
  highlightedBlockId?: string | null
  onHighlight?: (id: string | null) => void
}

export function InboxArea({
  blocks,
  onDelete,
  onEdit,
  onEditAnnotation,
  onReEnrich,
  onChangeType,
  onToggleCollapse,
  onTogglePin,
  onToggleSubTask,
  onDeleteSubTask,
  collapsedIds,
  highlightedBlockId,
  onHighlight,
}: InboxAreaProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [sessionStartTime] = useState(() => Date.now())
  const mod = useModKey()
  const containerRef = useRef<HTMLDivElement>(null)

  // Sort chronologically (oldest first, newest at the bottom)
  const sortedBlocks = [...blocks].sort((a, b) => a.timestamp - b.timestamp)

  // Auto-scroll to recently added block (bottom)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [blocks.length])

  const hasHiddenBlocks = sortedBlocks.some(b => b.timestamp < sessionStartTime)
  const allMobileHidden = !showHistory && sortedBlocks.every(b => b.timestamp < sessionStartTime)

  return (
    <div className="relative h-full w-full bg-[#050505] overflow-hidden flex flex-col pt-4 md:pt-10">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 pb-24 md:pb-32 custom-scrollbar"
      >
        <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full min-h-full">
          
          {hasHiddenBlocks && !showHistory && (
            <div className="md:hidden flex justify-center py-6">
              <button 
                onClick={() => setShowHistory(true)}
                className="text-[10px] font-mono text-white/40 hover:text-white/80 transition-colors uppercase tracking-widest border border-white/10 rounded-full px-5 py-2.5 bg-white/5 backdrop-blur-md"
              >
                Load History ({sortedBlocks.filter(b => b.timestamp < sessionStartTime).length})
              </button>
            </div>
          )}

          <div className="flex flex-col gap-4 flex-1">
            {sortedBlocks.map(block => {
              const collapsed = collapsedIds.has(block.id)
              const isHighlighted = highlightedBlockId === block.id
              const isNew = block.timestamp >= sessionStartTime
              const isHiddenMobile = !isNew && !showHistory

              return (
                <div
                  key={block.id}
                  className={`transition-[height,opacity] duration-300 ${collapsed ? 'h-[38px]' : ''} ${
                    highlightedBlockId && !isHighlighted ? 'opacity-15 saturate-0' : 'opacity-100'
                  } ${isHiddenMobile ? 'hidden md:block' : ''}`}
                  onMouseEnter={() => onHighlight?.(block.id)}
                  onMouseLeave={() => onHighlight?.(null)}
                >
                  <TileCard
                    block={block}
                    isCollapsed={collapsed}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onEditAnnotation={onEditAnnotation}
                    onReEnrich={onReEnrich}
                    onChangeType={onChangeType}
                    onToggleCollapse={onToggleCollapse}
                    onToggleSubTask={onToggleSubTask}
                    onDeleteSubTask={onDeleteSubTask}
                    allBlocks={blocks}
                    onConnectionHover={() => {}}
                    onConnectionLock={() => {}}
                    isConnectionLocked={false}
                  />
                </div>
              )
            })}

            {/* Mobile Empty State / Greeting (ChatGPT style) */}
            {(blocks.length === 0 || allMobileHidden) && (
              <div className={`flex-1 flex flex-col items-center justify-center py-20 gap-6 w-full text-center pointer-events-none ${blocks.length === 0 ? '' : 'md:hidden'}`}>
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shadow-[0_0_30px_-5px_var(--primary)]">
                    <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                  </div>
                </div>
                <h2 className="font-mono text-[18px] text-white/90 font-medium tracking-tight">What's on your mind?</h2>
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] text-foreground/40 font-mono tracking-wide">
                    Capture a thought, task, or idea.
                  </span>
                  <span className="text-[11px] text-foreground/30 font-mono tracking-widest lowercase mt-4 opacity-50">
                    type anything · #type to classify
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
