"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

const quickStats = [
  { label: "Active Opportunities", value: "127", change: "+12", trend: "up" },
  { label: "Saved Searches", value: "8", change: null, trend: null },
  { label: "Tracked Competitors", value: "15", change: "+2", trend: "up" },
  { label: "Alerts This Week", value: "23", change: "-5", trend: "down" },
];

const recentOpportunities = [
  {
    id: "1",
    title: "IT Support Services - Department of Defense",
    agency: "DoD",
    value: "$2.5M",
    deadline: "Dec 15, 2025",
    matchScore: 92,
  },
  {
    id: "2",
    title: "Cybersecurity Assessment - DHS",
    agency: "DHS",
    value: "$1.8M",
    deadline: "Dec 20, 2025",
    matchScore: 87,
  },
  {
    id: "3",
    title: "Cloud Migration Services - VA",
    agency: "VA",
    value: "$3.2M",
    deadline: "Jan 5, 2026",
    matchScore: 84,
  },
  {
    id: "4",
    title: "Software Development - GSA",
    agency: "GSA",
    value: "$950K",
    deadline: "Jan 10, 2026",
    matchScore: 79,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const userName = user?.first_name || user?.email?.split("@")[0] || "User";

  return (
    <>
      {/* Welcome section */}
      <div className="mb-8">
          <h1 className="text-2xl font-bold text-secondary">
            Welcome back, {userName}
          </h1>
          <p className="text-muted mt-1">
            Here&apos;s what&apos;s happening with your government contract opportunities.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-border p-6"
            >
              <div className="text-sm text-muted mb-1">{stat.label}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-secondary">{stat.value}</span>
                {stat.change && (
                  <span
                    className={`text-sm font-medium ${
                      stat.trend === "up" ? "text-success" : "text-error"
                    }`}
                  >
                    {stat.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Opportunities */}
        <div className="bg-white rounded-xl border border-border">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-secondary">
              Top Matching Opportunities
            </h2>
            <Button href="/opportunities" variant="ghost" size="sm">
              View All
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentOpportunities.map((opp) => (
              <div
                key={opp.id}
                className="px-6 py-4 hover:bg-muted-light/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-secondary truncate">
                      {opp.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted">
                      <span>{opp.agency}</span>
                      <span>{opp.value}</span>
                      <span>Due: {opp.deadline}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        opp.matchScore >= 90
                          ? "bg-success/10 text-success"
                          : opp.matchScore >= 80
                          ? "bg-accent/10 text-accent"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {opp.matchScore}% Match
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/opportunities/search"
            className="bg-white rounded-xl border border-border p-6 hover:border-primary/50 hover:shadow-lg transition-all group"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-secondary group-hover:text-primary transition-colors">
              Search Opportunities
            </h3>
            <p className="text-sm text-muted mt-1">
              Find new government contracts matching your capabilities
            </p>
          </Link>

          <Link
            href="/competitors/add"
            className="bg-white rounded-xl border border-border p-6 hover:border-primary/50 hover:shadow-lg transition-all group"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-secondary group-hover:text-primary transition-colors">
              Track Competitor
            </h3>
            <p className="text-sm text-muted mt-1">
              Monitor competitor activity and contract wins
            </p>
          </Link>

          <Link
            href="/account/searches"
            className="bg-white rounded-xl border border-border p-6 hover:border-primary/50 hover:shadow-lg transition-all group"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="font-semibold text-secondary group-hover:text-primary transition-colors">
              Manage Alerts
            </h3>
            <p className="text-sm text-muted mt-1">
              Configure notifications for new opportunities
            </p>
          </Link>
        </div>
    </>
  );
}
