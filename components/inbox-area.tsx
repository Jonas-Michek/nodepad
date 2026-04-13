"use client"

import { useRef, useEffect } from "react"
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

  return (
    <div className="relative h-full w-full bg-[#050505] overflow-hidden flex flex-col pt-4 md:pt-10">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 pb-24 md:pb-32 custom-scrollbar"
      >
        <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
          {sortedBlocks.map(block => {
            const collapsed = collapsedIds.has(block.id)
            const isHighlighted = highlightedBlockId === block.id
            return (
              <div
                key={block.id}
                className={`transition-[height,opacity] duration-300 ${collapsed ? 'h-[38px]' : ''} ${
                  highlightedBlockId && !isHighlighted ? 'opacity-15 saturate-0' : 'opacity-100'
                }`}
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
                  // Not supporting complex connections/lines in the Inbox View to keep it simple,
                  // but we pass empty handlers for type safety
                  onConnectionHover={() => {}}
                  onConnectionLock={() => {}}
                  isConnectionLocked={false}
                />
              </div>
            )
          })}

          {/* Empty state specifically for Inbox */}
          {blocks.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-20 md:mt-32 gap-6 w-full text-center pointer-events-none">
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-foreground/35">quick inbox</p>
              <div className="flex flex-col gap-3">
                <span className="font-mono text-[12px] uppercase tracking-[0.2em] text-foreground/50">Capture thoughts quickly</span>
                <span className="text-[13px] text-foreground/40 font-mono tracking-[0.1em]">
                  {`type anything · #type to classify`}
                </span>
                <span className="text-[11px] text-foreground/30 font-mono tracking-[0.1em] lowercase mt-3 opacity-60">
                  {`press ${mod}k for views and commands`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
