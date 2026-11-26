import type { ReactNode } from "react"

interface LegalPageProps {
  eyebrow: string
  title: string
  summary: string
  children: ReactNode
}

export function LegalPage({ eyebrow, title, summary, children }: LegalPageProps) {
  return (
    <main className="bg-[#f7f8f2]">
      <div className="border-b border-[#173f35]/10 bg-[#eef2e7]">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.2em] text-[#527263]">
            {eyebrow}
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-[-0.045em] text-[#173f35] sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#527263] sm:text-lg">
            {summary}
          </p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#527263]">
            Last updated November 26, 2026
          </p>
        </div>
      </div>
      <article className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="space-y-10">{children}</div>
      </article>
    </main>
  )
}

interface LegalSectionProps {
  title: string
  children: ReactNode
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="border-b border-[#173f35]/10 pb-10 last:border-0 last:pb-0">
      <h2 className="mb-4 text-xl font-extrabold tracking-[-0.025em] text-[#173f35] sm:text-2xl">
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-7 text-[#435d53] sm:text-base sm:leading-8">
        {children}
      </div>
    </section>
  )
}
