import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SiteRenderer } from "@/components/site/SiteRenderer"
import { Block, SiteTheme, DEFAULT_THEME } from "@/types/blocks"

export const dynamic = "force-dynamic"
export const metadata = { title: "Draft preview", robots: { index: false, follow: false } }

export default async function DraftPreviewPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const site = await prisma.site.findUnique({ where: { userId: session.user.id } })
  if (!site) redirect("/onboarding")

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p>Draft preview. Only you can see this version.</p>
        <Link href="/editor" className="underline">Back to editor</Link>
      </div>
      <SiteRenderer
        blocks={(site.content as unknown as Block[]) || []}
        theme={(site.theme as unknown as SiteTheme) || DEFAULT_THEME}
      />
    </>
  )
}
