const pains = [
  {
    title: "অ্যাড চালাচ্ছেন — ইনবক্স হারাচ্ছেন",
    body: "টাকা খরচ হচ্ছে Facebook ads-এ, কিন্তু রিপ্লাই দেরি হলেই কাস্টমার চলে যায়।",
  },
  {
    title: "মডারেটর = বাড়তি খরচ",
    body: "মডারেটর রাখলে খরচ বাড়ে; নিজে রিপ্লাই করলে সময় শেষ। রাতের মেসেজ সকাল পর্যন্ত পড়ে থাকে।",
  },
  {
    title: "AI আছে — কিন্তু কাজের না",
    body: "সাধারণ চ্যাটবট শুধু মেনু ঘোরায়। অর্ডার নিতে পারে না, ছবি পাঠায় না, Sheet-এ লগ করে না।",
  },
];

export function Problem() {
  return (
    <section className="section problem" id="problem">
      <div className="section__inner">
        <p className="eyebrow">The real leak</p>
        <h2 className="section__title">
          Ads চালাচ্ছেন, টাকা খরচ হচ্ছে — রিপ্লাই দেরিতে সেল হারাচ্ছেন?
        </h2>
        <p className="section__lead">
          মডারেটর খরচ বাড়ছে। নিজে রিপ্লাই করতে সময় কমছে। যে AI আছে, সেটা কাজের না।
          FaceTai এই ফাঁক বন্ধ করে — Messenger-এ আপনার নিজের AI agent দিয়ে।
        </p>
        <ul className="problem__list">
          {pains.map((pain) => (
            <li key={pain.title}>
              <strong>{pain.title}</strong>
              <span>{pain.body}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
