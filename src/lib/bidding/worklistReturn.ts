// "Return to your place" between the Bid Worklist (/bidmatching) and the bid
// editor. The Worklist's date, page, sort and filters live in its URL; this
// adds what a URL cannot hold — the scroll position and the row the bidder
// left from — and a one-time note for the Worklist to show on return.
//
// The editor only goes back to the Worklist when it was opened from it
// (?from=worklist), so a stale entry here can never hijack a bid opened from
// the Bid Pipeline later in the session.

const RETURN_KEY = "bidworklist.return";
const FLASH_KEY = "bidworklist.flash";

/** Query string the Worklist adds to an editor link. */
export const FROM_WORKLIST = "from=worklist";

export interface WorklistReturn {
  href: string;
  scrollY: number;
  solicitationId: number;
}

/** Called as the bidder leaves the Worklist for a bid. */
export function saveWorklistReturn(solicitationId: number): void {
  try {
    const entry: WorklistReturn = {
      href: window.location.pathname + window.location.search,
      scrollY: window.scrollY,
      solicitationId,
    };
    sessionStorage.setItem(RETURN_KEY, JSON.stringify(entry));
  } catch {
    // Storage blocked: the URL still brings back the date, page and filters.
  }
}

export function readWorklistReturn(): WorklistReturn | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    return raw ? (JSON.parse(raw) as WorklistReturn) : null;
  } catch {
    return null;
  }
}

export function clearWorklistReturn(): void {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch { /* ignore */ }
}

/** Whether the editor was opened from the Worklist. */
export function openedFromWorklist(): boolean {
  return new URLSearchParams(window.location.search).get("from") === "worklist";
}

export function setWorklistFlash(message: string): void {
  try {
    sessionStorage.setItem(FLASH_KEY, message);
  } catch { /* ignore */ }
}

/** Read once and cleared, so a reload does not repeat it. */
export function takeWorklistFlash(): string | null {
  try {
    const msg = sessionStorage.getItem(FLASH_KEY);
    if (msg) sessionStorage.removeItem(FLASH_KEY);
    return msg;
  } catch {
    return null;
  }
}
