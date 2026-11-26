import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  Globe2,
  GripVertical,
  Image,
  Link2,
  MousePointer2,
  MoveUpRight,
  Palette,
  Sparkles,
  UserRound,
} from "lucide-react"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingHeader } from "@/components/marketing/marketing-header"

const siteParts = [
  {
    icon: Link2,
    number: "01",
    title: "Your link in bio",
    description: "Bring every important link together on a page that feels like you, not a list of buttons.",
    accent: "bg-[#e6f4ff]",
  },
  {
    icon: UserRound,
    number: "02",
    title: "Your about page",
    description: "Tell your story, share what you do, and give people a reason to stick around.",
    accent: "bg-[#f1ebff]",
  },
  {
    icon: Image,
    number: "03",
    title: "Your portfolio",
    description: "Put selected work front and center with images, project details, and links to see more.",
    accent: "bg-[#fff0df]",
  },
]

const editorSteps = [
  { icon: MousePointer2, title: "Add your content", text: "Start with a template and make it yours." },
  { icon: GripVertical, title: "Arrange it your way", text: "Drag and drop blocks until the story flows." },
  { icon: Globe2, title: "Publish and share", text: "Use your GPB address or connect a custom domain." },
]

function StartLink({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/register"
      className={`group inline-flex items-center justify-center gap-3 rounded-full px-6 py-3.5 text-sm font-extrabold transition sm:px-7 ${
        light
          ? "bg-[#d8ff8d] text-[#173f35] hover:bg-white"
          : "bg-[#173f35] text-white hover:bg-[#24594b]"
      }`}
    >
      Build your free site
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  )
}

function SitePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[520px] lg:mr-0">
      <div className="absolute -left-5 top-16 hidden -rotate-6 rounded-2xl bg-[#d8ff8d] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#173f35] shadow-sm sm:block">
        Made by you
      </div>
      <div className="overflow-hidden rounded-[24px] border border-[#173f35]/15 bg-white shadow-[0_30px_80px_rgba(23,63,53,0.16)]">
        <div className="flex h-11 items-center gap-1.5 border-b border-[#173f35]/10 bg-[#fbfcf9] px-4">
          <span className="size-2 rounded-full bg-[#ff9d7a]" />
          <span className="size-2 rounded-full bg-[#f5d976]" />
          <span className="size-2 rounded-full bg-[#a9d995]" />
          <div className="mx-auto flex h-6 w-2/3 items-center justify-center rounded-md bg-[#eef1eb] text-[9px] font-medium text-[#6d7d75]">
            mayachen.com
          </div>
        </div>
        <div className="bg-[#f4efe7] p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-[-0.03em] text-[#27332f]">MAYA CHEN</span>
            <div className="flex gap-3 text-[8px] font-semibold text-[#68736e]">
              <span>Work</span>
              <span>About</span>
              <span>Contact</span>
            </div>
          </div>
          <div className="grid items-center gap-5 py-7 sm:grid-cols-[1.05fr_0.95fr] sm:py-9">
            <div>
              <p className="mb-2 text-[8px] font-extrabold uppercase tracking-[0.18em] text-[#94735e]">
                Designer &amp; photographer
              </p>
              <p className="text-[28px] font-extrabold leading-[1.02] tracking-[-0.055em] text-[#27332f] sm:text-[36px]">
                Thoughtful work for curious people.
              </p>
              <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#27332f] px-3 py-2 text-[8px] font-bold text-white">
                See selected work <ArrowUpRight className="size-2.5" />
              </div>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-[#d4bca7]">
              <div className="absolute -right-6 -top-8 size-32 rounded-full bg-[#edc8a9]" />
              <div className="absolute bottom-0 left-1/2 h-[72%] w-[62%] -translate-x-1/2 rounded-t-[80px] bg-[#6f8175]" />
              <div className="absolute left-1/2 top-[19%] size-[62px] -translate-x-1/2 rounded-full bg-[#bd8c70]" />
              <div className="absolute left-1/2 top-[15%] h-[48px] w-[68px] -translate-x-1/2 rounded-t-full bg-[#343b36]" />
              <div className="absolute bottom-4 right-3 rotate-6 bg-[#fff9e9] px-2.5 py-2 text-[7px] font-extrabold uppercase tracking-[0.1em] text-[#68584d] shadow-sm">
                New perspectives
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="aspect-[1.3] rounded-lg bg-[#c8d4c5] p-2.5">
              <div className="h-1/2 rounded-sm bg-[#eff1e8]" />
              <div className="mt-2 h-1 w-2/3 bg-[#6c7c70]" />
            </div>
            <div className="aspect-[1.3] rounded-lg bg-[#dfb9a0] p-2.5">
              <div className="mx-auto size-8 rounded-full border border-[#8e6c59]" />
              <div className="mx-auto mt-2 h-1 w-1/2 bg-[#8e6c59]" />
            </div>
            <div className="aspect-[1.3] rounded-lg bg-[#d9d2e6] p-2.5">
              <div className="h-full rounded-sm border border-[#a196b5] bg-[#eeeaf3]" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 -right-2 flex -rotate-3 items-center gap-2 rounded-xl border border-[#173f35]/10 bg-white px-4 py-3 text-xs font-bold text-[#173f35] shadow-lg sm:-right-5">
        <span className="flex size-6 items-center justify-center rounded-full bg-[#d8ff8d]">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        Published and ready to share
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7f8f2] text-[#173f35]" style={{ fontFamily: "var(--font-inter), Arial, Helvetica, sans-serif" }}>
      <MarketingHeader />
      <main>
        <section className="overflow-hidden border-b border-[#173f35]/10">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-10 lg:pb-28 lg:pt-24">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#173f35]/15 bg-white/60 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#527263]">
                <Sparkles className="size-3.5 text-[#658c36]" aria-hidden="true" />
                Your corner of the internet
              </div>
              <h1 className="text-[48px] font-extrabold leading-[0.98] tracking-[-0.06em] text-[#173f35] sm:text-[68px] lg:text-[76px]">
                One site.
                <br />
                <span className="text-[#6b8f3d]">All of you.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#527263] sm:text-xl">
                Replace your link in bio, about page, and portfolio with one personal website. Build it your way, publish it for free, and make it easy for people to find everything you do.
              </p>
              <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <StartLink />
                <p className="text-xs font-semibold leading-5 text-[#6b7e74]">
                  Free to build and publish.
                  <br className="hidden sm:block" /> No credit card required.
                </p>
              </div>
            </div>
            <SitePreview />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#6b8f3d]">Less patching together</p>
              <h2 className="mt-4 max-w-md text-4xl font-extrabold leading-[1.05] tracking-[-0.045em] sm:text-5xl">
                Three sites become one.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-[#62766d]">
                Your online presence is more than a list of links. Give it room for the whole story.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {siteParts.map((part) => (
                <article key={part.title} className={`${part.accent} rounded-3xl p-6 sm:min-h-[290px]`}>
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-white/75">
                      <part.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-black text-[#173f35]/35">{part.number}</span>
                  </div>
                  <h3 className="mt-10 text-xl font-extrabold tracking-[-0.035em]">{part.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#173f35]/65">{part.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#173f35] text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:gap-20 lg:px-10">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#d8ff8d]">A canvas, not a compromise</p>
              <h2 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-[-0.045em] sm:text-5xl">
                Make it look like you. No code needed.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/65">
                Start with your content, then move, shape, and style every section with a visual editor built for experimenting.
              </p>
              <div className="mt-9 space-y-6">
                {editorSteps.map((step) => (
                  <div key={step.title} className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#d8ff8d]">
                      <step.icon className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-white/55">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[26px] bg-[#eef1e9] p-3 text-[#173f35] shadow-2xl sm:p-5">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs font-extrabold">
                  <Palette className="size-4" /> Site editor
                </div>
                <span className="rounded-full bg-[#173f35] px-3 py-1.5 text-[9px] font-bold text-white">Publish</span>
              </div>
              <div className="grid overflow-hidden rounded-2xl border border-[#173f35]/10 bg-white sm:grid-cols-[120px_1fr]">
                <div className="hidden border-r border-[#173f35]/10 bg-[#fafbf8] p-3 sm:block">
                  <p className="mb-3 text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#839087]">Blocks</p>
                  {["Hero", "About", "Links", "Portfolio", "Contact"].map((block) => (
                    <div key={block} className="mb-2 flex items-center gap-1.5 rounded-md border border-[#173f35]/10 bg-white px-2 py-2 text-[8px] font-semibold">
                      <GripVertical className="size-2.5 text-[#9ba79f]" /> {block}
                    </div>
                  ))}
                </div>
                <div className="relative bg-[#f7f3ec] p-5 sm:p-7">
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-[#d8ff8d] px-2 py-1 text-[7px] font-extrabold uppercase tracking-wider">
                    <MoveUpRight className="size-2.5" /> Drag to arrange
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-[#87a65b] bg-white/60 p-5 text-center">
                    <div className="mx-auto size-12 rounded-full bg-[#d4bca7]" />
                    <div className="mx-auto mt-3 h-2.5 w-24 rounded-full bg-[#364c43]" />
                    <div className="mx-auto mt-2 h-1.5 w-32 rounded-full bg-[#c6cec7]" />
                    <div className="mx-auto mt-5 h-6 w-20 rounded-full bg-[#173f35]" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="h-20 rounded-lg border border-[#173f35]/10 bg-[#d9e2d4]" />
                    <div className="h-20 rounded-lg border border-[#173f35]/10 bg-[#ead7c8]" />
                  </div>
                  <div className="mt-3 rounded-lg border border-[#173f35]/10 bg-white p-3">
                    <div className="h-1.5 w-16 rounded-full bg-[#7d8b82]" />
                    <div className="mt-2 h-1.5 w-full rounded-full bg-[#e3e7e1]" />
                    <div className="mt-1.5 h-1.5 w-4/5 rounded-full bg-[#e3e7e1]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-[28px] border border-[#173f35]/10 bg-white p-7 sm:p-10">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#e6f4ff]">
                <Globe2 className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-8 text-3xl font-extrabold tracking-[-0.04em]">An address that is yours.</h2>
              <p className="mt-4 max-w-md text-base leading-7 text-[#62766d]">
                Share your free GetPersonalBrand address or connect a custom domain when you want your own URL on everything.
              </p>
              <div className="mt-8 flex items-center gap-3 rounded-2xl bg-[#f2f4ee] px-4 py-4 text-sm font-bold">
                <Globe2 className="size-4 shrink-0 text-[#6b8f3d]" />
                yourname.com
                <Check className="ml-auto size-4 text-[#6b8f3d]" />
              </div>
            </article>
            <article className="rounded-[28px] bg-[#e9edff] p-7 sm:p-10">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/70">
                <BarChart3 className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-8 text-3xl font-extrabold tracking-[-0.04em]">Know what resonates.</h2>
              <p className="mt-4 max-w-md text-base leading-7 text-[#596879]">
                See page views, link clicks, referrers, and device types in a simple analytics dashboard.
              </p>
              <div className="mt-8 rounded-2xl border border-[#173f35]/10 bg-white/80 p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#758196]">Site activity</p>
                    <p className="mt-1 text-xl font-extrabold">Your latest views</p>
                  </div>
                  <span className="rounded-full bg-[#e3f4cf] px-2.5 py-1 text-[9px] font-bold text-[#4b6b2d]">Live data</span>
                </div>
                <div className="mt-5 flex h-16 items-end gap-2">
                  {[32, 48, 40, 65, 54, 78, 92, 72, 100].map((height, index) => (
                    <span key={index} className="flex-1 rounded-t-md bg-[#91a8d9]" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 sm:pb-28 lg:px-10">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[30px] bg-[#d8ff8d] px-6 py-14 text-center sm:px-10 sm:py-20">
            <div className="absolute -left-14 -top-20 size-52 rounded-full border-[32px] border-[#173f35]/5" />
            <div className="absolute -bottom-24 -right-12 size-64 rounded-full border-[38px] border-[#173f35]/5" />
            <div className="relative mx-auto max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#55732f]">Your next chapter needs a home</p>
              <h2 className="mt-4 text-4xl font-extrabold leading-[1.03] tracking-[-0.05em] sm:text-6xl">
                Put it all together.
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-[#496238]">
                Your links, your story, your best work. One free personal site, ready to grow with you.
              </p>
              <div className="mt-8">
                <StartLink />
              </div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}
