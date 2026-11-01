// F2 C2.12 (concept §4 "Return strip", challenge m1): a page opened from a form's guided path keeps the way back. The rail's
// links carry ?form=<form number>&c=<combination>; on any Studio page with both, one line says which form is being set up on
// which combination, where it stands (the same path the rail reads: GET /combinations/:id/forms/:code/progress) and
// "Back to the steps", which reopens the rail on that form with focus on its current step. Read only: it takes no step.
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ApiError, useApi } from "@/lib/api";
import { chipOf, type FormProgress } from "../../../contracts/form-progress";
import type { CombinationView } from "../../../contracts/programs";
import { backToSteps, chipWords, progressKey, progressPath } from "@/pages/workspace/setup-rail";

export function ReturnStrip() {
  const [sp] = useSearchParams();
  const loc = useLocation();
  const form = sp.get("form")?.trim() || null, c = sp.get("c")?.trim() || null;
  // The rail itself is open (?setup=): the strip would repeat it.
  const on = !!form && !!c && !sp.get("setup") && form.length <= 40 && c.length <= 64;
  const p = useApi<FormProgress>(progressKey(c ?? "", form ?? ""), progressPath(c ?? "", form ?? ""), { enabled: on, retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 1 });
  const combo = useApi<CombinationView>(["combination", c ?? ""], `/combinations/${c}`, { enabled: on });
  // A stale or foreign address (a form or combination the studio does not know): no strip; the page itself still works.
  if (!on || !p.data) return null;
  const chip = chipOf(p.data);
  const name = combo.data?.combination.label ?? "this combination";
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm" role="region" aria-label={`Setting up ${p.data.form}`} data-return-strip={p.data.form} data-path={loc.pathname}>
      <span><b className="font-semibold">Setting up {p.data.form}</b> on {name} · {chipWords(chip)}{chip.current && chip.count ? ` · ${chip.count} open` : ""}</span>
      <span className="flex-1" />
      <Link className="rounded font-semibold text-text-link underline outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" to={backToSteps(p.data.form, c!)} data-back-to-steps>Back to the steps</Link>
    </div>
  );
}
