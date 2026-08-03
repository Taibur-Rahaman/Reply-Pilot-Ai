import { WHATSAPP_DISPLAY, whatsappUrlWithText, SITE_NAME, LOGIN_PATH } from "@/lib/config";
import { ChatRibbon } from "./ChatRibbon";

const consultText = `Hi ${SITE_NAME} — I want a free consultation about your Messenger AI agent.`;

export function Hero() {
  return (
    <header className="hero">
      <div className="hero__atmosphere" aria-hidden="true" />
      <div className="hero__inner">
        <p className="brand-mark">{SITE_NAME}</p>
        <h1 className="hero__headline">
          AI Messenger Sales Agent
          <span className="hero__headline-en">
            {SITE_NAME} helps Bangladeshi businesses reply on Facebook Messenger
            — product Q&A, negotiation tone, orders, and a full ops
            dashboard after you sign in.
          </span>
        </h1>
        <p className="hero__support">
          Plans from ৳1,990/mo. Bangla-first AI, ecommerce connectors, complaint
          center — built for BD sellers. সাধারণ ব্যবহারের জন্য কোনো অতিরিক্ত API
          বা Hosting চার্জ নেই.
        </p>
        <div className="hero__ctas">
          <a className="btn btn--primary" href="#lead">
            Get a free consultation
          </a>
          <a className="btn btn--ghost" href={LOGIN_PATH}>
            Log in
          </a>
          <a className="btn btn--ghost" href="#pricing">
            View pricing
          </a>
          <a
            className="btn btn--whatsapp"
            href={whatsappUrlWithText(consultText)}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp {WHATSAPP_DISPLAY}
          </a>
        </div>
      </div>
      <ChatRibbon />
    </header>
  );
}
