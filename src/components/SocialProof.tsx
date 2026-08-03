const strips = [
  "Facebook Messenger first",
  "Typical use — no extra API/hosting charge",
  "Orders → Google Sheet",
  "Human handoff ready",
  "Bengali + English",
  "Built for BD businesses",
];

export function SocialProof() {
  return (
    <section className="proof" aria-label="FaceTai focus areas">
      <div className="proof__track">
        {[...strips, ...strips].map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </section>
  );
}
