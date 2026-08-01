import { promises as fs } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import type { Metadata } from "next";
import { HELP_SLUGS, getHelpArticle } from "@/lib/help";
import { HelpArticle } from "./HelpArticle";

interface Frontmatter {
  title?: string;
  meta_title?: string;
  description?: string;
  last_updated?: string;
}

// Articles use `<!-- ... -->` to park copy for features that aren't launched
// yet (see the HIDDEN UNTIL ... markers in src/content/help/). react-markdown
// already drops raw HTML, so those comments never render — but `content` is a
// prop on a client component, so the markdown would otherwise ship verbatim in
// the RSC payload and be readable from view-source. Strip the comments here,
// on the server, so unreleased copy never reaches the browser at all.
function stripHiddenComments(markdown: string): string {
  return markdown.replace(/<!--[\s\S]*?-->/g, "");
}

async function loadDoc(
  slug: string,
): Promise<{ frontmatter: Frontmatter; content: string } | null> {
  if (!HELP_SLUGS.includes(slug)) return null;
  const filePath = path.join(process.cwd(), "src", "content", "help", `${slug}.md`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = matter(raw);
    return {
      frontmatter: parsed.data as Frontmatter,
      content: stripHiddenComments(parsed.content),
    };
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return HELP_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await loadDoc(slug);
  if (!doc) return {};
  return {
    // meta_title is the SEO `<title>`; fall back to the on-page H1.
    title: doc.frontmatter.meta_title ?? doc.frontmatter.title ?? slug,
    description: doc.frontmatter.description,
  };
}

export default async function HelpDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await loadDoc(slug);
  if (!doc) notFound();

  const meta = getHelpArticle(slug);

  return (
    <HelpArticle
      title={doc.frontmatter.title ?? meta?.title ?? slug}
      lastUpdated={doc.frontmatter.last_updated}
      content={doc.content}
    />
  );
}
