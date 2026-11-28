import { describe, expect, it } from "vitest"
import { TEMPLATES } from "@/lib/templates"
import { createBlock, DEFAULT_THEME } from "@/types/blocks"
import { blocksSchema, siteContentSchema, themeSchema } from "./site-content"

const content = () => ({ blocks: [createBlock("hero")], theme: DEFAULT_THEME })

describe("site content validation", () => {
  it("accepts every built-in template and block type", () => {
    for (const { blocks, theme } of TEMPLATES) expect(siteContentSchema.safeParse({ blocks, theme }).success).toBe(true)
    expect(blocksSchema.safeParse(["hero", "about", "links", "portfolio", "contact", "divider"].map((type) => createBlock(type as Parameters<typeof createBlock>[0]))).success).toBe(true)
  })

  it.each(["javascript:alert(1)", "data:text/html,test", "//example.com", "https://example.com\n"])("rejects unsafe URL %s", (url) => {
    const block = createBlock("links")
    if (block.type !== "links") throw new Error("fixture")
    block.data.links[0].url = url
    expect(blocksSchema.safeParse([block]).success).toBe(false)
  })

  it("normalizes valid links and rejects unsafe image and calendar URLs", () => {
    const block = createBlock("links")
    if (block.type !== "links") throw new Error("fixture")
    block.data.links[0].url = " https://EXAMPLE.com "
    const parsed = blocksSchema.parse([block])[0]
    expect(parsed.type === "links" && parsed.data.links[0].url).toBe("https://example.com/")
    expect(blocksSchema.safeParse([{ ...createBlock("hero"), data: { name: "", headline: "", bio: "", imageUrl: "javascript:alert(1)" } }]).success).toBe(false)
    expect(blocksSchema.safeParse([{ ...createBlock("contact"), data: { title: "", email: null, calendarUrl: "javascript:alert(1)", showForm: false } }]).success).toBe(false)
  })

  it("rejects unknown block types, fields, duplicate IDs and 31 blocks", () => {
    expect(blocksSchema.safeParse([{ id: "x", type: "script", data: {} }]).success).toBe(false)
    expect(siteContentSchema.safeParse({ ...content(), siteId: "other" }).success).toBe(false)
    const block = createBlock("divider")
    expect(blocksSchema.safeParse([block, block]).success).toBe(false)
    expect(blocksSchema.safeParse(Array.from({ length: 31 }, () => createBlock("divider"))).success).toBe(false)
  })

  it("enforces total link and project limits across blocks", () => {
    const links = (n: number) => ({ id: crypto.randomUUID(), type: "links", data: { links: Array.from({ length: n }, (_, i) => ({ id: String(i), label: "", url: "", icon: "" })) } })
    const projects = (n: number) => ({ id: crypto.randomUUID(), type: "portfolio", data: { title: "", projects: Array.from({ length: n }, (_, i) => ({ id: String(i), title: "", description: "", imageUrl: null, url: null })) } })
    expect(blocksSchema.safeParse([links(25), links(25)]).success).toBe(true)
    expect(blocksSchema.safeParse([links(25), links(26)]).success).toBe(false)
    expect(blocksSchema.safeParse([projects(12), projects(12)]).success).toBe(true)
    expect(blocksSchema.safeParse([projects(12), projects(13)]).success).toBe(false)
  })

  it("requires a known template, a hex colour and bounded strings", () => {
    expect(themeSchema.safeParse({ ...DEFAULT_THEME, template: "unknown" }).success).toBe(false)
    expect(themeSchema.safeParse({ ...DEFAULT_THEME, primaryColor: "red" }).success).toBe(false)
    expect(themeSchema.safeParse({ ...DEFAULT_THEME, primaryColor: "#abc" }).success).toBe(true)
    expect(themeSchema.safeParse({ ...DEFAULT_THEME, font: "a".repeat(101) }).success).toBe(false)
  })

  it("enforces total UTF-8 size even when individual strings fit", () => {
    const blocks = Array.from({ length: 10 }, (_, i) => ({ id: String(i), type: "about", data: { title: "", content: "界".repeat(10000) } }))
    expect(siteContentSchema.safeParse({ blocks, theme: DEFAULT_THEME }).success).toBe(false)
  })
})
