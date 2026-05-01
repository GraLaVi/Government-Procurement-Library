import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BetaBanner } from "@/components/landing/BetaBanner";
import { Hero } from "@/components/landing/Hero";
import { Products } from "@/components/landing/Products";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CTA } from "@/components/landing/CTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <BetaBanner />
      <main>
        <Hero />
        <Products />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
