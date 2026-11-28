import { z } from "zod"
import { safeHref } from "@/lib/safe-url"

export const MAX_SITE_CONTENT_BYTES = 200 * 1024

const id = z.string().min(1).max(100)
const title = z.string().max(200)
// Empty strings represent the unused links in the built-in templates.
const url = z.string().max(2048).transform((value, ctx) => {
  if (value === "") return value
  const normalized = safeHref(value)
  if (!normalized) {
    ctx.addIssue({ code: "custom", message: "Enter a valid http, https or mailto URL" })
    return z.NEVER
  }
  return normalized
})
const email = z.union([z.literal(""), z.email().max(254)]).nullable()

export const blockSchema = z.discriminatedUnion("type", [
  z.strictObject({ id, type: z.literal("hero"), data: z.strictObject({
    name: title, headline: z.string().max(300), bio: z.string().max(5000), imageUrl: url.nullable(),
  }) }),
  z.strictObject({ id, type: z.literal("about"), data: z.strictObject({
    title, content: z.string().max(10000),
  }) }),
  z.strictObject({ id, type: z.literal("links"), data: z.strictObject({
    links: z.array(z.strictObject({ id, label: title, url, icon: z.string().max(50) })).max(50),
  }) }),
  z.strictObject({ id, type: z.literal("portfolio"), data: z.strictObject({
    title, projects: z.array(z.strictObject({
      id, title, description: z.string().max(5000), imageUrl: url.nullable(), url: url.nullable(),
    })).max(24),
  }) }),
  z.strictObject({ id, type: z.literal("contact"), data: z.strictObject({
    title, email, calendarUrl: url.nullable(), showForm: z.boolean(),
  }) }),
  z.strictObject({ id, type: z.literal("divider"), data: z.strictObject({
    style: z.enum(["line", "space", "dots"]),
  }) }),
])

export const blocksSchema = z.array(blockSchema).max(30).superRefine((blocks, ctx) => {
  if (new Set(blocks.map((block) => block.id)).size !== blocks.length) {
    ctx.addIssue({ code: "custom", message: "Each block must have a unique ID" })
  }
  let links = 0
  let projects = 0
  for (const block of blocks) {
    const items = block.type === "links" ? block.data.links : block.type === "portfolio" ? block.data.projects : []
    if (new Set(items.map((item) => item.id)).size !== items.length) {
      ctx.addIssue({ code: "custom", message: "Items in each block must have unique IDs" })
    }
    if (block.type === "links") links += block.data.links.length
    if (block.type === "portfolio") projects += block.data.projects.length
  }
  if (links > 50) ctx.addIssue({ code: "custom", message: "Use at most 50 links per site" })
  if (projects > 24) ctx.addIssue({ code: "custom", message: "Use at most 24 projects per site" })
})

export const themeSchema = z.strictObject({
  primaryColor: z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, "Choose a valid hex colour"),
  font: z.string().min(1).max(100),
  template: z.enum(["modern", "bold", "classic"]),
})

export const siteContentSchema = z.strictObject({ blocks: blocksSchema, theme: themeSchema })
  .superRefine((value, ctx) => {
    if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_SITE_CONTENT_BYTES) {
      ctx.addIssue({ code: "custom", message: "Site content must be 200 KB or smaller" })
    }
  })

export function validationMessage(error: z.ZodError): string {
  const issue = error.issues[0]
  return `${issue.path.length ? `${issue.path.join(".")}: ` : ""}${issue.message}`
}
