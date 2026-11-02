// G2 (C5.5; concept screens/G2-answer-key-gate/concept.md v2 §4, BR-9): Review and release shows what a release rests
// on: each form map and the eligibility rules, the keys that test them, who signed, the last run. The server decides
// (engine/answer-key-gate.ts); this block only shows its verdicts. "Fix on Tests" opens the item on the Tests tab.
import { Link } from "react-router-dom";
import { fmtWhen } from "@/components/status";
import { Pill, Table } from "@/components/ui/controls";
import { testAnchor } from "@/components/answer-keys";

type GateKey = { key_id: string; family: string; state: string; signed_by: string | null; signed_at: string | null; run: { state: string; passed: number; failed: number }; changed_since_release: { reason: string | null } | null };
type GateItem = { item_kind: string; item_ref: string; label: string; edition: string | null; gated: boolean; result: string; keys: GateKey[] };
export type AnswerKeyView = { demo: boolean; judged: boolean; items: GateItem[] };

const RESULT: Record<string, { text: string; tone: string }> = {
  passed: { text: "Passed", tone: "ok" }, failed: { text: "Failed", tone: "danger" }, not_run: { text: "Not run on this draft", tone: "warn" },
  unsigned: { text: "Sample: not signed", tone: "warn" }, no_test: { text: "No test", tone: "danger" }, cannot_test: { text: "Cannot be tested", tone: "danger" },
  untested_released: { text: "Released before the gate", tone: "neutral" },
};
/** On a Demo release, Sample results are allowed (warnings): shown in the warn tone, never as a refusal. */
const toneOf = (r: string, demo: boolean) => (demo && (r === "no_test" || r === "unsigned" || r === "cannot_test") ? "warn" : RESULT[r]?.tone ?? "neutral");
const runWords = (k: GateKey) => (k.run.state === "PASSED" ? `Passed, ${k.run.passed} of ${k.run.passed} values` : k.run.state === "FAILED" ? `Failed, ${k.run.failed} of ${k.run.passed + k.run.failed} values` : "Not run on this draft");

export const fixOnTests = (combinationId: string, kind: string, ref: string) => `/c/${combinationId}/tests#${testAnchor(kind, ref)}`;

export function AnswerKeyBlock({ combinationId, v }: { combinationId: string; v: AnswerKeyView | undefined }) {
  if (!v?.judged) return null;
  return (
    <section aria-labelledby="answer-key-tests" className="rounded-xl border border-border bg-surface-raised p-4" data-answer-key-block>
      <h3 id="answer-key-tests" className="font-medium">Answer-key tests</h3>
      <p className="mt-1 text-xs text-text-muted">
        {v.demo ? "Demo release: tests not signed by the immigration expert are allowed; failing tests are not." : "A real release needs every new or changed form map and rule set to pass a test the immigration expert signed."} The tests run again at Submit and at release.
      </p>
      {!v.items.length ? <p className="mt-2 text-sm text-text-muted">Nothing here is tested by an answer key.</p> : (
        <div className="mt-2 overflow-x-auto">
          <Table dense head={["Item", "Family", "Expert", "Last run", "Result", ""]}>
            {v.items.flatMap((it) => (it.keys.length ? it.keys : [null]).map((k, i) => (
              <tr key={`${it.item_kind}|${it.item_ref}|${it.edition ?? ""}|${k?.key_id ?? "none"}`} data-gate-item={`${it.item_kind}|${it.item_ref}`}>
                <td className="text-xs">{i === 0 ? <>{it.label}{it.edition ? <span className="text-text-muted"> · {it.edition}</span> : null}</> : null}</td>
                <td className="text-xs">{k ? k.family : "—"}</td>
                <td className="text-xs">{k ? (k.state === "SIGNED" ? <>Signed by {k.signed_by}{k.signed_at ? `, ${fmtWhen(k.signed_at)}` : ""}</> : "Not signed (Sample)") : "—"}
                  {k?.changed_since_release ? <p className="text-text-muted" data-changed-since>Expected values changed since the last release{k.changed_since_release.reason ? `: ${k.changed_since_release.reason}` : ""}</p> : null}</td>
                <td className="text-xs">{k ? runWords(k) : "—"}</td>
                <td>{i === 0 ? <Pill tone={toneOf(it.result, v.demo)}>{RESULT[it.result]?.text ?? it.result}</Pill> : null}</td>
                <td className="text-xs">{i === 0 && it.result !== "passed" && it.result !== "untested_released" ? <Link className="text-text-link hover:underline" to={fixOnTests(combinationId, it.item_kind, it.item_ref)} aria-label={`Fix on Tests: ${it.label}`}>Fix on Tests</Link> : null}</td>
              </tr>
            )))}
          </Table>
        </div>
      )}
    </section>
  );
}
