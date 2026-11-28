import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { siteContentSchema } from "@/lib/validation/site-content"
import { readJson, requestError } from "@/lib/validation/request"

const publishSchema = z.strictObject({ published: z.boolean() })

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const limit = await rateLimit({ key: `site-publish:${session.user.id}`, limit: 20, windowSeconds: 60 })
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many publish requests. Try again in a minute." }, { status: 429 })
    }
    const { published } = publishSchema.parse(await readJson(req))
    const site = await prisma.site.findUnique({
      where: { userId: session.user.id },
      select: { content: true, theme: true },
    })
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 })

    if (published) {
      const draft = siteContentSchema.parse({ blocks: site.content, theme: site.theme })
      await prisma.site.update({
        where: { userId: session.user.id },
        data: { published: true, publishedContent: draft.blocks, publishedTheme: draft.theme, publishedAt: new Date() },
      })
    } else {
      await prisma.site.update({ where: { userId: session.user.id }, data: { published: false } })
    }
    revalidatePath(`/s/${session.user.username}`)
    revalidatePath("/s/_custom")
    return NextResponse.json({ success: true, published })
  } catch (error) {
    return requestError(error, "Failed to update publication. Please try again.")
  }
}
