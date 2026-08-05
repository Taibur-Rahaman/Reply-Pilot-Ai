import {
  MESSENGER_URL,
  WHATSAPP_DISPLAY,
  whatsappLink,
  SITE_NAME,
  LOGIN_PATH,
} from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="brand-mark brand-mark--sm">{SITE_NAME}</p>
        <p>
          AI automation & Messenger agents for Bangladesh businesses. Typical
          use — no extra API or hosting charge on listed packages (fair use).
        </p>
        <p>
          <a href={whatsappLink("general")} target="_blank" rel="noreferrer">
            WhatsApp / Call {WHATSAPP_DISPLAY}
          </a>
          {MESSENGER_URL ? (
            <>
              {" · "}
              <a href={MESSENGER_URL} target="_blank" rel="noreferrer">
                Messenger
              </a>
            </>
          ) : null}
        </p>
        {/* "Admin lite" used to be linked here and from the customer sidebar.
            It is a staff tool that exposes the raw system prompt and internal
            doc paths, so it is no longer advertised to visitors. */}
        <p className="site-footer__admin">
          <a href={LOGIN_PATH}>Log in</a>
        </p>
        <p className="site-footer__legal">
          <a href="/privacy">Privacy Policy</a>
          {" · "}
          <a href="/terms">Terms of Service</a>
        </p>
      </div>
    </footer>
  );
}
