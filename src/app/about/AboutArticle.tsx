"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Header } from "@/components/layout/Header";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";

interface AboutArticleProps {
  title: string;
  content: string;
}

export function AboutArticle({ title, content }: AboutArticleProps) {
  const { user } = useAuth();

  return (
    <>
      {user ? <Header showAccountLink={true} /> : <Navbar />}
      <main
        className={`max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 ${user ? "" : "pt-28"}`}
      >
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>

        <article className="prose dark:prose-invert max-w-none mt-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </main>
      <Footer />
    </>
  );
}
