"use client"

import { useDraggable } from "@dnd-kit/core"
import { BlockType } from "@/types/blocks"
import {
  User,
  FileText,
  Link,
  Grid3X3,
  Mail,
  Minus,
} from "lucide-react"

interface BlockTypeConfig {
  type: BlockType
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const BLOCK_TYPES: BlockTypeConfig[] = [
  { type: "hero", label: "Hero", icon: User, description: "Profile header with photo and bio" },
  { type: "about", label: "About", icon: FileText, description: "Longer text section" },
  { type: "links", label: "Links", icon: Link, description: "Social links and buttons" },
  { type: "portfolio", label: "Portfolio", icon: Grid3X3, description: "Project showcase grid" },
  { type: "contact", label: "Contact", icon: Mail, description: "Email and calendar links" },
  { type: "divider", label: "Divider", icon: Minus, description: "Space or visual separator" },
]

interface DraggableBlockTypeProps {
  config: BlockTypeConfig
  onAdd: (type: BlockType) => void
}

function DraggableBlockType({ config, onAdd }: DraggableBlockTypeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new-${config.type}`,
    data: {
      type: "new-block",
      blockType: config.type,
    },
  })

  const Icon = config.icon

  return (
    <button
      type="button"
      onClick={() => onAdd(config.type)}
      aria-label={`Add ${config.label} block`}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onKeyDown={undefined}
      aria-describedby={undefined}
      aria-roledescription={undefined}
      aria-pressed={undefined}
      className={`w-full text-left p-2 md:p-3 border border-gray-200 rounded-lg cursor-grab hover:border-blue-500 hover:bg-blue-50 transition-colors ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="hidden md:flex w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <div className="font-medium text-gray-900">{config.label}</div>
          <div className="hidden md:block text-xs text-gray-500">{config.description}</div>
        </div>
      </div>
    </button>
  )
}

export function BlockSidebar({ onAddBlock }: { onAddBlock: (type: BlockType) => void }) {
  return (
    <div className="shrink-0 w-full md:w-60 bg-white border-r border-b border-gray-200 p-2 md:p-4 md:overflow-y-auto">
      <h3 className="font-semibold text-gray-900 mb-2">Add Blocks</h3>
      <p className="hidden md:block text-sm text-gray-500 mb-4">
        Select a block to add it, or drag it to the canvas
      </p>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
        {BLOCK_TYPES.map((config) => (
          <DraggableBlockType key={config.type} config={config} onAdd={onAddBlock} />
        ))}
      </div>
    </div>
  )
}
