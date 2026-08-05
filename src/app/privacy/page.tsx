import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_NAME, whatsappLink, WHATSAPP_DISPLAY } from "@/lib/config";

export const metadata: Metadata = {
  title: `Privacy Policy — ${SITE_NAME}`,
  description: `How ${SITE_NAME} collects, uses, and protects data for businesses and their customers.`,
};

export default function PrivacyPage() {
  return (
    <main className="legacy-site">
      <article className="legal">
        <h1>Privacy Policy</h1>
        <p className="legal__updated">Last updated: August 2026</p>

        <p>
          {SITE_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides an AI Messenger/website sales
          agent and dashboard for businesses (&ldquo;tenants&rdquo;) in Bangladesh. This
          policy explains what we collect, why, and how it is protected —
          both for tenant staff who log into the dashboard and for the
          end-customers who chat with a tenant&apos;s AI agent.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Tenant account data:</strong> name, email, password
            (hashed), and role for dashboard users.
          </li>
          <li>
            <strong>Customer conversation data:</strong> messages, sender
            identifiers (e.g. Messenger PSID, WhatsApp number, session ID),
            and any images sent to the AI agent, so the tenant can serve
            orders and support requests.
          </li>
          <li>
            <strong>Order / lead data:</strong> name, phone number, address,
            and order details submitted through chat or the website lead
            form.
          </li>
          <li>
            <strong>Usage data:</strong> basic request logs (IP address,
            timestamps) used for security, rate limiting, and abuse
            prevention.
          </li>
        </ul>

        <h2>How we use it</h2>
        <ul>
          <li>To operate the AI sales agent — answering questions, taking
            orders, and handing off to a human agent when needed.</li>
          <li>To give each tenant a dashboard of their own leads, orders,
            conversations, and complaints (tenant data is isolated — one
            tenant cannot see another tenant&apos;s data).</li>
          <li>To improve reliability and prevent abuse (e.g. rate limiting
            spam submissions).</li>
          <li>To generate an AI cost estimate and analytics shown only to
            that tenant.</li>
        </ul>

        <h2>Third parties</h2>
        <p>
          Messages may be sent to a third-party AI provider (e.g. OpenAI,
          Groq, or a self-hosted model) solely to generate a reply. We do
          not sell customer data. Optional integrations (Google Sheets
          webhook for leads/orders, Meta Messenger, e-commerce platforms)
          only receive data a tenant explicitly configures.
        </p>

        <h2>Data retention</h2>
        <p>
          Conversation, lead, and order records are retained for as long as
          the tenant account is active, so the business can reference order
          history and past conversations. A tenant may request deletion of
          their account and associated data by contacting us.
        </p>

        <h2>Cookies</h2>
        <p>
          We use a single first-party, httpOnly session cookie
          (<code>facetai_session</code>) to keep dashboard users signed in.
          It is required for the dashboard to function and is not used for
          advertising or cross-site tracking. We do not currently use
          third-party analytics or advertising cookies; if that changes,
          this policy will be updated and a consent banner added where
          required by law.
        </p>

        <h2>Your rights</h2>
        <p>
          You can request access to, correction of, or deletion of your
          personal data by contacting the business you interacted with
          (the tenant), or by messaging us directly on WhatsApp at{" "}
          <a href={whatsappLink("general")} target="_blank" rel="noreferrer">
            {WHATSAPP_DISPLAY}
          </a>
          .
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy? WhatsApp{" "}
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
