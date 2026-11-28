"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Block } from "@/types/blocks"
import { BlockRenderer } from "@/components/blocks"
import { GripVertical, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import styles from "./EditorCanvas.module.css"

interface SortableBlockProps {
  block: Block
  primaryColor: string
  onUpdate: (blockId: string, data: Block["data"]) => void
  onDelete: (blockId: string) => void
  onMove: (blockId: string, direction: -1 | 1) => void
  first: boolean
  last: boolean
}

function SortableBlock({ block, primaryColor, onUpdate, onDelete, onMove, first, last }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
    >
      {/* Drag Handle and Delete */}
      <div className="flex items-center justify-end gap-1 border-b border-gray-100 p-1">
        <button
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${block.type} block`}
          className="touch-none p-2 bg-gray-100 rounded hover:bg-gray-200 cursor-grab"
        >
          <GripVertical className="w-4 h-4 text-gray-500" />
        </button>
        <button aria-label={`Move ${block.type} block up`} disabled={first} onClick={() => onMove(block.id, -1)} className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
        <button aria-label={`Move ${block.type} block down`} disabled={last} onClick={() => onMove(block.id, 1)} className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
        <button
          aria-label={`Delete ${block.type} block`}
          onClick={() => onDelete(block.id)}
          className="p-2 bg-red-100 rounded hover:bg-red-200"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>

      <div className={styles.blockContent} data-block-type={block.type}>
      <BlockRenderer
        block={block}
        isEditing={true}
        onUpdate={(data) => onUpdate(block.id, data)}
        primaryColor={primaryColor}
      />
      </div>
    </div>
  )
}

interface EditorCanvasProps {
  blocks: Block[]
  primaryColor: string
  onUpdateBlock: (blockId: string, data: Block["data"]) => void
  onDeleteBlock: (blockId: string) => void
  onMoveBlock: (blockId: string, direction: -1 | 1) => void
}

export function EditorCanvas({
  blocks,
  primaryColor,
  onUpdateBlock,
  onDeleteBlock,
  onMoveBlock,
}: EditorCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas",
  })

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-gray-50 p-2 md:p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <div
          ref={setNodeRef}
          className={`min-h-full p-1 md:p-4 rounded-lg transition-colors ${
            isOver ? "bg-blue-50 border-2 border-dashed border-blue-300" : ""
          }`}
        >
          {blocks.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <p className="text-lg mb-2">Your canvas is empty</p>
                <p className="text-sm">Add a block or drag one here to get started</p>
              </div>
            </div>
          ) : (
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    primaryColor={primaryColor}
                    onUpdate={onUpdateBlock}
                    onDelete={onDeleteBlock}
                    onMove={onMoveBlock}
                    first={index === 0}
                    last={index === blocks.length - 1}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  )
}
