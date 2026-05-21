import { promises as fs } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import type { Metadata } from "next";
import { AboutArticle } from "./AboutArticle";

interface Frontmatter {
  title?: string;
}

async function loadDoc(): Promise<{ frontmatter: Frontmatter; content: string } | null> {
  const filePath = path.join(process.cwd(), "src", "content", "about.md");
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = matter(raw);
    return { frontmatter: parsed.data as Frontmatter, content: parsed.content };
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const doc = await loadDoc();
  if (!doc) return {};
  return { title: doc.frontmatter.title ?? "About" };
}

export default async function AboutPage() {
  const doc = await loadDoc();
  if (!doc) notFound();

  return (
    <AboutArticle
      title={doc.frontmatter.title ?? "About"}
      content={doc.content}
    />
  );
}
