// C6.12 Fees on the case page (screens lane, M3 sprint row B5, ruling R11; product/screens/B5/concept.md on the fee block
// Lead 12 approved on #1074, concept r2 Part A; P-247, P-171, BR-16, BR-18, G15): at the foot of each submission in
// "Submission to IRCC", every fee on the filing it is paid on, with its basis and the server's reason; the submission's
// totals with the family maximum applied; the case's total when it has more than one submission; the sources once.
// Read-only, from GET /runtime/cases/:id/prepare (the panel's own read): the page prices nothing, writes no amount or fee
// name of its own (P-319) and leaves every word of money to the engine (engine/runtime/filings.ts), except writing the
// server's whole cents as "CAD n" by the engine's own rule. Paying is not built. No model call (US$0).
import * as React from "react";

type Source = { page: string; url: string; read: string };
/** A submission's line total, as engine/runtime/filings.ts familyFee gives it. */
type Total = { line: string; label: string; people: number; family_max_cents: number; total_cents: number; cap_applied: boolean; why: string; source?: Source };
type Group = { id: string; kind: string; label?: string; filings: string[]; totals?: Total[]; total_cents?: number | null };
/** A fee line as GET …/prepare maps it (api/src/case-prepare.ts): `subject` is the person the line is for. */
type FeeLine = { filing: string; subject: string; key: string; line: string; amount_words: string; exempt: boolean; reason: string; waiting?: string; source_detail?: Source | null };
type Applicant = { subject: string; label: string; mode: string };
type Filing = { id: string; label: string; owner?: { subject: string; label: string }; applicants: Applicant[] };
type NotFiling = { subject: string; label: string; why: string };
/** The part of the prepare view the fee block reads; every field the panel does not need is optional. */
export type FeesView = { groups: Group[]; filings: Filing[]; fees?: FeeLine[]; not_filing?: NotFiling[]; fees_worked_out?: boolean; fees_why?: string | null; basis?: string };

/** Whole cents as the engine writes them (engine/runtime/filings.ts `cad`): "CAD 570", cents only when there are any. */
export const cadWords = (cents: number) => `CAD ${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

/** A line's basis by name (P-247), read from the server's own total: only the family maximum basis has a maximum
 *  (familyFee); the other two are named in the server's words. null when it cannot be read: then only the why shows. */
export function basisOf(t: Total | undefined): string | null {
  if (!t) return null;
  if (t.family_max_cents > 0) return "Family maximum";
  if (/\(per application;/.test(t.why)) return "Per application";
  if (/\(per person;/.test(t.why)) return "Per person";
  return null;
}

/** Each distinct source of the submission's lines and exemptions, once (concept BR-7). */
function sourcesOf(totals: Total[], lines: FeeLine[]): Source[] {
  const all = [...totals.map((t) => t.source), ...lines.map((l) => l.source_detail)].filter((s): s is Source => !!s?.url);
  return all.filter((s, i) => all.findIndex((x) => x.url === s.url) === i);
}

/** The fee block of one submission group. `first`: the case's first submission, which also lists the people with no filing. */
export function FeeBlock({ view, group, first }: { view: FeesView; group: Group; first: boolean }) {
  const h = `fees-${group.id}`, name = group.label ?? "this submission";
  if (view.fees_worked_out === false) return (
    <div className="mt-3" data-fees={group.id} data-fees-worked-out="false">
      <h4 id={h} className="text-[13px] font-semibold">Fees</h4>
      <p className="mt-1 text-[13px] text-text-muted [overflow-wrap:anywhere]">{view.fees_why ?? "The fees are not worked out for this case."}</p>
    </div>
  );
  if (!view.fees) return null;
  const filings = group.filings.map((id) => view.filings.find((f) => f.id === id)).filter((f): f is Filing => !!f);
  const totals = group.totals ?? [];
  const lines = view.fees.filter((l) => group.filings.includes(l.filing));
  const sources = sourcesOf(totals, lines);
  const totalOf = (key: string) => totals.find((t) => t.line === key);
  return (
    <div className="mt-3" data-fees={group.id}>
      <h4 id={h} className="text-[13px] font-semibold">Fees</h4>
      <table aria-labelledby={h} className="mt-1 w-full table-fixed border-collapse text-left text-[13px]">
        <caption className="sr-only">Fees for {name}</caption>
        <colgroup><col className="w-[34%]" /><col className="w-[16%]" /><col /></colgroup>
        <thead className="text-xs text-text-muted"><tr>
          <th scope="col" className="border-b border-border py-1.5 pr-3 font-medium">Fee</th>
          <th scope="col" className="border-b border-border py-1.5 pr-3 font-medium">Amount</th>
          <th scope="col" className="border-b border-border py-1.5 font-medium">Why</th>
        </tr></thead>
        {filings.map((f) => {
          const mine = lines.filter((l) => l.filing === f.id), declared = f.applicants.filter((a) => a.mode === "declared_only");
          return (
            <tbody key={f.id} data-fee-filing={f.id}>
              <tr><th scope="rowgroup" colSpan={3} className="pt-2 pb-1 text-[12px] font-semibold text-text [overflow-wrap:anywhere]">{f.label}</th></tr>
              {mine.map((l) => {
                const basis = basisOf(totalOf(l.key)), other = f.owner && l.subject !== f.owner.subject ? f.applicants.find((a) => a.subject === l.subject)?.label : null;
                return (
                  <tr key={`${l.key}-${l.subject}`} data-fee-line={l.key} data-fee-subject={l.subject} data-fee-exempt={l.exempt ? "true" : "false"} data-fee-waiting={l.waiting ?? undefined}>
                    <th scope="row" className="border-b border-border py-1.5 pr-3 align-top font-normal [overflow-wrap:anywhere]">
                      <span className="block">{l.line}{other ? <span className="text-text-muted"> · for {other}</span> : null}</span>
                      {basis ? <span className="block text-xs text-text-muted" data-fee-basis>{basis}</span> : null}
                    </th>
                    <td className="border-b border-border py-1.5 pr-3 align-top whitespace-nowrap" data-fee-amount>{l.waiting ? <span className="text-text-muted">Not counted yet</span> : l.amount_words}</td>
                    <td className="border-b border-border py-1.5 align-top text-text-muted [overflow-wrap:anywhere]">{l.reason}</td>
                  </tr>
                );
              })}
              {declared.map((a) => (
                <tr key={`declared-${a.subject}`} data-fee-declared={a.subject}>
                  <th scope="row" className="border-b border-border py-1.5 pr-3 align-top font-normal [overflow-wrap:anywhere]">{a.label}</th>
                  <td className="border-b border-border py-1.5 pr-3 align-top">—</td>
                  <td className="border-b border-border py-1.5 align-top text-text-muted">Declared only: no fee</td>
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
      {totals.length ? <ul className="mt-2 space-y-0.5 text-[13px]" data-fee-totals>
        {totals.map((t) => <li key={t.line} className="[overflow-wrap:anywhere]" data-fee-total-line={t.line}><span className="font-medium">{t.label}: {cadWords(t.total_cents)}</span> <span className="text-text-muted">· {t.why}</span></li>)}
      </ul> : null}
      {group.total_cents != null ? <p className="mt-1 text-sm font-semibold" data-fee-total>Total for this submission: {cadWords(group.total_cents)}</p> : null}
      {first && view.not_filing?.length ? <ul className="mt-2 space-y-0.5 text-[13px]" data-fee-not-filing>
        {view.not_filing.map((n) => <li key={n.subject} className="[overflow-wrap:anywhere]" data-fee-no-filing={n.subject}><span className="font-medium">{n.label}: no fee.</span> <span className="text-text-muted">{n.why}</span></li>)}
      </ul> : null}
      {sources.length ? <p className="mt-2 text-xs text-text-muted [overflow-wrap:anywhere]" data-fee-sources>Sources: {sources.map((s, i) => <React.Fragment key={s.url}>{i ? " · " : ""}<a href={s.url} target="_blank" rel="noreferrer" className="text-text-link hover:underline">{s.page}</a> (read {s.read})</React.Fragment>)}</p> : null}
    </div>
  );
}

/** The panel's foot: the case's total when it has more than one submission (each priced on its own, so a family maximum
 *  covers one submission only), and the basis sentence once ("… Sample until the immigration expert confirms …"). */
export function CaseFees({ view }: { view: FeesView }) {
  if (!view.fees || view.fees_worked_out === false) return null;
  const priced = view.groups.filter((g) => g.total_cents != null);
  const sum = priced.reduce((s, g) => s + (g.total_cents ?? 0), 0);
  return (
    <div className="border-t border-border px-4 py-3" data-case-fees>
      {priced.length > 1 ? <p className="text-sm font-semibold" data-case-fee-total>Total for the case: {cadWords(sum)} <span className="font-normal text-text-muted">· {priced.length} submissions, each priced on its own</span></p> : null}
      {view.basis ? <p className={`${priced.length > 1 ? "mt-1 " : ""}text-xs text-text-muted [overflow-wrap:anywhere]`} data-fee-basis-sentence>{view.basis}</p> : null}
    </div>
  );
}
