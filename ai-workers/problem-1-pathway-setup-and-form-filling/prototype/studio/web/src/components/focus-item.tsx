// W1 setup checklist, slice C1 (concept v4 §7, board §5 "Click lands"): a link with ?focus=<item> lands on that item.
// The element marked data-focus="<item>" is scrolled to (no animation under reduced motion), takes focus and is
// outlined for 2 s (FOCUS_RING on the element); an item whose step is done by now says so (DONE_SINCE).
import * as React from "react";
import { useSearchParams } from "react-router-dom";

/** The 2 s outline, for any element that carries data-focus: a ring (box shadow), since the page's `:focus-visible`
 *  reset removes outlines from a focused element. */
export const FOCUS_RING = "rounded-xl outline-none data-[focused]:ring-2 data-[focused]:ring-primary data-[focused]:ring-offset-2 data-[focused]:ring-offset-surface";
export const DONE_SINCE = "This was done since you opened it.";

/** `done`: the focus keys whose step is done by now; undefined while the checklist loads (nothing lands before it). */
export function useFocusItem(done: string[] | undefined) {
  const [sp, setSp] = useSearchParams();
  const focus = sp.get("focus");
  const [doneSince, setDoneSince] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  React.useEffect(() => {
    if (!focus || !done) return;
    // X1: an element may also answer a step-level key (data-focus-also, space-separated), e.g. a Not ready item's
    // "questions_documents:problems" lands on the tab's problems notice.
    const el = document.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focus)}"], [data-focus-also~="${CSS.escape(focus)}"]`);
    if (!el) return; // not drawn yet: the next render tries again
    setDoneSince(done.includes(focus) ? focus : null);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
    el.setAttribute("data-focused", "");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => el.removeAttribute("data-focused"), 2000);
    // The address keeps no focus once it has landed, so Back and a reload do not jump again.
    setSp((prev) => { const n = new URLSearchParams(prev); n.delete("focus"); return n; }, { replace: true });
  });
  return doneSince;
}
