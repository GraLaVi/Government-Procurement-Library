"use client";

import Link from "next/link";
import { Children, type ComponentPropsWithoutRef, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Header } from "@/components/layout/Header";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";

interface HelpArticleProps {
  title: string;
  lastUpdated?: string;
  content: string;
}

function formatLastUpdated(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// Flatten a heading's React children into plain text so we can derive a
// stable id from it.
function nodeText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (child && typeof child === "object" && "props" in child) {
        return nodeText((child as { props: { children?: ReactNode } }).props.children);
      }
      return "";
    })
    .join("");
}

// GitHub-style heading slug, so in-article anchor links like
// `/help/...#condition-types` resolve to the matching heading.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function Heading({ as: Tag, children }: { as: "h2" | "h3" | "h4"; children?: ReactNode }) {
  return (
    <Tag id={slugify(nodeText(children))} className="scroll-mt-28">
      {children}
    </Tag>
  );
}

// Route internal links (anything starting with "/") through next/link so
// cross-article navigation stays client-side; leave external links alone.
function MarkdownLink({ href = "", children, ...rest }: ComponentPropsWithoutRef<"a">) {
  const isInternal = href.startsWith("/");
  if (isInternal) {
    return (
      <Link href={href} className="text-primary hover:underline">
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

export function HelpArticle({ title, lastUpdated, content }: HelpArticleProps) {
  const { user } = useAuth();
  const formatted = formatLastUpdated(lastUpdated);

  return (
    <div className="min-h-screen flex flex-col">
      {user ? <Header showAccountLink={true} /> : <Navbar />}
      <main
        className={`flex-1 w-full max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 ${
          user ? "" : "pt-28"
        }`}
      >
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <Link href="/help" className="text-muted hover:text-foreground transition-colors">
            ← Help Center
          </Link>
        </nav>

        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {formatted && <p className="text-xs text-muted mt-1">Last updated: {formatted}</p>}

        <article className="prose dark:prose-invert max-w-none mt-6">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: MarkdownLink,
              h2: (props) => <Heading as="h2">{props.children}</Heading>,
              h3: (props) => <Heading as="h3">{props.children}</Heading>,
              h4: (props) => <Heading as="h4">{props.children}</Heading>,
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </main>
      <Footer />
    </div>
  );
}
