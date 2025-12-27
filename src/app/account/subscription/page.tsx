"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { AssignedProduct } from "@/lib/users/types";

// Format product name for display
const formatProductName = (product: AssignedProduct): string => {
  return product.name || product.product_key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// Format source for display
const formatProductSource = (source: string): string => {
  const sourceLabels: Record<string, string> = {
    direct: "Direct Assignment",
    group: "Product Group",
    customer_direct: "Direct Assignment",
    customer_group: "Product Group",
  };
  return sourceLabels[source] || source;
};

// Format category for display
const formatCategory = (category: string | null): string => {
  if (!category) return "General";
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// Group products by category
const groupByCategory = (products: AssignedProduct[]): Record<string, AssignedProduct[]> => {
  return products.reduce((acc, product) => {
    const category = product.category || "general";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, AssignedProduct[]>);
};

export default function SubscriptionPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<AssignedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch organization products
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users/organization/products", {
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to fetch products");
        return;
      }

      setProducts(data);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchProducts();
    }
  }, [authLoading, user, fetchProducts]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted">Loading subscription...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const groupedProducts = groupByCategory(products);
  const categories = Object.keys(groupedProducts).sort();

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/account" className="text-muted hover:text-primary transition-colors">
              Account
            </Link>
          </li>
          <li className="text-muted">/</li>
          <li className="text-foreground font-medium">Subscription</li>
        </ol>
      </nav>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary">Subscription & Features</h1>
        <p className="text-muted mt-1">
          View all products and features available to your organization
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Summary card */}
      <div className="bg-card-bg rounded-xl border border-border p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-secondary">Active Subscription</h2>
            <p className="text-muted mt-1">
              Your organization has access to <span className="font-medium text-foreground">{products.length}</span> product{products.length !== 1 ? 's' : ''} and feature{products.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full"></span>
              <span className="text-sm font-medium text-success">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Products by category */}
      {products.length === 0 ? (
        <div className="bg-card-bg rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-muted-light rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-secondary mb-2">No Products Assigned</h3>
          <p className="text-muted max-w-md mx-auto">
            Your organization doesn&apos;t have any products assigned yet. Contact your account manager to add products to your subscription.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category} className="bg-card-bg rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-4 bg-muted-light/50 border-b border-border">
                <h3 className="text-base font-semibold text-secondary">
                  {formatCategory(category)}
                </h3>
                <p className="text-sm text-muted">
                  {groupedProducts[category].length} product{groupedProducts[category].length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="divide-y divide-border">
                {groupedProducts[category].map((product) => (
                  <div key={product.id} className="px-6 py-4 hover:bg-muted-light/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">
                              {formatProductName(product)}
                            </h4>
                            {product.description && (
                              <p className="text-sm text-muted mt-1">{product.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={product.is_active ? "success" : "warning"}>
                              {product.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <span className="text-xs text-muted">
                            <span className="font-medium">Source:</span> {formatProductSource(product.source)}
                          </span>
                          <span className="text-xs text-muted">
                            <span className="font-medium">Key:</span> <code className="bg-muted-light px-1.5 py-0.5 rounded text-xs">{product.product_key}</code>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info section */}
      <div className="mt-8 p-6 bg-info/5 border border-info/20 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-secondary">Need more features?</h4>
            <p className="text-sm text-muted mt-1">
              Contact your account manager or sales team to explore additional products and features for your organization.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
