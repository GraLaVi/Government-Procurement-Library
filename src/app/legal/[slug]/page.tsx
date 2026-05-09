import { promises as fs } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import type { Metadata } from "next";
import { LegalArticle } from "./LegalArticle";

// Slugs that have a corresponding markdown file in src/content/legal/.
// Add new entries here when you drop in `compliance.md`, `security.md`, etc.
const KNOWN_SLUGS = ["privacy", "terms"] as const;
type KnownSlug = (typeof KNOWN_SLUGS)[number];

interface Frontmatter {
  title?: string;
  last_updated?: string;
}

async function loadDoc(slug: string): Promise<{ frontmatter: Frontmatter; content: string } | null> {
  if (!(KNOWN_SLUGS as readonly string[]).includes(slug)) return null;
  const filePath = path.join(process.cwd(), "src", "content", "legal", `${slug}.md`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = matter(raw);
    return { frontmatter: parsed.data as Frontmatter, content: parsed.content };
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return KNOWN_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await loadDoc(slug);
  if (!doc) return {};
  return { title: doc.frontmatter.title ?? slug };
}

export default async function LegalDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await loadDoc(slug);
  if (!doc) notFound();

  return (
    <LegalArticle
      title={doc.frontmatter.title ?? slug}
      lastUpdated={doc.frontmatter.last_updated}
      content={doc.content}
    />
  );
}
