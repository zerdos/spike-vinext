import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { TokenSavingsSimulator } from "@/components/token-savings-simulator";
import { McpPlayground } from "@/components/mcp-playground";
import { HowItWorks } from "@/components/how-it-works";
import { CategoriesCta } from "@/components/categories-cta";
import { ClientConfigs } from "@/components/client-configs";
import { Footer } from "@/components/footer";

export const revalidate = 300;

export default function Home() {
  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 w-full min-w-0">
        <HeroSection />
        <TokenSavingsSimulator />
        <McpPlayground />
        <HowItWorks />
        <CategoriesCta />
        <ClientConfigs />
      </main>
      <Footer />
    </div>
  );
}
