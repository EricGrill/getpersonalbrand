import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { domainsConfigured } from "@/lib/vercel-domains"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ configured: domainsConfigured() }, { headers: { "Cache-Control": "no-store" } })
}
