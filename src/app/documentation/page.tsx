import { redirect } from "next/navigation";

// The old Documentation placeholder has been replaced by the Help Center at
// /help. Redirect so any existing inbound links keep working.
export default function DocumentationPage() {
  redirect("/help");
}
