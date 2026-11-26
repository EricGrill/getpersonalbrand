import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { MarketingHeader } from "@/components/marketing/marketing-header"

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f8f2]" style={{ fontFamily: "var(--font-inter), Arial, Helvetica, sans-serif" }}>
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  )
}
