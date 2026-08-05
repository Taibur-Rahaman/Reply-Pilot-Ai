import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_NAME, whatsappLink, WHATSAPP_DISPLAY } from "@/lib/config";

export const metadata: Metadata = {
  title: `Terms of Service — ${SITE_NAME}`,
  description: `Terms for using ${SITE_NAME}'s AI Messenger sales agent and dashboard.`,
};

export default function TermsPage() {
  return (
    <main className="legacy-site">
      <article className="legal">
        <h1>Terms of Service</h1>
        <p className="legal__updated">Last updated: August 2026</p>

        <p>
          These terms govern use of {SITE_NAME} (the &ldquo;Service&rdquo;) by a
          business (&ldquo;you&rdquo;, &ldquo;tenant&rdquo;) that signs up for a dashboard account.
          By using the Service you agree to these terms.
        </p>

        <h2>The Service</h2>
        <p>
          {SITE_NAME} provides an AI-assisted Messenger/website sales agent,
          an omnichannel inbox, and CRM-style tooling (leads, orders,
          complaints, catalog) for small and medium businesses. Plans and
          pricing are shown on our pricing page and may change with notice.
        </p>

        <h2>Your responsibilities</h2>
        <ul>
          <li>Provide accurate business information and keep your login
            credentials confidential.</li>
          <li>Only upload product/FAQ content you have the right to use.</li>
          <li>Use the Service in compliance with Meta&apos;s Platform Terms
            when connecting a Facebook Page, and with applicable Bangladesh
            consumer-protection and data-protection law.</li>
          <li>Do not use the Service to send spam, deceptive offers, or
            content that violates the law.</li>
        </ul>

        <h2>AI-generated replies</h2>
        <p>
          Replies from the AI agent are generated automatically and, while
          guardrailed against inventing prices/stock, may occasionally be
          inaccurate. You are responsible for reviewing AI configuration
          (system prompt, catalog, FAQ) and for confirming orders before
          fulfillment. The human-handoff feature lets your team take over
          any conversation at any time.
        </p>

        <h2>Availability</h2>
        <p>
          We aim for high availability but do not guarantee uninterrupted
          service. Scheduled maintenance and third-party outages (e.g. the
          configured AI provider or Meta Platform) may affect availability
          from time to time.
        </p>

        <h2>Billing</h2>
        <p>
          Paid plans are billed as agreed at signup (currently invoiced
          manually via WhatsApp/bKash/bank transfer for the Bangladesh
          market). Fair-use limits apply to &ldquo;no extra API/hosting charge&rdquo;
          plans as described on the pricing page; sustained abuse or
          unusually high volume may require an upgrade.
        </p>

        <h2>Termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or
          terminate access for violation of these terms, non-payment, or
          abuse of the platform (including automated abuse of public
          endpoints). We will make reasonable efforts to notify you first
          except in cases of security risk.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          The Service is provided &ldquo;as is.&rdquo; To the maximum extent permitted
          by law, {SITE_NAME} is not liable for indirect, incidental, or
          consequential damages arising from use of the Service, including
          losses from AI-generated replies or third-party platform outages.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms? WhatsApp{" "}
          <a href={whatsappLink("general")} target="_blank" rel="noreferrer">
            {WHATSAPP_DISPLAY}
          </a>
          .
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}
