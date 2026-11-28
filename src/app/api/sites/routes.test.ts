import { beforeEach, describe, expect, it, vi } from "vitest"
import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { createBlock, DEFAULT_THEME } from "@/types/blocks"
import { MAX_SITE_CONTENT_BYTES } from "@/lib/validation/site-content"
import { POST as save } from "./save/route"
import { POST as publish } from "./publish/route"
import { POST as onboard } from "../onboarding/complete/route"

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: {
  site: { findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() },
  user: { findUnique: vi.fn() },
} }))

const payload = () => ({ blocks: [createBlock("hero")], theme: DEFAULT_THEME })
const request = (body: unknown) => new Request("http://localhost/api/sites", { method: "POST", body: JSON.stringify(body) })

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "owner", username: "alice" }, expires: "2099-01-01" })
  vi.mocked(rateLimit).mockResolvedValue({ ok: true, remaining: 10 })
  vi.mocked(prisma.site.findUnique).mockResolvedValue({ id: "owner-site", content: [], theme: DEFAULT_THEME } as never)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "owner" } as never)
})

describe("draft and publication routes", () => {
  it("saving changes only the owner's draft and preserves the live snapshot", async () => {
    const body = payload()
    const response = await save(request(body))
    expect(response.status).toBe(200)
    expect(prisma.site.update).toHaveBeenCalledWith({ where: { userId: "owner" }, data: { content: body.blocks, theme: body.theme } })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("publishes the saved draft snapshot, not caller-supplied content", async () => {
    const draft = payload()
    vi.mocked(prisma.site.findUnique).mockResolvedValue({ content: draft.blocks, theme: draft.theme } as never)
    const response = await publish(request({ published: true }))
    expect(response.status).toBe(200)
    expect(prisma.site.findUnique).toHaveBeenCalledWith({ where: { userId: "owner" }, select: { content: true, theme: true } })
    expect(prisma.site.update).toHaveBeenCalledWith({ where: { userId: "owner" }, data: { published: true, publishedContent: draft.blocks, publishedTheme: draft.theme, publishedAt: expect.any(Date) } })
    expect(revalidatePath).toHaveBeenCalledWith("/s/alice")
    expect(revalidatePath).toHaveBeenCalledWith("/s/_custom")
  })

  it("unpublishes without destroying the snapshot, even with an invalid draft", async () => {
    vi.mocked(prisma.site.findUnique).mockResolvedValue({ content: "bad", theme: {} } as never)
    expect((await publish(request({ published: false }))).status).toBe(200)
    expect(prisma.site.update).toHaveBeenCalledWith({ where: { userId: "owner" }, data: { published: false } })
    expect(revalidatePath).toHaveBeenCalledWith("/s/alice")
    expect(revalidatePath).toHaveBeenCalledWith("/s/_custom")
  })

  it("refuses to publish invalid persisted draft content", async () => {
    vi.mocked(prisma.site.findUnique).mockResolvedValue({ content: [{ id: "x", type: "unknown", data: {} }], theme: DEFAULT_THEME } as never)
    expect((await publish(request({ published: true }))).status).toBe(400)
    expect(prisma.site.update).not.toHaveBeenCalled()
  })

  it("onboarding publishes the first version using the session owner", async () => {
    const body = payload()
    expect((await onboard(request(body))).status).toBe(200)
    const data = { content: body.blocks, theme: body.theme, publishedContent: body.blocks, publishedTheme: body.theme, publishedAt: expect.any(Date), published: true }
    expect(prisma.site.upsert).toHaveBeenCalledWith({ where: { userId: "owner" }, create: { userId: "owner", ...data }, update: data })
    expect(revalidatePath).toHaveBeenCalledWith("/s/alice")
    expect(revalidatePath).toHaveBeenCalledWith("/s/_custom")
  })

  it.each([["save", save, payload()], ["publish", publish, { published: true }], ["onboard", onboard, payload()]] as const)("%s rejects attempts to select another user's site", async (_, handler, body) => {
    expect((await handler(request({ ...body, siteId: "victim-site" }))).status).toBe(400)
    expect(prisma.site.update).not.toHaveBeenCalled()
    expect(prisma.site.upsert).not.toHaveBeenCalled()
  })

  it.each([["save", save], ["publish", publish], ["onboard", onboard]] as const)("%s requires authentication and rate limits before writing", async (_, handler) => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)
    expect((await handler(request(payload()))).status).toBe(401)
    expect(rateLimit).not.toHaveBeenCalled()
    vi.mocked(rateLimit).mockResolvedValueOnce({ ok: false, remaining: 0 })
    expect((await handler(request(payload()))).status).toBe(429)
    expect(prisma.site.update).not.toHaveBeenCalled()
    expect(prisma.site.upsert).not.toHaveBeenCalled()
  })

  it.each([["save", save], ["onboard", onboard]] as const)("%s rejects unsafe URLs, unknown types and 31 blocks with readable errors", async (_, handler) => {
    const links = { id: "links", type: "links", data: { links: [{ id: "x", label: "X", url: "javascript:alert(1)", icon: "" }] } }
    for (const blocks of [[links], [{ id: "x", type: "unknown", data: {} }], Array.from({ length: 31 }, () => createBlock("divider"))]) {
      const response = await handler(request({ blocks, theme: DEFAULT_THEME }))
      expect(response.status).toBe(400)
      expect((await response.json()).error).toEqual(expect.any(String))
    }
    expect(prisma.site.update).not.toHaveBeenCalled()
    expect(prisma.site.upsert).not.toHaveBeenCalled()
  })

  it.each([["save", save], ["publish", publish], ["onboard", onboard]] as const)("%s rejects malformed and oversized bodies without trusting headers", async (_, handler) => {
    const malformed = await handler(new Request("http://localhost", { method: "POST", body: "{" }))
    expect(malformed.status).toBe(400)
    const huge = await handler(new Request("http://localhost", { method: "POST", headers: { "content-length": "1" }, body: " ".repeat(MAX_SITE_CONTENT_BYTES + 1) }))
    expect(huge.status).toBe(400)
    expect((await huge.json()).error).toContain("200 KB")
    expect(prisma.site.update).not.toHaveBeenCalled()
    expect(prisma.site.upsert).not.toHaveBeenCalled()
  })

  it("does not log expected validation errors", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    expect((await save(request({ blocks: [], theme: {} }))).status).toBe(400)
    expect((await save(new Request("http://localhost", { method: "POST", body: "{" }))).status).toBe(400)
    expect(log).not.toHaveBeenCalled()
  })

  it("reports missing sites and storage failures without exposing internals", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(prisma.site.findUnique).mockResolvedValueOnce(null)
    expect((await save(request(payload()))).status).toBe(404)
    vi.mocked(prisma.site.update).mockRejectedValueOnce(new Error("internal database detail"))
    const response = await save(request(payload()))
    expect(response.status).toBe(500)
    expect((await response.json()).error).not.toContain("internal database detail")
    expect(log).toHaveBeenCalledExactlyOnceWith("Site request failed", { operation: "Failed to save. Please try again.", errorType: "Error" })
  })
})
