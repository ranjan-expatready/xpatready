// X1 (W1 setup checklist slice C2, review M1, M2): the problems the setup checklist counts for one part of step 4
// (documents or questions), listed where its "Fix n problems" link lands. The same problems the engine counts
// (engine/setup-checklist.ts WHERE_STEP, from the draft's validator problems), never a recount by other words; "asked of
// nobody" stays the gaps notice. Shown only when there is something to fix.
import { Link } from "react-router-dom";
import { problemWords, type CombinationView } from "../../../contracts/programs";
import { WHERE_STEP } from "../../../engine/setup-checklist";
import { FOCUS_RING } from "@/components/focus-item";
import { Notice } from "@/components/ui/controls";
import { useApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export function PartProblems({ id, part }: { id: string; part: "documents" | "questions" }) {
  const o = useApi<CombinationView>(["combination", id], `/combinations/${id}`);
  const mine = (o.data?.draft.problems ?? []).filter((p) => p.level === "error" && WHERE_STEP[p.where]?.part === part && p.where !== "Questionnaires");
  if (!mine.length) return null;
  const key = part === "documents" ? "documents:problems" : "questionnaires:problems";
  return (
    <div className={cn(FOCUS_RING)} data-focus={key} data-focus-also="questions_documents:problems" data-part-problems={part}>
      <Notice tone="danger" title={`${mine.length} problem${mine.length === 1 ? "" : "s"} to fix in the ${part === "documents" ? "documents" : "questions"}: release waits for ${mine.length === 1 ? "it" : "them"}`}>
        <ul className="mt-1 space-y-0.5">{mine.slice(0, 6).map((p, i) => <li key={i}>{problemWords(p)}</li>)}</ul>
        {mine.length > 6 ? <p className="mt-1">and {mine.length - 6} more.</p> : null}
        <p className="mt-1"><Link className="font-medium text-text-link underline" to={`/c/${id}/review`}>See every problem on Review and release</Link></p>
      </Notice>
    </div>
  );
}
