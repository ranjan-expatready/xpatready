// C7.3 The answer sheet of an Online form, for the case officer (QA-317: its page and the way to it; concept
// product/screens/C7.3/concept.md r2). The officer types an Online form into the IRCC account section by section, copying
// each answer. Sections follow the form's own parts as the case's release names them (the server's `order_note`, until
// the live portal's own screen order is recorded: W6, parked with the extension, P-102). Every declared or confirmed
// answer shows with its person, its source and whether it is still to confirm (P-411); what a section waits for is the
// form's own readiness (QA-309). Copy gives exactly the server's `copy_text` (dates YYYY-MM-DD, Yes or No, an address on
// one line), and each part of an address or a phone on its own. The item's state and reason are the server's (Prepare
// view). A client never reads this page (403 from the server, kept). "Entered in the portal" per section is row B4.
import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Lock } from "lucide-react";
import { ApiError, useActorId, useApi } from "@/lib/api";
import { Button, Notice, Pill } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { noRetryOnRefusal } from "./questionnaire";
import { useFirm } from "./team";

type SheetAnswer = { label: string; fact: string; subject: string; person: string; row: number | null; value: unknown; copy_text: string; source: string; mark: string | null; to_confirm: boolean; why: string | null };
type SheetSection = { key: string; title: string; named?: false; version: string; entered: { at: string; by: string } | null; out_of_date: boolean; answers: SheetAnswer[]; waiting: { fact: string; subject: string; person: string; label: string }[] };
export type Sheet = { item: string; form: string; subject: string; order_basis: string; order_note: string; sections: SheetSection[] };
type PrepItem = { id: string; kind: string; form?: string; channel?: string; subject: string; person: string; filing: string; state: string; reason?: string };
type Prep = { reference?: string; portal_words?: string | null; derived: boolean; items: PrepItem[]; filings: { id: string; read_only?: boolean }[] };

const STAFF = new Set(["user-O", "user-R", "user-T", "user-S"]);
/** An item's state in words and its pill's tone (the case page's Online line uses the words too). */
export const STATE_WORDS: Record<string, [string, string]> = { done: ["Done", "ok"], to_do: ["To do", "neutral"], out_of_date: ["Out of date", "warn"], cannot_start: ["Cannot start yet", "neutral"] };
const when = (at: string) => new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
/** An answer part in words, as engine/field-format.ts PART_WORD says them (P-63: never "box"); that module reads files on
 *  the server, so the browser keeps its words here. */
const PART_WORD: Record<string, string> = { po_box: "post office number", apt_unit: "apartment or unit", street_number: "street number", street_name: "street name", postal_code: "postal code", number: "number", country_code: "country code", extension: "extension" };
const partWords = (part: string) => PART_WORD[part] ?? part.replace(/_/g, " ");
/** The parts of an address or a phone, in the order the one-line copy joins them (engine/runtime/answer-sheet.ts copyText). */
const PARTS = ["apt_unit", "street_number", "street_name", "po_box", "city", "district", "province", "postal_code", "country"];
const PHONE = ["country_code", "number", "extension"];
export function partsOf(v: unknown): { part: string; text: string }[] {
  if (!v || typeof v !== "object" || Array.isArray(v)) return [];
  const o = v as Record<string, unknown>, order = "number" in o && "country_code" in o ? PHONE : PARTS;
  return order.filter((k) => o[k] !== undefined && o[k] !== null && o[k] !== "").map((k) => ({ part: k, text: String(o[k]) }));
}

/** The link to an Online form item's answer sheet (QA-317), for the case page's rows. */
export const sheetPath = (caseId: string, itemId: string) => `/cases/${caseId}/sheet/${itemId}`;

export function AnswerSheetPage() {
  const { id, itemId } = useParams();
  const actor = useActorId();
  const officer = STAFF.has(actor);
  // Break F4: the officer comes back from the portal's tab to this one; a form moved off Online meanwhile shows at once.
  const sheet = useApi<Sheet>(["runtime", "view", id!, "sheet", itemId!, actor], officer ? `/runtime/items/${itemId}/answer-sheet` : null, { retry: noRetryOnRefusal, refetchOnWindowFocus: true });
  const prep = useApi<Prep>(["runtime", "view", id!, "prepare", actor], officer ? `/runtime/cases/${id}/prepare` : null, { retry: noRetryOnRefusal, refetchOnWindowFocus: true });
  const firm = useFirm();
  const nameOf = (u: string) => firm.data?.users.find((x) => x.id === u)?.name ?? "the case team";
  const back = <Link to={`/cases/${id}`} className="text-text-link underline">Back to the case</Link>;
  if (!officer) return <Notice title="This page is for the case officer">The answer sheet is what the firm types into the IRCC account; a client never sees it. {back}</Notice>;
  if (sheet.isLoading) return <div className="mx-auto max-w-6xl space-y-3" aria-busy="true"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-40 w-full" /></div>;
  if (sheet.isError) {
    const e = sheet.error as Error, status = e instanceof ApiError ? e.status : 0;
    return (
      <div className="mx-auto max-w-6xl" data-sheet-error={status}>
        <Notice tone={status === 409 || status === 422 ? "warn" : "danger"} title={status === 404 ? "No such answer sheet" : status === 409 ? "This form has no answer sheet" : "The answer sheet could not be opened"}>
          {e.message} {status === 409 && / is filed as /.test(e.message) ? <>To type it into the IRCC account, change how it is filed under “How each form is filed” on the case. </> : null}{back}
        </Notice>
      </div>
    );
  }
  const s = sheet.data!;
  const item = prep.data?.items.find((i) => i.id === s.item);
  // Review m2, break F1: the sheet is read by item; it shows only among the forms of the case in the path (another case's,
  // a case that cannot be read, a form that no longer applies: nothing of it is shown).
  const refused = prep.isError && prep.error instanceof ApiError && prep.error.status < 500;
  if ((prep.data && !item) || refused) return <div className="mx-auto max-w-6xl" data-sheet-error="other-case"><Notice tone="warn" title="This answer sheet is not among this case’s forms">{refused ? `${(prep.error as Error).message} ` : null}Open a form’s answer sheet from its own case’s Prepare application. {back}</Notice></div>;
  const readOnly = !!item && !!prep.data?.filings.find((f) => f.id === item.filing)?.read_only;
  const entered = s.sections.filter((x) => x.entered && !x.out_of_date && !x.waiting.length).length;
  const [stateWord, tone] = STATE_WORDS[item?.state ?? ""] ?? [item?.state ?? "", "neutral"];
  return (
    <div className="mx-auto max-w-6xl space-y-4" data-answer-sheet={s.item}>
      <nav aria-label="Path" className="flex flex-wrap items-center gap-1 text-[13px] text-text-muted">
        <Link to="/cases" className="inline-flex items-center gap-1 hover:underline"><ArrowLeft className="size-3.5" aria-hidden />Cases</Link><span aria-hidden>›</span>
        <Link to={`/cases/${id}`} className="hover:underline">{prep.data?.reference ?? "Case"}</Link><span aria-hidden>›</span>
        <span className="text-text">{s.form} answer sheet</span>
      </nav>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold [overflow-wrap:anywhere]">{s.form} answer sheet · {item?.person ?? ""}</h1>
        <p className="text-sm text-text-muted">Type these answers into the IRCC account, section by section. Copy gives each answer as the IRCC account takes it.</p>
        {prep.data?.portal_words ? <p className="flex items-center gap-1.5 text-[13px]" data-portal><Lock className="size-3.5 text-text-muted" aria-hidden />{prep.data.portal_words}</p> : null}
        {item ? <p className="flex flex-wrap items-center gap-2 text-[13px]" data-item-state={item.state}><Pill tone={tone}>{stateWord}</Pill><span className="text-text-muted [overflow-wrap:anywhere]">{item.reason}</span></p>
          : prep.isError ? <Notice tone="warn" title="The form’s state could not be read">{(prep.error as Error).message} The answers below are current; reload to see whether the filing is submitted.</Notice> : null}
        <p className="text-[13px]" data-progress>{entered} of {s.sections.length} section{s.sections.length === 1 ? "" : "s"} complete</p>
        <p className="text-[13px] text-text-muted" data-order-note>{s.order_note}</p>
        {readOnly ? <Notice title="Submitted to IRCC">This filing is recorded as submitted: its sheet is read only.</Notice> : null}
      </header>
      {!s.sections.length ? <Notice title="Nothing to enter yet">This form has no section for this person on the case’s release yet.</Notice> : null}
      <ol className="space-y-4">
        {s.sections.map((x, i) => <SectionCard key={x.key} n={i + 1} x={x} nameOf={nameOf} />)}
      </ol>
    </div>
  );
}

function SectionCard({ n, x, nameOf }: { n: number; x: SheetSection; nameOf: (u: string) => string }) {
  const hid = `sec-${x.key}`;
  const state = x.out_of_date ? <Pill tone="warn">Out of date</Pill>
    : x.entered ? <Pill tone={x.waiting.length ? "warn" : "ok"}>Entered by {nameOf(x.entered.by)}, {when(x.entered.at)}{x.waiting.length ? ` · ${x.waiting.length} still to answer or confirm` : ""}</Pill>
    : <Pill>Not entered</Pill>;
  return (
    <li className="rounded-xl border border-border bg-surface-raised" data-section={x.key} aria-labelledby={hid}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <h2 id={hid} className="text-base font-semibold [overflow-wrap:anywhere]"><span className="text-text-muted">{n}.</span> {x.title}</h2>
        {x.named === false ? <span className="text-[13px] text-text-muted">Not named yet in this release</span> : null}
        <span className="flex-1" />
        <span data-section-state>{state}</span>
      </header>
      {x.answers.length ? (
        <div className="overflow-x-auto">
          {/* At phone width each answer is a stacked block, each cell under its column's name (concept §4). */}
          <table className="w-full border-collapse text-left text-sm max-sm:block" aria-labelledby={hid}>
            <thead className="bg-surface text-xs text-text-muted max-sm:sr-only"><tr>{["Question", "Person", "Answer", "Source", ""].map((h, i) => <th key={i} scope="col" className="border-b border-border px-3 py-2 font-medium">{h || <span className="sr-only">Copy</span>}</th>)}</tr></thead>
            <tbody className="[&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-b-0 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top max-sm:block max-sm:[&_tr]:block max-sm:[&_tr]:border-b max-sm:[&_tr]:border-border max-sm:[&_tr]:py-1 max-sm:[&_td]:block max-sm:[&_td]:border-b-0 max-sm:[&_td]:py-0.5 max-sm:[&_td[data-label]]:before:mr-1 max-sm:[&_td[data-label]]:before:text-text-muted max-sm:[&_td[data-label]]:before:content-[attr(data-label)]">
              {x.answers.map((a) => <AnswerRow key={`${a.subject}|${a.fact}|${a.row ?? ""}`} a={a} />)}
            </tbody>
          </table>
        </div>
      ) : <p className="px-4 py-3 text-[13px] text-text-muted">No answer to type in this section{x.waiting.length ? " yet" : ""}.</p>}
      {x.waiting.length ? (
        <details className="border-t border-border px-4 py-2 text-[13px]" open data-waiting>
          <summary className="cursor-pointer font-medium">Still to answer or confirm ({x.waiting.length})</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-text-muted">{x.waiting.map((w) => <li key={`${w.subject}|${w.fact}`}>{w.label} <span className="whitespace-nowrap">· {w.person}</span></li>)}</ul>
        </details>
      ) : null}
    </li>
  );
}

function AnswerRow({ a }: { a: SheetAnswer }) {
  const parts = partsOf(a.value);
  const who = a.person + (a.row !== null && a.row > 0 ? ` · entry ${a.row + 1}` : "");
  return (
    <tr data-answer={a.fact} data-subject={a.subject}>
      <td className="min-w-48 font-medium sm:font-normal [overflow-wrap:anywhere] max-sm:min-w-0">{a.label}</td>
      <td className="whitespace-nowrap text-text-muted" data-label="Person:">{who}</td>
      <td className="min-w-40 [overflow-wrap:anywhere] max-sm:min-w-0" data-label="Answer:">
        <span className="mono" data-copy-text>{a.copy_text}</span>
        {a.to_confirm ? <span className="ml-2"><Pill tone="warn">To confirm</Pill></span> : null}
        {a.to_confirm && a.why ? <span className="mt-0.5 block text-[12px] text-text-muted" data-why>{a.why}</span> : null}
        {parts.length > 1 ? (
          <ul className="mt-1 space-y-1" aria-label={`Parts of ${a.label}`}>
            {parts.map((p) => <li key={p.part} className="flex items-center gap-2 text-[13px]" data-copy-scope><span className="text-text-muted">{partWords(p.part)}:</span><span className="mono" data-copy-part>{p.text}</span><CopyButton text={p.text} label={`Copy ${partWords(p.part)} of ${a.label} for ${a.person}`} small /></li>)}
          </ul>
        ) : null}
      </td>
      <td className="whitespace-nowrap text-text-muted" data-label="Source:">{a.source}</td>
      <td className="w-px whitespace-nowrap"><CopyButton text={a.copy_text} label={`Copy ${a.label} for ${a.person}`} /></td>
    </tr>
  );
}

/** Copy one value: to the clipboard, "Copied" for 2 s (said politely to a screen reader). Without a clipboard (an old or
 *  locked-down browser) the value is selected on the page instead, for Ctrl+C. */
function CopyButton({ text, label, small }: { text: string; label: string; small?: boolean }) {
  const [done, setDone] = React.useState<"copied" | "selected" | null>(null);
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => { if (!done) return; const t = setTimeout(() => setDone(null), 2000); return () => clearTimeout(t); }, [done]);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setDone("copied"); }
    catch {
      // Review M2: a part's button selects that part alone (its own scope), a row's the one-line answer.
      const part = ref.current?.closest("[data-copy-scope]")?.querySelector("[data-copy-part]");
      const cell = part ?? ref.current?.closest("tr")?.querySelector("[data-copy-text]") ?? null;
      if (cell) { const r = document.createRange(); r.selectNodeContents(cell); const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r); }
      setDone("selected");
    }
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Button ref={ref} size="sm" variant="secondary" className={small ? "h-6 px-1.5" : undefined} aria-label={done === "copied" ? label.replace(/^Copy /, "Copied: ") : label} onClick={() => void copy()} disabled={!text}>
        {done === "copied" ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}{small ? null : done === "copied" ? "Copied" : "Copy"}
      </Button>
      <span aria-live="polite" className="sr-only">{done === "copied" ? `Copied: ${label.replace(/^Copy /, "")}` : done === "selected" ? "Selected: press Ctrl+C (⌘C on a Mac) to copy" : ""}</span>
    </span>
  );
}
