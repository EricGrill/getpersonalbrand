import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export function BrandMark() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#173f35] text-[11px] font-black tracking-[-0.04em] text-[#d8ff8d] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
      GPB
    </span>
  )
}

export async function MarketingHeader() {
  const session = await getServerSession(authOptions)

  return (
    <header className="border-b border-[#173f35]/10 bg-[#f7f8f2]/95">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3" aria-label="GetPersonalBrand home">
          <BrandMark />
          <span className="hidden text-[15px] font-extrabold tracking-[-0.03em] text-[#173f35] min-[420px]:inline">
            GetPersonalBrand
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-5" aria-label="Main navigation">
          {session ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-[#173f35] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#24594b]"
            >
              Dashboard
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-2 text-sm font-semibold text-[#173f35] transition hover:bg-[#173f35]/5"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#173f35] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#24594b] sm:px-5"
              >
                Start free
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
