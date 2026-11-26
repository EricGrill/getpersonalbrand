import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, LegalSection } from "@/components/marketing/legal-page"

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
  description: "The content and conduct rules that keep GetPersonalBrand safe for site owners and visitors.",
}

export default function AcceptableUsePage() {
  return (
    <LegalPage
      eyebrow="Community rules"
      title="Acceptable Use Policy"
      summary="GetPersonalBrand is a place for real people and original work. These rules explain what is not allowed and how we respond to harmful activity."
    >
      <LegalSection title="1. The short version">
        <p>
          Use GetPersonalBrand to share your own work and communicate honestly. Do not use it to deceive, exploit, harass, or harm others, and do not use it to break the law or damage the service.
        </p>
        <p>
          This policy is part of our <Link href="/terms" className="font-semibold text-[#365f50] underline underline-offset-4">Terms of Service</Link>. It applies to accounts, published sites, uploaded files, links, and activity on the service.
        </p>
      </LegalSection>

      <LegalSection title="2. Impersonation and deception">
        <p>You may not:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-[#d07b55]">
          <li>Pretend to be another person, organization, or public figure, or falsely claim an affiliation with them.</li>
          <li>Use confusingly similar names, branding, images, or domains to mislead visitors about who operates a site.</li>
          <li>Create fake profiles, fabricated endorsements, or deceptive pages intended to obtain money, credentials, or personal information.</li>
        </ul>
        <p>
          Clearly labeled parody, commentary, or fan pages may be allowed when they do not mislead visitors or violate other rules.
        </p>
      </LegalSection>

      <LegalSection title="3. Phishing, fraud, and malicious activity">
        <p>You may not use a site, link, image, or form to:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-[#d07b55]">
          <li>Collect passwords, payment details, authentication codes, or other sensitive information under false pretenses.</li>
          <li>Distribute malware, viruses, spyware, ransomware, or other harmful code.</li>
          <li>Run scams, pyramid schemes, fraudulent fundraising, or deceptive commercial offers.</li>
          <li>Redirect visitors through disguised or misleading links to harmful destinations.</li>
          <li>Attempt to gain unauthorized access to accounts, systems, or data.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Spam and unwanted promotion">
        <p>
          Do not use GetPersonalBrand to send, host, or facilitate unsolicited bulk messages, comment spam, link spam, repetitive promotional pages, or automated schemes designed to manipulate traffic, search rankings, or engagement.
        </p>
        <p>
          Multiple sites or accounts created primarily to evade enforcement or distribute the same unwanted content are not allowed.
        </p>
      </LegalSection>

      <LegalSection title="5. Illegal and harmful content">
        <p>You may not publish or link to content that:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-[#d07b55]">
          <li>Violates applicable law or facilitates illegal activity.</li>
          <li>Sexually exploits or endangers children, or sexualizes minors in any way.</li>
          <li>Promotes terrorism, credible violence, or serious physical harm.</li>
          <li>Threatens, doxxes, stalks, or harasses a person or group.</li>
          <li>Incites hatred or violence against people based on protected characteristics.</li>
          <li>Depicts non-consensual intimate content or violates another person&apos;s privacy.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Intellectual property and personal rights">
        <p>
          Only publish content you own or have permission to use. Copyright infringement, trademark misuse, unauthorized use of someone&apos;s likeness, and disclosure of private information without a lawful basis are prohibited.
        </p>
        <p>
          You are responsible for obtaining permission for third-party images, media, testimonials, and other material included on your site.
        </p>
      </LegalSection>

      <LegalSection title="7. Protecting the service">
        <p>You may not:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-[#d07b55]">
          <li>Bypass security, access controls, rate limits, or technical restrictions.</li>
          <li>Probe, scan, or test the service for vulnerabilities without authorization.</li>
          <li>Overburden or disrupt infrastructure, interfere with other sites, or attempt to degrade availability.</li>
          <li>Scrape accounts, content, or analytics at scale, except through an authorized interface.</li>
          <li>Resell or provide unauthorized access to the service.</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Enforcement and site suspension">
        <p>
          We may review reports and investigate suspected violations. We have the right, at our reasonable discretion, to remove content, disable links, restrict features, suspend a site, or suspend or terminate an account at any time when needed to enforce this policy, protect visitors or the service, or comply with law.
        </p>
        <p>
          Serious violations, including phishing, malware, child exploitation, and credible threats, may result in immediate suspension without prior warning. For other issues, we may provide notice and an opportunity to correct the problem when appropriate. We may also report unlawful activity to relevant authorities.
        </p>
      </LegalSection>

      <LegalSection title="9. Reporting a concern">
        <p>
          If you believe a GetPersonalBrand site violates this policy, report it through the support or abuse-reporting channel provided with the service. Include the site address, a description of the concern, and any relevant evidence. Do not include passwords, authentication codes, or unnecessary sensitive information.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to this policy">
        <p>
          We may revise this policy as risks, laws, and the service change. The date above shows the latest revision. Continued use of the service after a revision takes effect means you accept the updated policy.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
