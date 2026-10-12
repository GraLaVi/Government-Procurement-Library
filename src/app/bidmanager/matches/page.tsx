import { redirect } from "next/navigation";

// The Bid Worklist is /bidmatching for Bid Manager add-on holders. This was
// its own page; kept as a redirect so old links and bookmarks still land.
export default function BidManagerMatchesRedirect() {
  redirect("/bidmatching");
}
