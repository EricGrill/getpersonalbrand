"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, CollisionDetection,
  MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Block, BlockType, SiteTheme, createBlock, DEFAULT_THEME } from "@/types/blocks"
import { BlockSidebar } from "./BlockSidebar"
import { EditorCanvas } from "./EditorCanvas"
import { ThemePanel } from "./ThemePanel"
import { Save, Eye, Settings } from "lucide-react"

interface PageEditorProps {
  initialBlocks: Block[]
  initialTheme: SiteTheme
  initialPublishedBlocks?: Block[] | null
  initialPublishedTheme?: SiteTheme | null
  isPublished?: boolean
  onSave: (blocks: Block[], theme: SiteTheme) => Promise<void>
  onPublish?: (published: boolean) => Promise<void>
  onPreview: () => void
  onDraftPreview?: () => { navigate: () => void; close: () => void } | null
  username: string
}

export function PageEditor({
  initialBlocks, initialTheme, initialPublishedBlocks, initialPublishedTheme,
  isPublished = false, onSave, onPublish, onPreview, onDraftPreview, username,
}: PageEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const [theme, setTheme] = useState<SiteTheme>(initialTheme || DEFAULT_THEME)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showThemePanel, setShowThemePanel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [published, setPublished] = useState(isPublished)
  const serialized = JSON.stringify({ blocks, theme })
  const [savedKey, setSavedKey] = useState(serialized)
  const [publishedKey, setPublishedKey] = useState(
    JSON.stringify({ blocks: initialPublishedBlocks, theme: initialPublishedTheme })
  )
  const savedRef = useRef(savedKey)
  const currentRef = useRef({ blocks, theme, key: serialized })
  const inFlight = useRef<Promise<string> | null>(null)
  const hasChanges = serialized !== savedKey
  const unpublished = !published || serialized !== publishedKey

  useEffect(() => {
    currentRef.current = { blocks, theme, key: serialized }
  }, [blocks, theme, serialized])

  const saveCurrent = useCallback(async () => {
    if (inFlight.current) return inFlight.current
    const current = currentRef.current
    if (savedRef.current === current.key) return current.key
    setSaving(true)
    setError(null)
    const request = (async () => {
      await onSave(current.blocks, current.theme)
      savedRef.current = current.key
      setSavedKey(current.key)
      return current.key
    })()
    inFlight.current = request
    try {
      return await request
    } finally {
      inFlight.current = null
      setSaving(false)
    }
  }, [onSave])

  const reportError = (cause: unknown) => {
    setError(cause instanceof Error ? cause.message : "Unable to save. Please try again.")
  }

  useEffect(() => {
    if (!hasChanges || saving || publishing || error) return
    const timer = window.setTimeout(() => { void saveCurrent().catch(reportError) }, 1000)
    return () => window.clearTimeout(timer)
  }, [hasChanges, serialized, saving, publishing, error, saveCurrent])

  useEffect(() => {
    if (!hasChanges) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    const beforeNavigate = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null
      if (!link?.href || link.target === "_blank" || link.hasAttribute("download") ||
          event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      if (!window.confirm("You have unsaved changes. Leave this page?")) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    const navigation = (window as Window & { navigation?: EventTarget }).navigation
    const beforeTraverse = (event: Event) => {
      const traversal = event as Event & { navigationType?: string; destination?: { sameDocument?: boolean } }
      if (traversal.navigationType === "traverse" && traversal.destination?.sameDocument &&
          event.cancelable && !window.confirm("You have unsaved changes. Leave this page?")) {
        event.preventDefault()
      }
    }
    navigation?.addEventListener("navigate", beforeTraverse)
    window.addEventListener("beforeunload", beforeUnload)
    document.addEventListener("click", beforeNavigate, true)
    return () => {
      navigation?.removeEventListener("navigate", beforeTraverse)
      window.removeEventListener("beforeunload", beforeUnload)
      document.removeEventListener("click", beforeNavigate, true)
    }
  }, [hasChanges])

  const detectCollision: CollisionDetection = (args) => closestCorners({
    ...args,
    droppableContainers: args.active.data.current?.type === "new-block"
      ? args.droppableContainers
      : args.droppableContainers.filter((container) => container.id !== "canvas"),
  })

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleAddBlock = (type: BlockType) => {
    if (blocks.length >= 30) { setError("You can add up to 30 blocks."); return }
    setError(null)
    setBlocks((previous) => [...previous, createBlock(type)])
  }

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    if (active.data.current?.type === "new-block") {
      if (blocks.length >= 30) { setError("You can add up to 30 blocks."); return }
      const newBlock = createBlock(active.data.current.blockType as BlockType)
      setBlocks((previous) => {
        const index = previous.findIndex((block) => block.id === over.id)
        const next = [...previous]
        next.splice(index === -1 ? next.length : index, 0, newBlock)
        return next
      })
    } else if (active.id !== over.id) {
      const oldIndex = blocks.findIndex((block) => block.id === active.id)
      const newIndex = blocks.findIndex((block) => block.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) setBlocks((previous) => arrayMove(previous, oldIndex, newIndex))
    }
    setError(null)
  }

  const handleUpdateBlock = useCallback((blockId: string, data: Block["data"]) => {
    setBlocks((previous) => previous.map((block) => block.id === blockId ? { ...block, data } : block) as Block[])
    setError(null)
  }, [])
  const handleDeleteBlock = useCallback((blockId: string) => {
    setBlocks((previous) => previous.filter((block) => block.id !== blockId))
    setError(null)
  }, [])
  const handleMoveBlock = useCallback((blockId: string, direction: -1 | 1) => {
    setBlocks((previous) => {
      const index = previous.findIndex((block) => block.id === blockId)
      const destination = index + direction
      return index < 0 || destination < 0 || destination >= previous.length
        ? previous : arrayMove(previous, index, destination)
    })
    setError(null)
  }, [])
  const handleThemeUpdate = useCallback((next: SiteTheme) => { setTheme(next); setError(null) }, [])

  const handlePublish = async (nextPublished: boolean) => {
    if (!onPublish || publishing) return
    setPublishing(true)
    setError(null)
    try {
      const snapshot = nextPublished ? await saveCurrent() : savedRef.current
      if (nextPublished && snapshot !== currentRef.current.key) {
        throw new Error("Changes were made while saving. Publish again to include them.")
      }
      await onPublish(nextPublished)
      setPublished(nextPublished)
      if (nextPublished) setPublishedKey(snapshot)
    } catch (cause) {
      reportError(cause)
    } finally {
      setPublishing(false)
    }
  }

  const handleDraftPreview = async () => {
    const preview = onDraftPreview?.()
    if (!preview) { setError("Allow popups to open the draft preview."); return }
    try {
      await saveCurrent()
      preview.navigate()
    } catch (cause) {
      preview.close()
      reportError(cause)
    }
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-100">
      <header className="shrink-0 bg-white border-b border-gray-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-semibold text-gray-900">Page Editor</h1>
          <p className="text-xs text-gray-500 break-all">{username}.getpersonalbrand.com</p>
          <p role="status" aria-label="Draft save status" className="text-sm text-gray-600">{saving ? "Saving" : hasChanges ? "Unsaved changes" : "Saved"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowThemePanel(!showThemePanel)} aria-expanded={showThemePanel}
            className="flex items-center gap-1 p-2 rounded-lg text-gray-700 hover:bg-gray-100">
            <Settings className="w-4 h-4" />Theme
          </button>
          {onDraftPreview && <button onClick={() => void handleDraftPreview()} disabled={saving || publishing}
            className="flex items-center gap-1 p-2 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50">
            <Eye className="w-4 h-4" />Draft preview
          </button>}
          <button onClick={onPreview} className="p-2 rounded-lg text-gray-700 hover:bg-gray-100">View live site</button>
          <button onClick={() => void saveCurrent().catch(reportError)} disabled={saving || publishing || !hasChanges}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
            <Save className="w-4 h-4" />Save
          </button>
        </div>
      </header>
      {error && <p role="alert" className="shrink-0 px-4 py-2 bg-red-50 text-red-700">{error}</p>}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        <DndContext id="page-editor" sensors={sensors} collisionDetection={detectCollision} onDragStart={handleDragStart}
          onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
          <BlockSidebar onAddBlock={handleAddBlock} />
          <EditorCanvas blocks={blocks} primaryColor={theme.primaryColor} onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock} onMoveBlock={handleMoveBlock} />
          <DragOverlay>{activeId?.startsWith("new-") ? <div className="bg-white p-4 rounded-lg shadow-lg border border-blue-300">Dragging block</div> : null}</DragOverlay>
        </DndContext>
        {showThemePanel && <ThemePanel theme={theme} onUpdate={handleThemeUpdate} />}
      </div>
      {onPublish && <footer className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-white p-3">
        <p className="text-sm text-gray-600">{unpublished ? "You have unpublished changes" : "Site is live"}</p>
        <div className="flex gap-2">
          {published && <button onClick={() => void handlePublish(false)} disabled={saving || publishing}
            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 disabled:opacity-50">Unpublish</button>}
          <button onClick={() => void handlePublish(true)} disabled={saving || publishing || !unpublished}
            className="px-4 py-2 rounded-lg bg-green-700 text-white disabled:opacity-50">{publishing ? "Updating..." : "Publish"}</button>
        </div>
      </footer>}
    </div>
  )
}
