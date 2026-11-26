import Link from "next/link"
import { BrandMark } from "./marketing-header"

const links = [
  { href: "/", label: "Home" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/acceptable-use", label: "Acceptable use" },
]

export function MarketingFooter() {
  return (
    <footer className="bg-[#173f35] text-white">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-8 border-b border-white/15 pb-9 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="GetPersonalBrand home">
            <BrandMark />
            <span className="text-sm font-extrabold tracking-[-0.02em]">GetPersonalBrand</span>
          </Link>
          <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Legal navigation">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/70 transition hover:text-[#d8ff8d]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-2 pt-6 text-xs leading-5 text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} GetPersonalBrand. All rights reserved.</p>
          <p>Your work. Your story. Your site.</p>
        </div>
      </div>
    </footer>
  )
}
