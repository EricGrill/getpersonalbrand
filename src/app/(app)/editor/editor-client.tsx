"use client"

import { useCallback } from "react"
import { PageEditor } from "@/components/editor"
import { Block, SiteTheme } from "@/types/blocks"

interface EditorClientProps {
  siteId: string
  username: string
  initialBlocks: Block[]
  initialTheme: SiteTheme
  initialPublishedBlocks?: Block[] | null
  initialPublishedTheme?: SiteTheme | null
  isPublished: boolean
}

async function checkResponse(response: Response) {
  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.error || "Unable to save your site. Please try again.")
  }
}

export function EditorClient({ username, initialBlocks, initialTheme,
  initialPublishedBlocks, initialPublishedTheme, isPublished }: EditorClientProps) {
  const handleSave = useCallback(async (blocks: Block[], theme: SiteTheme) => {
    await checkResponse(await fetch("/api/sites/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks, theme }),
    }))
  }, [])

  const handlePreview = () => {
    window.open(`/site/${username}`, "_blank")
  }

  const handlePublish = useCallback(async (published: boolean) => {
    await checkResponse(await fetch("/api/sites/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published }),
    }))
  }, [])

  const handleDraftPreview = () => {
    const preview = window.open("about:blank", "_blank")
    if (!preview) return null
    preview.opener = null
    return {
      navigate: () => { preview.location.href = "/editor/preview" },
      close: () => preview.close(),
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <PageEditor initialBlocks={initialBlocks} initialTheme={initialTheme}
        initialPublishedBlocks={initialPublishedBlocks} initialPublishedTheme={initialPublishedTheme}
        isPublished={isPublished} onSave={handleSave} onPublish={handlePublish}
        onPreview={handlePreview} onDraftPreview={handleDraftPreview}
        username={username} />
    </div>
  )
}
