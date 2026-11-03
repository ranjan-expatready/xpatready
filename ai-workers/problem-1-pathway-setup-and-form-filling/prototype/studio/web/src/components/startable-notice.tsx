// UX-A part 3 (Devin on #622): where a startable-check item lands (a released combination that firms cannot open cases on,
// with no validator error), the cause in its own words and what to do: fix it in this draft, then release. Never "this
// draft no longer has it": the draft usually still has the gap (no questions yet, a form not set up).
import { Link } from "react-router-dom";
import type { CombinationSummary } from "../../../contracts/programs";
import { Notice } from "@/components/ui/controls";

type Item = NonNullable<CombinationSummary["setup"]>["steps"][number]["open"][number];

export function StartableNotice({ id, items }: { id: string; items: Item[] }) {
  if (!items.length) return null;
  return (
    <Notice tone="danger" title={`Firms cannot open cases on the released version: ${items.length === 1 ? "1 thing" : `${items.length} things`} to fix`}>
      <ul className="mt-1 space-y-0.5" data-startable-causes>{items.map((i, k) => <li key={k}>{i.text.split(": firms cannot open cases")[0]}</li>)}</ul>
      <p className="mt-1">Fix {items.length === 1 ? "it" : "them"} in this draft, then send the draft for review and release it. <Link className="font-medium text-text-link underline" to={`/c/${id}/review`}>Review and release</Link></p>
    </Notice>
  );
}
