import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ExternalLink, Terminal } from "lucide-react";

const links = [
  {
    href: "https://github.com/cloudflare/vinext",
    label: "vinext",
  },
  {
    href: "https://developers.cloudflare.com/workers/",
    label: "Workers",
  },
];

export const revalidate = 300;

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <section className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="flex flex-col items-start gap-4">
          <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold text-primary">
            vinext + Cloudflare Workers
          </Badge>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Build Next.js-style apps with Vite and deploy them to the edge.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            This App Router project is powered by vinext, Tailwind CSS v4, shadcn/ui, and Cloudflare Workers.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Terminal className="h-4 w-4 text-primary" />
                Develop
              </CardTitle>
              <CardDescription>Run the vinext dev server locally.</CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block rounded-md bg-muted px-3 py-2 font-mono text-xs">pnpm run dev</code>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Terminal className="h-4 w-4 text-primary" />
                Build
              </CardTitle>
              <CardDescription>Create Worker-ready production output.</CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block rounded-md bg-muted px-3 py-2 font-mono text-xs">pnpm run build</code>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Terminal className="h-4 w-4 text-primary" />
                Deploy
              </CardTitle>
              <CardDescription>Ship the generated Worker with cf.</CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block rounded-md bg-muted px-3 py-2 font-mono text-xs">pnpm run deploy</code>
            </CardContent>
          </Card>
        </div>

        <nav className="flex flex-wrap items-center gap-3">
          {links.map((link) => (
            <Button asChild variant="outline" key={link.href}>
              <a href={link.href} rel="noreferrer" target="_blank">
                {link.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          ))}
          <Button asChild variant="secondary">
            <a href="/api/hello">API route</a>
          </Button>
        </nav>
      </section>
    </main>
  );
}
