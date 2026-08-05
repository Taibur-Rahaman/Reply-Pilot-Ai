const features = [
  {
    title: "Omnichannel Inbox",
    body: "Messenger, WhatsApp, Instagram, Website Chat, Telegram — এক ড্যাশবোর্ডে সব মেসেজ।",
  },
  {
    title: "AI Sales Agent",
    body: "প্রোডাক্ট রিকগনিশন, রিকমেন্ডেশন (upsell/cross-sell/bundle), অর্ডার ও ইনভয়েস।",
  },
  {
    title: "Knowledge + Bangla-first",
    body: "PDF/Excel/DOCX + Drive/Sheets/Notion stubs — Bangla, Banglish, BD slang বোঝে।",
  },
  {
    title: "Complaint + Comment AI",
    body: "কমপ্লেইন ডিটেকশন ও এস্কেলেশন; Facebook comment spam + lead capture।",
  },
  {
    title: "Ecommerce Connectors",
    body: "WooCommerce, Shopify, WordPress, OpenCart — sync stubs + CSV/JSON import।",
  },
  {
    title: "সাধারণ ব্যবহারে অতিরিক্ত API/Hosting চার্জ নেই",
    body: "প্যাকেজ প্রাইস যা দেখছেন, সাধারণ ব্যবহারের জন্য সেটাই। উচ্চ ভলিউমে fair-use সারচার্জ হতে পারে।",
  },
];

export function Features() {
  return (
    <section className="section features" id="solution">
      <div className="section__inner">
        <p className="eyebrow">AI Business Operating System</p>
        <h2 className="section__title">
          চ্যাটবট নয় — পুরো বিজনেস অপারেটিং সিস্টেম।
        </h2>
        <p className="section__lead">
          ReplyPilot AI is an AI Business Operating System for Bangladeshi businesses —
          AI Sales Agent + Omnichannel Inbox + CRM + Knowledge Base + Order
          Management + Analytics + Automation — all in one platform.
        </p>
        <ul className="feature-grid">
          {features.map((feature) => (
            <li key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
