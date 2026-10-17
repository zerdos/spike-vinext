import { Layers, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export function CategoriesCta() {
  return (
    <section
      id="categories"
      className="py-16 border-b-2 border-[#111315] bg-background"
    >
      <div className="mx-auto max-w-7xl px-4">
        <Card className="border-2 border-[#111315] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            <CardHeader className="lg:col-span-8 p-6 sm:p-10 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[#111315] bg-secondary text-primary shrink-0">
                  <Layers className="h-5 w-5" />
                </span>
                <CardTitle className="font-display text-2xl sm:text-4xl font-black tracking-tight text-foreground">
                  Tool Categories
                </CardTitle>
              </div>
              <CardDescription className="text-sm sm:text-base text-muted-foreground max-w-[62ch] leading-relaxed">
                Browse 88 categories and 455 tools with inline try-it forms, progressive disclosure, and edge-native performance.
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="font-mono">
                  88 DOMAIN GROUPS
                </Badge>
                <Badge variant="emerald" className="font-mono">
                  455 VERIFIED SCHEMAS
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="lg:col-span-4 p-6 sm:p-10 lg:border-l border-t lg:border-t-0 border-[#111315] bg-secondary/50 h-full flex items-center justify-start lg:justify-center">
              <Button size="lg" variant="default" asChild className="w-full sm:w-auto">
                <a href="#playground">
                  Browse All Categories
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </div>
        </Card>
      </div>
    </section>
  );
}
