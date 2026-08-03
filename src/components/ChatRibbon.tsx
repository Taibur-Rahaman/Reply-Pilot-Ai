export function ChatRibbon() {
  return (
    <div className="chat-ribbon" aria-hidden="true">
      <div className="chat-ribbon__glow" />
      <div className="chat-ribbon__thread">
        <div className="bubble bubble--in bubble--delay-1">
          আপনাদের ডেলিভারি কতদিনে?
        </div>
        <div className="bubble bubble--out bubble--delay-2">
          সাধারণত ২–৩ কর্মদিবস। ঢাকার ভিতরে এক্সপ্রেসও আছে — অর্ডার নিতে পারি?
        </div>
        <div className="bubble bubble--in bubble--delay-3">
          হ্যাঁ, সাইজ M একটা কালো টি-শার্ট।
        </div>
        <div className="bubble bubble--out bubble--delay-4">
          <span className="bubble__img" />
          অর্ডার নোট: M · Black · ৳890
          <br />
          Google Sheet-এ সেভ হয়েছে ✓
        </div>
        <div className="bubble bubble--typing bubble--delay-5">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
