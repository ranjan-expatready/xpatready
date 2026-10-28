// S3 Start setup (P-125, P-123, P-110 amended; screens/W1-start-setup/challenge.md, agreed 28 Oct): one action wherever a
// Not started combination shows (the Immigration programs card and List row, the Program structure Edit panel), greyed
// with the one guard's reason as visible text; and, on the workspace's "Sources and forms", the finder's run or the one
// offer to find the forms (live AI only on the click, the worst case shown first). The forms list under it is runtime's.
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { START, type FinderOffer, type StartSetupResult } from "../../../contracts/start-setup";
import { api, useApi, useSessionView, useToast } from "@/lib/api";
import { Button } from "@/components/ui/controls";
import { Tip } from "@/components/status";
import { BlockedLine } from "@/components/lifecycle";

/** Starts the setup of a last-level name and opens it on "Sources and forms". A double click leaves once (QA-50); the
 *  server returns the same combination for a second call. */
export function useStartSetup() {
  const nav = useNavigate(); const qc = useQueryClient(); const toast = useToast();
  const going = React.useRef(false);
  return async (nodeKey: string) => {
    if (going.current) return;
    going.current = true;
    try {
      const r = await api<StartSetupResult>("/combinations/start", { method: "POST", json: { nodeKey } });
      void qc.invalidateQueries();
      nav(`/c/${r.combination.id}/forms`);
    } catch (e) { going.current = false; toast.push({ tone: "danger", text: (e as Error).message }); }
  };
}

/** The Start setup button: its "i" says what it does, with an example (P-125 (3)); greyed, the reason is written under it. */
export function StartSetupButton({ nodeKey, label, why, className, size = "sm", variant = "default", step }: { nodeKey: string; label: string; why?: string | null; className?: string; size?: "sm" | "default"; variant?: "default" | "outline"; step?: boolean }) {
  const start = useStartSetup();
  const id = React.useId();
  return (
    <span className={className}>
      <Tip tip={START.tip(label)}>
        <span><Button size={size} variant={variant} aria-disabled={why ? true : undefined} aria-describedby={why ? id : undefined} aria-label={`${START.label}: ${label}`} data-start-setup data-next-step={step ? "start" : undefined}
          className={why ? "cursor-not-allowed opacity-60" : undefined} onClick={(e) => { e.stopPropagation(); if (!why) void start(nodeKey); }}>{START.label}</Button></span>
      </Tip>
      {why ? <BlockedLine id={id} text={why} className="mt-1" /> : null}
    </span>
  );
}

/** S3 item 5: in S5's Forms tab slot while no find exists ("No form find yet"): the one way to find the forms, live AI
 *  only on this click (founder, 28 Oct), its cost in the one wording. The run then shows on the Forms tab's own card. */
export function FindFormsStart({ combinationId }: { combinationId: string }) {
  const qc = useQueryClient(); const toast = useToast(); const { canAuthor } = useSessionView();
  const q = useApi<FinderOffer>(["start-setup", combinationId], `/combinations/${combinationId}/start-setup`);
  const [busy, setBusy] = React.useState(false);
  const o = q.data;
  if (!o?.offer || o.run || !canAuthor) return null;
  const offer = o.offer;
  const find = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const v = await api<{ id: string }>(`/combinations/${combinationId}/forms/find`, { method: "POST", json: { mode: offer.mode, planSha256: offer.planSha256, idempotencyKey: crypto.randomUUID() } });
      window.dispatchEvent(new CustomEvent("s5-find-started", { detail: v.id }));
    } catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); }
    finally { setBusy(false); void qc.invalidateQueries(); }
  };
  return (
    <div className="flex flex-col items-end gap-1" data-finder-start>
      <Tip tip={offer.tip}><span><Button size="sm" busy={busy} onClick={() => void find()} data-find-forms={offer.mode}>{offer.mode === "live" ? <Sparkles className="size-3.5" aria-hidden /> : null}{offer.label}</Button></span></Tip>
      {offer.why ? <p className="max-w-80 text-right text-xs text-text-muted" data-offer-why>{offer.why}</p> : null}
    </div>
  );
}
