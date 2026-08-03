const saasPlans = [
  {
    name: "Starter",
    price: "৳1,990",
    cadence: "/ month",
    blurb: "ছোট পেজ ও নতুন সেলার — Omnichannel inbox + AI replies + basic catalog.",
    points: [
      "Messenger + Website chat",
      "KB FAQ + PDF/Excel upload",
      "Order capture + tracking light",
      "Fair-use AI replies",
    ],
    interest: "monthly",
    highlight: false,
  },
  {
    name: "Growth",
    price: "৳4,990",
    cadence: "/ month",
    blurb: "Ads চালানো স্টোর — recommendations, complaints, ecommerce stub sync.",
    points: [
      "Everything in Starter",
      "Recommendation engine",
      "Complaint Center",
      "Ecommerce connectors (sync stubs)",
      "Comment AI (spam + lead capture)",
    ],
    interest: "monthly",
    highlight: true,
  },
  {
    name: "Pro",
    price: "৳9,990",
    cadence: "/ month",
    blurb: "মাল্টি-চ্যানেল টিম — WhatsApp/IG placeholders + deeper KB + invoices.",
    points: [
      "Everything in Growth",
      "Invoice generation",
      "Product recognition",
      "Priority support SLA",
      "Higher fair-use headroom",
    ],
    interest: "chatbot-ai",
    highlight: false,
  },
  {
    name: "Business",
    price: "৳14,990",
    cadence: "/ month",
    blurb: "এজেন্সি / মাল্টি-পেজ — multi-tenant ops + Connect + analytics.",
    points: [
      "Everything in Pro",
      "Multi-tenant dashboard",
      "FaceTai Connect scaffold",
      "Team roles",
      "Analytics slice",
    ],
    interest: "custom-messenger",
    highlight: false,
  },
];

const addOns = [
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    blurb: "SLA, custom integrations, white-label roadmap, dedicated onboarding.",
  },
  {
    name: "One-time setup (optional)",
    price: "৳3,900+",
    cadence: "",
    blurb:
      "Rule / AI bot setup add-ons on request (৳3,900–৳50,000+ scoped) — primary packaging is monthly SaaS.",
  },
];

export function Pricing() {
  return (
    <section className="section pricing" id="pricing">
      <div className="section__inner">
        <p className="eyebrow">SaaS Pricing</p>
        <h2 className="section__title">মাসিক প্ল্যান। স্বচ্ছ fair-use।</h2>
        <p className="section__lead">
          FaceTai 2.0 — AI Business Operating System. Primary packaging is
          recurring monthly. One-time setup fees remain optional add-ons after
          consult.
        </p>
        <div className="price-grid">
          {saasPlans.map((pkg) => (
            <article
              key={pkg.name}
              className={`price-item ${pkg.highlight ? "price-item--highlight" : ""}`}
            >
              <h3>{pkg.name}</h3>
              <p className="price-item__amount">
                <span>{pkg.price}</span>
                <small>{pkg.cadence}</small>
              </p>
              <p className="price-item__blurb">{pkg.blurb}</p>
              <ul>
                {pkg.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <a className="btn btn--secondary" href="#lead">
                Ask about {pkg.name}
              </a>
            </article>
          ))}
        </div>
        <div className="price-grid" style={{ marginTop: "1.5rem" }}>
          {addOns.map((pkg) => (
            <article key={pkg.name} className="price-item">
              <h3>{pkg.name}</h3>
              <p className="price-item__amount">
                <span>{pkg.price}</span>
                <small>{pkg.cadence}</small>
              </p>
              <p className="price-item__blurb">{pkg.blurb}</p>
              <a className="btn btn--ghost" href="#lead">
                Talk to sales
              </a>
            </article>
          ))}
        </div>
        <p className="pricing__note">
          সাধারণ ব্যবহারের জন্য কোনো অতিরিক্ত API বা Hosting চার্জ নেই। উচ্চ
          ভলিউমে fair-use সারচার্জ প্রযোজ্য হতে পারে — কোটের সময় জানানো হবে।
        </p>
      </div>
    </section>
  );
}
