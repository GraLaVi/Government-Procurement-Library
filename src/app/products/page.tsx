import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCTA } from "@/components/products/ProductSections";
import { BoxIcon, ChartIcon, SearchIcon, SendIcon, TargetIcon } from "@/components/icons";
import { PRODUCT_PAGES } from "@/lib/products";

export const metadata: Metadata = {
  title: "Products | Government Procurement Hub",
  description:
    "Bid-matching, RFQs, the parts and vendor library, supplier stock, and procurement analytics — what each one does, and a live mock-up of the screen you get.",
};

const ICONS = {
  "bid-matching": TargetIcon,
  rfq: SendIcon,
  library: SearchIcon,
  "supplier-stock": BoxIcon,
  analytics: ChartIcon,
} as const;

export default function ProductsIndexPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="relative overflow-hidden pt-32 pb-12 lg:pt-40">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-light/35 via-white to-white dark:from-primary-light/25 dark:via-background dark:to-background" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-secondary dark:text-foreground sm:text-5xl">
              Five products, one procurement picture.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted dark:text-foreground/70 sm:text-xl">
              Each one has a page of its own explaining how it works, with a
              mock-up of the actual screen you can click through before you sign
              up for anything.
            </p>
          </div>
        </section>

        <section className="pb-16 lg:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-2">
              {PRODUCT_PAGES.map((product) => {
                const Icon = ICONS[product.slug];
                const card = (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-secondary dark:text-card-foreground">
                      {product.name}
                    </h2>
                    <p className="mt-2 leading-relaxed text-muted dark:text-card-foreground/80">
                      {product.blurb}
                    </p>
                    <span className="mt-6 inline-flex items-center font-medium text-primary">
                      {product.href ? "How it works →" : "Page coming soon"}
                    </span>
                  </>
                );
                return product.href ? (
                  <Link
                    key={product.slug}
                    href={product.href}
                    className="flex flex-col rounded-2xl border border-border bg-card-bg p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-lg lg:p-8"
                  >
                    {card}
                  </Link>
                ) : (
                  <div
                    key={product.slug}
                    className="flex flex-col rounded-2xl border border-border bg-card-bg p-6 opacity-70 lg:p-8"
                  >
                    {card}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <ProductCTA
          title="Start with the free tier."
          body="Parts and vendor lookup, one bid-matching profile, and free inventory upload — no card required."
          primaryCta={{ href: "/signup?tier=free", label: "Start free" }}
          secondaryCta={{ href: "/pricing", label: "See pricing" }}
        />
      </main>
      <Footer />
    </>
  );
}
