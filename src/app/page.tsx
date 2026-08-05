import { Features } from "@/components/Features";
import { FinalCTA } from "@/components/FinalCTA";
import { Hero } from "@/components/Hero";
import { Pricing } from "@/components/Pricing";
import { Problem } from "@/components/Problem";
import { SiteFooter } from "@/components/SiteFooter";
import { SocialProof } from "@/components/SocialProof";
import { WebChatWidget } from "@/components/WebChatWidget";

export default function Home() {
  return (
    // `legacy-site` opts this page into the original light theme. The
    // redesigned app shell runs on the Dark Premium tokens instead.
    <main className="legacy-site">
      <Hero />
      <Problem />
      <Features />
      <Pricing />
      <SocialProof />
      <FinalCTA />
      <SiteFooter />
      <WebChatWidget />
    </main>
  );
}
