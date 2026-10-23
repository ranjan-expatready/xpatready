// One next step per combination (BR-13, P-07; review #1): the server's `nextAction` is the only source. The Programs
// row and the combination page both show it and both run it through this one handler, so they can never disagree and
// the browser works nothing out itself.
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import type { CatalogueLeaf, NextAction } from "../../../contracts/programs";
import { api, useToast } from "@/lib/api";
import { AiLaunchDialog } from "@/components/ai-launch";
import { Tip } from "@/components/status";

/** Steps any role may follow (they only show something); the others are a configuration author's. */
export const SHOW_ONLY_STEPS: NextAction["kind"][] = ["view_progress", "see_missing", "see_new_edition", "release"];

/** Where AI acts (founder finding F3): these steps carry the AI mark and say what AI does. */
export const AI_STEPS: NextAction["kind"][] = ["draft_ai", "view_progress", "review_proposals"];
export function stepTip(a: NextAction): string | null {
  if (a.kind === "draft_ai") return "AI reads the attached forms and proposes their field maps, questions and fields. Nothing changes until a person accepts each proposal.";
  if (a.kind === "view_progress") return "AI is drafting now. Nothing changes until a person accepts its proposals.";
  if (a.kind === "review_proposals") return "AI proposed these. A person accepts, changes or rejects each one; nothing changes until then.";
  if (a.kind === "add_from_library") return `${(a.forms ?? []).join(", ")}: reuses field maps already in the library. No AI. Adds to the draft only; nothing changes for firms until release.`;
  return null;
}
/** A next step's words, with the team's AI mark when AI acts. */
export function StepLabel({ a }: { a: NextAction }) {
  return <>{AI_STEPS.includes(a.kind) ? <Sparkles className="size-3.5 shrink-0 text-[#6d28d9] dark:text-[#c4b5fd]" aria-label="AI step:" /> : null}{a.label}</>;
}
/** Wraps the step's button in its tooltip (keyboard: the button is the focusable trigger). */
export function StepTip({ a, children }: { a: NextAction | null; children: React.ReactElement }) {
  const tip = a && stepTip(a);
  return tip ? <Tip tip={tip}>{children}</Tip> : children;
}

/** `go(leaf, suffix)` opens the combination page with a tab or `?show=` (the list starts a not-started row there);
 *  `leaving(leaf)` runs before a step leaves for another page (the list remembers itself for Back). */
export function useNextStep(go: (leaf: CatalogueLeaf, suffix?: string) => unknown, leaving: (leaf: CatalogueLeaf) => void = () => {}) {
  const nav = useNavigate(); const qc = useQueryClient(); const toast = useToast();
  const [aiFor, setAiFor] = React.useState<CatalogueLeaf | null>(null);
  const run = async (leaf: CatalogueLeaf, a: NextAction | null) => {
    if (!a) return go(leaf);
    if (a.kind === "start" || a.kind === "add_forms") return go(leaf, "/sources");
    if (a.kind === "draft_ai") return setAiFor(leaf);
    if (a.kind === "view_progress") { leaving(leaf); return nav(`/ai/${a.batchId}`); }
    if (a.kind === "review_proposals") { leaving(leaf); return nav(`/c/${leaf.combinationId}/jobs/${a.jobId}`); }
    if (a.kind === "release") { leaving(leaf); return nav("/release"); }
    if (a.kind === "see_missing") return go(leaf, "?show=missing");
    if (a.kind === "see_new_edition") return go(leaf, "?show=held");
    if (a.kind === "add_from_library") {
      try {
        for (const code of a.forms ?? []) await api(`/combinations/${leaf.combinationId}/lines`, { method: "POST", json: { kind: "FORM", formKey: code } });
        toast.push({ tone: "ok", text: `${(a.forms ?? []).join(", ")} added to ${leaf.label} from the library` });
        void qc.invalidateQueries();
      } catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); }
    }
  };
  const dialog = aiFor?.combinationId ? <AiLaunchDialog scope={{ kind: "combination", ids: [aiFor.combinationId], label: aiFor.path.join(" › ") }} onClose={() => setAiFor(null)} /> : null;
  return { run, dialog };
}
