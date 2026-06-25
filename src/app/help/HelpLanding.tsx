"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { HELP_ARTICLES, articlesInGroup, type HelpArticleMeta } from "@/lib/help";

// Standard article row used in the grouped lists. Hub rows can carry nested
// "spoke" rows (e.g. Recipes under Profiles).
function ArticleRow({
  article,
  spokes = [],
}: {
  article: HelpArticleMeta;
  spokes?: HelpArticleMeta[];
}) {
  return (
    <li>
      <Link
        href={`/help/${article.slug}`}
        className="block rounded-lg border border-border bg-card-bg px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
      >
        <span className="font-medium text-foreground">{article.title}</span>
        <span className="block text-sm text-muted mt-0.5">{article.blurb}</span>
      </Link>
      {spokes.length > 0 && (
        <ul className="mt-2 ml-4 space-y-2 border-l border-border pl-4">
          {spokes.map((s) => (
            <ArticleRow key={s.slug} article={s} />
          ))}
        </ul>
      )}
    </li>
  );
}

function Section({ title, articles }: { title: string; articles: HelpArticleMeta[] }) {
  // Render hubs at the top level with their spokes nested beneath; spokes are
  // not rendered on their own.
  const hubs = articles.filter((a) => !a.spokeOf);
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <ul className="mt-4 space-y-3">
        {hubs.map((hub) => (
          <ArticleRow
            key={hub.slug}
            article={hub}
            spokes={articles.filter((a) => a.spokeOf === hub.slug)}
          />
        ))}
      </ul>
    </section>
  );
}

export function HelpLanding() {
  const { user } = useAuth();

  const featured = HELP_ARTICLES.find((a) => a.group === "start-here");
  const platform = articlesInGroup("platform");
  // The account group holds plans/account/notifications plus FAQ; FAQ is
  // surfaced separately in the "Can't find" section, so exclude it here.
  const account = articlesInGroup("account").filter((a) => a.slug !== "faq");

  return (
    <div className="min-h-screen flex flex-col">
      {user ? <Header showAccountLink={true} /> : <Navbar />}
      <main
        className={`flex-1 w-full max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 ${
          user ? "" : "pt-28"
        }`}
      >
        <h1 className="text-3xl font-bold text-foreground">Help Center</h1>
        <p className="text-muted mt-2">
          Guides and answers for using Government Procurement Hub.
        </p>

        {/* Start here — visually distinct featured card. */}
        {featured && (
          <section className="mt-8">
            <Link
              href={`/help/${featured.slug}`}
              className="block rounded-xl border border-primary/30 bg-primary/5 px-6 py-5 transition-colors hover:border-primary/60 hover:bg-primary/10"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                Start here
              </span>
              <span className="block text-lg font-semibold text-foreground mt-1">
                {featured.title}
              </span>
              <span className="block text-sm text-muted mt-1">{featured.blurb}</span>
            </Link>
          </section>
        )}

        <Section title="Using the platform" articles={platform} />
        <Section title="Plans, billing, and account" articles={account} />

        {/* Cross-cutting help: FAQ + direct support. */}
        <section className="mt-12 rounded-lg border border-border bg-card-bg px-6 py-5">
          <h2 className="text-lg font-semibold text-foreground">
            Can&rsquo;t find what you&rsquo;re looking for?
          </h2>
          <p className="text-sm text-muted mt-2">
            Browse our{" "}
            <Link href="/help/faq" className="text-primary hover:underline">
              Frequently Asked Questions
            </Link>
            , or contact our support team and we&rsquo;ll help.
          </p>
          <a
            href="https://gphusa.atlassian.net/servicedesk/customer/portals"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-sm font-medium text-primary hover:underline"
          >
            Contact support →
          </a>
        </section>
      </main>
      <Footer />
    </div>
  );
}
