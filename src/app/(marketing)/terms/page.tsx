import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, LegalSection } from "@/components/marketing/legal-page"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern use of GetPersonalBrand and the sites created with it.",
}

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      summary="These terms set out the rules for using GetPersonalBrand and the responsibilities that come with publishing your site."
    >
      <LegalSection title="1. Agreement to these terms">
        <p>
          These Terms of Service are an agreement between you and GetPersonalBrand. By creating an account, accessing the service, or publishing a site, you agree to these terms and our <Link href="/acceptable-use" className="font-semibold text-[#365f50] underline underline-offset-4">Acceptable Use Policy</Link>. If you do not agree, do not use the service.
        </p>
        <p>
          If you use GetPersonalBrand for an organization, you represent that you have authority to accept these terms for that organization.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility and your account">
        <p>
          You must be at least 13 years old and legally able to enter into this agreement. If you are under the age of legal majority where you live, you may use the service only with the involvement and consent of a parent or legal guardian.
        </p>
        <p>
          Provide accurate registration information and keep it current. You are responsible for safeguarding your password and for activity under your account. Tell us promptly through the available support channel if you believe your account has been accessed without permission.
        </p>
      </LegalSection>

      <LegalSection title="3. The service">
        <p>
          GetPersonalBrand provides tools to create, publish, and manage a personal website, including page blocks, visual editing, custom domain settings, and site analytics. The core service is currently offered free of charge.
        </p>
        <p>
          Features may change as the product develops. We may add, change, or remove features, but we will not describe a feature as available when it is not part of the service.
        </p>
      </LegalSection>

      <LegalSection title="4. Your content">
        <p>
          You retain ownership of the text, images, links, and other content you submit. You grant GetPersonalBrand a non-exclusive, worldwide license to host, store, reproduce, format, transmit, and display that content only as needed to operate, secure, and provide the service, including publishing your site when you choose to make it public.
        </p>
        <p>
          You are responsible for your content and must have the rights and permissions needed to publish it. You are also responsible for how you configure your site, including any public contact details and third-party links.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable use">
        <p>
          You may not use the service to impersonate others, conduct phishing, distribute spam or malware, publish illegal content, infringe intellectual property or privacy rights, or interfere with the service. Our <Link href="/acceptable-use" className="font-semibold text-[#365f50] underline underline-offset-4">Acceptable Use Policy</Link> explains these rules in more detail.
        </p>
      </LegalSection>

      <LegalSection title="6. Custom domains and third-party services">
        <p>
          If you connect a custom domain, you are responsible for owning or controlling that domain and for its registration, renewal, and DNS settings. Changes made by your domain provider are outside our control.
        </p>
        <p>
          Your site may link to third-party websites or services. GetPersonalBrand does not control and is not responsible for third-party content, policies, availability, or practices.
        </p>
      </LegalSection>

      <LegalSection title="7. Suspension and termination">
        <p>
          You may stop using the service at any time. We may limit, suspend, or terminate access to an account or site that violates these terms, creates risk for other users or the service, or exposes us to legal liability. Where reasonably possible, we will provide notice and an opportunity to resolve the issue.
        </p>
        <p>
          We may also discontinue the service or a feature. Provisions that by their nature should survive termination, including ownership, disclaimers, and limitations of liability, will remain in effect.
        </p>
      </LegalSection>

      <LegalSection title="8. Privacy">
        <p>
          Our <Link href="/privacy" className="font-semibold text-[#365f50] underline underline-offset-4">Privacy Policy</Link> describes the information we collect, how we use it, and the choices available to you. By using the service, you acknowledge those practices.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimers">
        <p>
          The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the extent permitted by law, GetPersonalBrand disclaims warranties of merchantability, fitness for a particular purpose, non-infringement, and any warranty that the service will be uninterrupted, error-free, or completely secure.
        </p>
        <p>
          You are responsible for maintaining copies of your content and for evaluating whether the service is suitable for your needs.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of liability">
        <p>
          To the extent permitted by law, GetPersonalBrand will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, goodwill, or data arising from or related to your use of the service.
        </p>
        <p>
          Nothing in these terms excludes liability that cannot legally be excluded or limited.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to these terms">
        <p>
          We may update these terms as the service or legal requirements change. The date above shows when they were last revised. Material changes will be presented through the service or by another reasonable method. Continued use after revised terms take effect means you accept the revised terms.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
