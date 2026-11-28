import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { addDomain, DomainError } from "@/lib/domains"
import { rateLimit } from "@/lib/rate-limit"
import { domainsConfigured } from "@/lib/vercel-domains"

const bodySchema = z.object({ siteId: z.string().min(1), domain: z.string().min(1).max(253) })

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!domainsConfigured()) return NextResponse.json({ error: "Custom domains are not available yet" }, { status: 503 })
    const body = bodySchema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: "Enter a site and valid domain name" }, { status: 400 })
    const limit = await rateLimit({ key: `domains:add:${session.user.id}`, limit: 10, windowSeconds: 3600 })
    if (!limit.ok) return NextResponse.json({ error: "Too many domain requests. Please try again later." }, { status: 429 })
    const domain = await addDomain(body.data.siteId, session.user.id, body.data.domain)
    return NextResponse.json({ domain })
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message, domain: error.domain }, { status: error.status })
    return NextResponse.json({ error: "Failed to add domain. Please check again." }, { status: 500 })
  }
}
