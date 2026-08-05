import { WHATSAPP_DISPLAY, whatsappLink } from "@/lib/config";
import { LeadForm } from "./LeadForm";

export function FinalCTA() {
  return (
    <section className="section final-cta" id="lead">
      <div className="section__inner final-cta__inner">
        <div className="final-cta__copy">
          <p className="eyebrow">Next step</p>
          <h2 className="section__title">
            আজই ইনবক্সকে সেলস চ্যানেলে বদলান।
          </h2>
          <p className="section__lead">
            SaaS ৳1,990/mo থেকে — optional setup add-ons (৳3,900+ / ৳8,000+) বা কাস্টম
            Messenger AI — কয়েকটা ডিটেইল দিন, আমরা প্যাকেজ রেকমেন্ড করব।
          </p>
          <a
            className="btn btn--whatsapp"
            href={whatsappLink("consultation")}
            target="_blank"
            rel="noreferrer"
          >
            Prefer chat? WhatsApp {WHATSAPP_DISPLAY}
          </a>
        </div>
        <div className="final-cta__form">
          <LeadForm />
        </div>
      </div>
    </section>
  );
}
