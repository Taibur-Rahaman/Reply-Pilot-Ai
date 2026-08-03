import {
  MESSENGER_URL,
  WHATSAPP_DISPLAY,
  WHATSAPP_URL,
  SITE_NAME,
  LOGIN_PATH,
  DASHBOARD_PATH,
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
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
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
        <p className="site-footer__admin">
          <a href={LOGIN_PATH}>Log in</a>
          {" · "}
          <a href={DASHBOARD_PATH}>Dashboard</a>
          {" · "}
          <a href="/admin">Admin lite</a>
        </p>
      </div>
    </footer>
  );
}
