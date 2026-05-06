"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/layout/Header";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";

const MESSAGE_MAX = 5000;

export default function ContactPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot — bots blindly fill every field; real users never see it.
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from the signed-in user when available. Fields stay editable.
  useEffect(() => {
    if (!user) return;
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    if (fullName && !name) setName(fullName);
    if (user.email && !email) setEmail(user.email);
    // We deliberately depend only on user — re-running when name/email change
    // would clobber the visitor's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
      setError("Please fill in every field.");
      return;
    }
    if (trimmedMessage.length > MESSAGE_MAX) {
      setError(`Message is too long (max ${MESSAGE_MAX.toLocaleString()} characters).`);
      return;
    }

    setSubmitting(true);
    try {
      const resp = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          subject: trimmedSubject,
          message: trimmedMessage,
          website,
        }),
      });

      if (resp.ok) {
        router.push("/contact/success");
        return;
      }

      if (resp.status === 429) {
        setError("Too many submissions from this connection. Please try again later.");
      } else if (resp.status === 422) {
        setError("Some of the fields didn't validate. Please review and try again.");
      } else {
        const data = await resp.json().catch(() => ({}));
        setError(data.error || "We couldn't submit your message. Please try again.");
      }
      setSubmitting(false);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Authenticated users see the in-app Header; unauthenticated visitors
          see the marketing Navbar. The Navbar is position:fixed so the main
          element gets pt-28 to clear it; Header is static and doesn't need it. */}
      {user ? <Header showAccountLink={true} /> : <Navbar />}
      <main
        className={`max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8 py-12 ${
          user ? "" : "pt-28"
        }`}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Contact us</h1>
          <p className="text-muted mt-2">
            Questions, feedback, or trouble with your account? Send us a note
            and our team will get back to you. Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
            .
          </p>
        </div>

        <div className="bg-card-bg border border-border rounded-xl p-6">
          <form onSubmit={submit} className="space-y-4" noValidate>
            {error && (
              <div className="p-3 bg-error/5 border border-error/20 text-error rounded text-sm">
                {error}
              </div>
            )}

            {/* Honeypot — hidden from humans (off-screen + aria-hidden +
                tabIndex=-1 + autoComplete=off). Bots that fill every input
                will populate this and trip the backend's max_length=0
                validator. */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-9999px",
                width: "1px",
                height: "1px",
                overflow: "hidden",
              }}
            >
              <label>
                Website
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Your name
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary"
                placeholder="How can we help?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Message
              </label>
              <textarea
                required
                rows={8}
                maxLength={MESSAGE_MAX}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border bg-card-bg rounded focus:ring-2 focus:ring-primary"
                placeholder="Share as much detail as you'd like — the more we know, the faster we can help."
              />
              <div className="text-[11px] text-muted mt-1 text-right">
                {message.length.toLocaleString()} / {MESSAGE_MAX.toLocaleString()}
              </div>
            </div>

            <p className="text-xs text-muted">
              We&rsquo;ll only use your email to reply to this message. We&rsquo;ll never
              share it.
            </p>

            <div className="flex justify-end pt-2">
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send message"}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
