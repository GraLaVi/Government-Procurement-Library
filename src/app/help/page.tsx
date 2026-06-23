import type { Metadata } from "next";
import { HelpLanding } from "./HelpLanding";

export const metadata: Metadata = {
  title: "Help Center | Government Procurement Hub",
  description:
    "Guides and answers for using Government Procurement Hub — bid matching, part searches, vendor research, and account management.",
};

export default function HelpPage() {
  return <HelpLanding />;
}
