export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function extractTocFromMarkdown(content: string): TocItem[] {
  const headings: TocItem[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      const text = h2Match[1].replace(/[`*_[\]]/g, "").trim();
      const id = slugifyHeading(text);
      headings.push({ id, text, level: 2 });
      continue;
    }

    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      const text = h3Match[1].replace(/[`*_[\]]/g, "").trim();
      const id = slugifyHeading(text);
      headings.push({ id, text, level: 3 });
      continue;
    }
  }

  return headings;
}
