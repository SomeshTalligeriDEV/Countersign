import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import LogoMarquee from "@/components/LogoMarquee";
import SeeItWork from "@/components/SeeItWork";
import WhatItDoes from "@/components/WhatItDoes";
import LanguageMarquee from "@/components/LanguageMarquee";
import HowItWorks from "@/components/HowItWorks";
import Safety from "@/components/Safety";
import FAQ from "@/components/FAQ";
import WaitlistCTA from "@/components/WaitlistCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Nav />
      <Hero />
      <LogoMarquee />
      <SeeItWork />
      <WhatItDoes />
      <LanguageMarquee />
      <HowItWorks />
      <Safety />
      <FAQ />
      <WaitlistCTA />
      <Footer />
    </main>
  );
}
