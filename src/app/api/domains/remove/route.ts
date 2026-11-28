import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { DomainError, releaseDomain } from "@/lib/domains"
import { domainsConfigured } from "@/lib/vercel-domains"

const bodySchema = z.object({ domainId: z.string().min(1) })

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!domainsConfigured()) return NextResponse.json({ error: "Custom domains are not available yet" }, { status: 503 })
    const body = bodySchema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: "Enter a valid domain ID" }, { status: 400 })
    await releaseDomain(body.data.domainId, session.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message, domain: error.domain }, { status: error.status })
    return NextResponse.json({ error: "Failed to remove domain. Please try again." }, { status: 500 })
  }
}
