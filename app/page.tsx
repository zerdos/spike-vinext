import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { McpPlayground } from "@/components/mcp-playground";
import { HowItWorks } from "@/components/how-it-works";
import { CategoriesCta } from "@/components/categories-cta";
import { ClientConfigs } from "@/components/client-configs";
import { Footer } from "@/components/footer";

export const revalidate = 300;

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b0e14] text-foreground flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <McpPlayground />
        <HowItWorks />
        <CategoriesCta />
        <ClientConfigs />
      </main>
      <Footer />
    </div>
  );
}
