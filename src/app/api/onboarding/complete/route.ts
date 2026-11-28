import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
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
    const limit = await rateLimit({ key: `onboarding:${session.user.id}`, limit: 10, windowSeconds: 60 })
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 })
    }
    const { blocks, theme } = siteContentSchema.parse(await readJson(req))
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const data = { content: blocks, theme, publishedContent: blocks, publishedTheme: theme, publishedAt: new Date(), published: true }
    await prisma.site.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: data,
    })
    revalidatePath(`/s/${session.user.username}`)
    revalidatePath("/s/_custom")
    return NextResponse.json({ success: true })
  } catch (error) {
    return requestError(error, "Failed to complete onboarding. Please try again.")
  }
}
