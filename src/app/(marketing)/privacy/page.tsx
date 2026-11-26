import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, LegalSection } from "@/components/marketing/legal-page"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn what GetPersonalBrand stores, how visitor analytics work, and the choices available to you.",
}

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your data"
      title="Privacy Policy"
      summary="This policy explains what GetPersonalBrand collects from account holders and visitors, why we use it, and how we approach privacy on public sites."
    >
      <LegalSection title="1. Information you provide">
        <p>When you create and use an account, we store the information needed to provide the service:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-[#6b8f3d]">
          <li><strong className="font-semibold text-[#173f35]">Account details:</strong> your email address, username, and any optional name or profile details you provide.</li>
          <li><strong className="font-semibold text-[#173f35]">Password hash:</strong> if you register with a password, we store a cryptographic hash of it, not your plain-text password.</li>
          <li><strong className="font-semibold text-[#173f35]">Site content:</strong> the text, links, portfolio entries, layout, theme choices, and publishing settings you add.</li>
          <li><strong className="font-semibold text-[#173f35]">Images:</strong> images you upload for your profile or site, along with image URLs you choose to embed.</li>
          <li><strong className="font-semibold text-[#173f35]">Domain settings:</strong> custom domains you connect and their verification status.</li>
        </ul>
        <p>
          Content you publish is public by design. Do not publish private or sensitive information that you do not want visitors to see.
        </p>
      </LegalSection>

      <LegalSection title="2. Visitor analytics on public sites">
        <p>
          GetPersonalBrand provides site owners with aggregate information about visits to their published sites. When someone views a public site or clicks a tracked link, we may store:
        </p>
        <ul className="list-disc space-y-2 pl-5 marker:text-[#6b8f3d]">
          <li>The referring page or source, when the browser provides it.</li>
          <li>A general device type, such as mobile, tablet, or desktop.</li>
          <li>An approximate country, not a precise location.</li>
          <li>A daily hashed visitor identifier used to estimate visits and unique visitors.</li>
          <li>The event type, time, site, and, for link clicks, the relevant link.</li>
        </ul>
        <p>
          The daily visitor identifier is hashed and rotates each day. It is not the visitor&apos;s name or email address. Public GetPersonalBrand sites do not set analytics cookies or other GetPersonalBrand tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="3. Cookies and authentication">
        <p>
          Public sites do not use GetPersonalBrand analytics cookies. The signed-in application does use necessary authentication and security cookies to keep your session active, protect your account, and remember your signed-in state. These account cookies are separate from public-site visitor analytics.
        </p>
      </LegalSection>

      <LegalSection title="4. How we use information">
        <p>We use the information described above to:</p>
        <ul className="list-disc space-y-2 pl-5 marker:text-[#6b8f3d]">
          <li>Create and maintain your account and personal site.</li>
          <li>Save, publish, display, and deliver your content and images.</li>
          <li>Provide analytics dashboards to site owners.</li>
          <li>Authenticate users, prevent abuse, and keep the service secure.</li>
          <li>Maintain and improve features, diagnose errors, and respond to support requests.</li>
          <li>Comply with legal obligations and enforce our terms.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection title="5. When information is shared">
        <p>
          We may share information with service providers that help us host the application, store data and images, deliver content, authenticate accounts, or maintain security. They may process information only to provide those services to us.
        </p>
        <p>
          We may also disclose information when required by law, to protect rights and safety, to investigate abuse, or as part of a merger, acquisition, or transfer of the service. Public site content is available to anyone who visits the site, including search engines and people you share it with.
        </p>
      </LegalSection>

      <LegalSection title="6. Data retention">
        <p>
          We keep account and site information while your account is active and as needed afterward to provide the service, resolve disputes, prevent abuse, and meet legal obligations. Analytics records are retained as needed to provide site statistics and maintain service security.
        </p>
        <p>
          When information is no longer needed, we delete it, de-identify it, or securely isolate it until deletion is possible. Backup copies may remain for a limited period before they are overwritten.
        </p>
      </LegalSection>

      <LegalSection title="7. Your choices and rights">
        <p>
          You can review and change much of your site content through the editor and settings. You may also request access to, correction of, export of, or deletion of your personal information, subject to applicable law and legitimate retention needs.
        </p>
        <p>
          Depending on where you live, you may have additional rights to object to or restrict certain processing. You may also have the right to complain to a local data protection authority. Requests can be made through the support channel provided with the service.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We use reasonable technical and organizational measures designed to protect information, including password hashing and authenticated account access. No online service can guarantee absolute security, so you should use a unique password and protect access to your account.
        </p>
      </LegalSection>

      <LegalSection title="9. Children and international processing">
        <p>
          GetPersonalBrand is not directed to children under 13, and we do not knowingly collect personal information from them. If you believe a child under 13 has provided personal information, contact us through the available support channel so we can review and delete it as appropriate.
        </p>
        <p>
          The service may use infrastructure located in countries other than your own. By using the service, you understand that your information may be processed in those locations, subject to appropriate safeguards where required.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to this policy">
        <p>
          We may update this policy as the service and its data practices evolve. The date above shows the latest revision. Material changes will be presented through the service or by another reasonable method.
        </p>
        <p>
          You can also review our <Link href="/terms" className="font-semibold text-[#365f50] underline underline-offset-4">Terms of Service</Link> and <Link href="/acceptable-use" className="font-semibold text-[#365f50] underline underline-offset-4">Acceptable Use Policy</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
