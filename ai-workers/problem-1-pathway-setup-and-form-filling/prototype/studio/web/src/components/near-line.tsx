// C11.13 (P-120: "a near duplicate needs a one-line reason, shown to the second person at release"): one line under a
// library change that came from a proposal close to an existing item: what it is close to (the library's name and key)
// and why it is not the same. Read by the second person's decision page and the Release page.
import * as React from "react";

export type NearView = { items: { key: string | null; name: string }[]; reason: string; given: boolean; by: "person" | "ai" };
type WithNear = { reason: string | null; near?: NearView | null };

/** The decider's own words, without the near text the lander appended to them ("… Close to X: why", it has its own
 *  line); found by its start, so a reason cut at 1000 characters is split too (review c1113 m2). */
export const ownReason = (l: WithNear) => {
  if (!l.near || !l.reason) return l.reason;
  const at = l.reason.startsWith("Close to ") ? 0 : l.reason.lastIndexOf(" Close to ");
  return at < 0 ? l.reason : l.reason.slice(0, at).trim() || null;
};

export function NearLine({ near }: { near?: NearView | null }) {
  if (!near) return null;
  return (
    <p data-near className="mt-1 text-xs">
      <span className="font-medium">Close to the library's {near.items.map((n, i) => <React.Fragment key={`${n.key ?? n.name}-${i}`}>{i ? ", " : ""}"{n.name}"{n.key && n.key !== n.name ? <span className="mono text-text-muted"> ({n.key})</span> : null}</React.Fragment>)}.</span>{" "}
      {near.given ? <span data-near-reason>{near.by === "ai" ? "Why it is not the same, in the AI's words (no person has said it yet):" : "Why it is not the same:"} {near.reason}</span>
        : <span data-near-unexplained className="text-text-warn">Found close by the rules ({near.reason}); no one said why it is not the same: ask before approving, or return it.</span>}
    </p>
  );
}
