import type { Metadata } from "next";
import { SupportLanding } from "./SupportLanding";

export const metadata: Metadata = {
  title: "Support | Government Procurement Hub",
  description:
    "Get help with Government Procurement Hub — browse the Help Center and FAQ, or contact our support team directly.",
};

export default function SupportPage() {
  return <SupportLanding />;
}
