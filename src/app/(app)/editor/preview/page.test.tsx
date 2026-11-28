import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import DraftPreviewPage, { dynamic, metadata } from "./page"

const mocks = vi.hoisted(() => ({ session: vi.fn(), findUnique: vi.fn() }))
vi.mock("next-auth", () => ({ getServerSession: mocks.session }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/prisma", () => ({ prisma: { site: { findUnique: mocks.findUnique } } }))
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`) } }))
vi.mock("@/components/site/SiteRenderer", () => ({
  SiteRenderer: ({ blocks }: { blocks: unknown }) => <pre>{JSON.stringify(blocks)}</pre>,
}))

beforeEach(() => { vi.clearAllMocks() })

describe("owner draft preview", () => {
  it("redirects signed-out visitors before querying a site", async () => {
    mocks.session.mockResolvedValue(null)
    await expect(DraftPreviewPage()).rejects.toThrow("redirect:/login")
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  it("reads only the session owner's draft and excludes published content", async () => {
    mocks.session.mockResolvedValue({ user: { id: "owner" } })
    mocks.findUnique.mockResolvedValue({
      content: [{ id: "draft" }], theme: {}, publishedContent: [{ id: "live" }],
    })
    const html = renderToStaticMarkup(await DraftPreviewPage())
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { userId: "owner" } })
    expect(html).toContain("draft")
    expect(html).not.toContain("live")
    expect(dynamic).toBe("force-dynamic")
    expect(metadata.robots.index).toBe(false)
  })

  it("sends owners without sites to onboarding", async () => {
    mocks.session.mockResolvedValue({ user: { id: "owner" } })
    mocks.findUnique.mockResolvedValue(null)
    await expect(DraftPreviewPage()).rejects.toThrow("redirect:/onboarding")
  })
})
