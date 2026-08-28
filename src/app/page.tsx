import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { WhatGPHDoes } from "@/components/landing/WhatGPHDoes";
import { Products } from "@/components/landing/Products";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CTA } from "@/components/landing/CTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <WhatGPHDoes />
        {/* Features before Products on purpose: the plan cards are written in
            feature vocabulary ("5 profiles with full solicitation view"), so
            they only parse once Features has taught it. HowItWorks then sits
            between the two card grids — it's the only section on the page with
            a different shape, and its first step ("pick your plan, start free")
            hands straight off to the plan cards that now follow it. */}
        <Features />
        <HowItWorks />
        <Products />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
