import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { siteContentSchema } from "@/lib/validation/site-content"
import { readJson, requestError } from "@/lib/validation/request"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const limit = await rateLimit({ key: `site-save:${session.user.id}`, limit: 60, windowSeconds: 60 })
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many saves. Try again in a minute." }, { status: 429 })
    }
    const { blocks, theme } = siteContentSchema.parse(await readJson(req))
    const site = await prisma.site.findUnique({ where: { userId: session.user.id }, select: { id: true } })
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 })

    await prisma.site.update({
      where: { userId: session.user.id },
      data: { content: blocks, theme },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return requestError(error, "Failed to save. Please try again.")
  }
}
