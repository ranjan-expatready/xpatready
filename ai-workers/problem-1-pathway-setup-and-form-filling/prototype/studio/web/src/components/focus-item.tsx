// W1 setup checklist, slice C1 (concept v4 §7, board §5 "Click lands"): a link with ?focus=<item> lands on that item.
// The element marked data-focus="<item>" is scrolled to (no animation under reduced motion), takes focus and is
// outlined for 2 s (FOCUS_RING on the element); an item whose step is done by now says so (DONE_SINCE).
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Notice } from "@/components/ui/controls";

/** The 2 s outline, for any element that carries data-focus: a ring (box shadow), since the page's `:focus-visible`
 *  reset removes outlines from a focused element. */
export const FOCUS_RING = "rounded-xl outline-none data-[focused]:ring-2 data-[focused]:ring-primary data-[focused]:ring-offset-2 data-[focused]:ring-offset-surface";
export const DONE_SINCE = "This was done since you opened it.";
/** QA-121: how long a ?focus= place may take to be drawn once the tab's data is in, before it counts as gone. */
export const MISS_AFTER_MS = 1500;

/** `done`: the focus keys whose step is done by now; undefined while the checklist loads (nothing lands before it).
 *  `owns`: the keys this page draws (QA-121 review Major): only these count as gone when not on the page, so a key drawn
 *  elsewhere on the tab, or not drawn anywhere yet (forms:*), never says "done". */
export function useFocusItem(done: string[] | undefined, owns: (key: string) => boolean) {
  const [sp, setSp] = useSearchParams();
  const focus = sp.get("focus");
  const [doneSince, setDoneSince] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const missTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Review m4: the ids are cleared too, so a remount (StrictMode) starts its timers again.
  React.useEffect(() => () => { clearTimeout(timer.current); clearTimeout(missTimer.current); timer.current = undefined; missTimer.current = undefined; }, []);
  React.useEffect(() => {
    if (!focus || !done) return;
    // X1: an element may also answer a step-level key (data-focus-also, space-separated), e.g. a Not ready item's
    // "questions_documents:problems" lands on the tab's problems notice.
    const el = document.querySelector<HTMLElement>(`[data-focus="${CSS.escape(focus)}"], [data-focus-also~="${CSS.escape(focus)}"]`);
    if (!el) {
      // Not drawn yet: the next render tries again. QA-121: a place still not on the page after a short wait (done since
      // the link was made, or a key nothing answers) says so, on the tab, and the key leaves the address.
      if (owns(focus) && !missTimer.current) missTimer.current = setTimeout(() => {
        missTimer.current = undefined;
        if (document.querySelector(`[data-focus="${CSS.escape(focus)}"], [data-focus-also~="${CSS.escape(focus)}"]`)) return;
        setDoneSince(focus);
        setSp((prev) => { const n = new URLSearchParams(prev); n.delete("focus"); return n; }, { replace: true });
      }, MISS_AFTER_MS);
      return;
    }
    clearTimeout(missTimer.current); missTimer.current = undefined;
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

/** QA-121: what a tab says when a ?focus= link's place is no longer on it (the words of Before forms, concept v4 §7). */
export function DoneSinceNotice({ shown }: { shown: string | null }) {
  return shown ? <div role="status" data-done-since={shown}><Notice tone="info" title={DONE_SINCE}>Nothing waits there now: the setup steps on Overview show what is next.</Notice></div> : null;
}
