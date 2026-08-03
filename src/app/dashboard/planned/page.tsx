export default function PlannedPage() {
  const items = [
    {
      id: "F41",
      title: "Broadcast Campaign",
      wave: "Wave B+",
      status: "Planned",
      body: "Messenger / WhatsApp broadcasts to segmented audiences (e.g. ordered last 30 days), policy-compliant.",
    },
    {
      id: "F45",
      title: "Voice Calling AI",
      wave: "Wave C",
      status: "Planned",
      body: "Receive calls → appointment / order confirm flows.",
    },
    {
      id: "F49",
      title: "AI Workflow Builder",
      wave: "Wave C",
      status: "Planned",
      body: "Drag-drop IF/THEN automations — no deploy for day-to-day changes.",
    },
    {
      id: "F50",
      title: "White Label Agency Mode",
      wave: "Wave C",
      status: "Planned",
      body: "Multi-business under agency brand with client isolation.",
    },
    {
      id: "F-mobile",
      title: "Native Mobile Apps",
      wave: "Future",
      status: "Roadmap stub",
      body: "Android + iOS FaceTai ops apps with push notifications for new leads, complaints, and orders. Web dashboard is the current surface.",
    },
    {
      id: "F46-live",
      title: "Live ecommerce API sync",
      wave: "Next",
      status: "Partial → next",
      body: "WooCommerce/Shopify/WordPress/OpenCart UI + stub sync shipped. Full REST/Graph product+stock sync when store keys validated.",
    },
  ];

  return (
    <div>
      <h1 className="dash__title">Roadmap</h1>
      <p className="dash__lead">
        Honest placeholders — FaceTai 2.0 shipped omnichannel inbox, recognition,
        orders/invoices, complaints, recommendations, ecommerce stubs, comment AI,
        and knowledge hub expansion. Native mobile remains future.
      </p>
      <div className="dash-roadmap">
        {items.map((item) => (
          <article key={item.id} className="dash-panel">
            <p className="eyebrow">
              {item.id} · {item.wave}
            </p>
            <h2>{item.title}</h2>
            <p className="dash-tag">{item.status}</p>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
