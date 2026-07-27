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
        <Products />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
