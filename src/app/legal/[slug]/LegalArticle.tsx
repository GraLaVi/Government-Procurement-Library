"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Header } from "@/components/layout/Header";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";

interface LegalArticleProps {
  title: string;
  lastUpdated?: string;
  content: string;
}

function formatLastUpdated(iso?: string): string | null {
  if (!iso) return null;
  // Accept either ISO (YYYY-MM-DD) or any free-form string and pretty-print
  // ISO; otherwise pass through as-is so authors can hand-write things like
  // "May 2026" without breaking rendering.
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function LegalArticle({ title, lastUpdated, content }: LegalArticleProps) {
  const { user } = useAuth();
  const formatted = formatLastUpdated(lastUpdated);

  return (
    <>
      {user ? <Header showAccountLink={true} /> : <Navbar />}
      <main
        className={`max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 ${user ? "" : "pt-28"}`}
      >
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {formatted && <p className="text-xs text-muted mt-1">Last updated: {formatted}</p>}

        <article className="prose dark:prose-invert max-w-none mt-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </main>
      <Footer />
    </>
  );
}
