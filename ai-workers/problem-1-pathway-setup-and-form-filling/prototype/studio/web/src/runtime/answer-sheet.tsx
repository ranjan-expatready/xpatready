// C7.3 The answer sheet of an Online form, for the case officer (QA-317: its page and the way to it; concept
// product/screens/C7.3/concept.md r2). The officer types an Online form into the IRCC account section by section, copying
// each answer. Sections follow the form's own parts as the case's release names them (the server's `order_note`, until
// the live portal's own screen order is recorded: W6, parked with the extension, P-102). Every declared or confirmed
// answer shows with its person, its source and whether it is still to confirm (P-411); what a section waits for is the
// form's own readiness (QA-309). Copy gives exactly the server's `copy_text` (dates YYYY-MM-DD, Yes or No, an address on
// one line), and each part of an address or a phone on its own. The item's state and reason are the server's (Prepare
// view). A client never reads this page (403 from the server, kept).
// "Entered in the portal" per section (P-401, QA-323): the officer ticks what they typed (who and when, the audit line);
// taking a tick off asks for a reason; an answer that changes after a tick clears it (the section reads out of date and
// lists each answer then and now) until it is ticked again. Every rule is the server's (version checked, 409 → Reload).
import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, Lock } from "lucide-react";
import { api, ApiError, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Field, Notice, Pill, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { noRetryOnRefusal } from "./questionnaire";
import { useFirm } from "./team";

type SheetAnswer = { label: string; fact: string; subject: string; person: string; row: number | null; value: unknown; copy_text: string; source: string; mark: string | null; to_confirm: boolean; why: string | null };
type SheetSection = { key: string; title: string; named?: false; version: string; entered: { at: string; by: string } | null; out_of_date: boolean; answers: SheetAnswer[]; waiting: { fact: string; subject: string; person: string; label: string }[];
  changes?: { label: string; person: string; was: string | null; now: string | null }[]; unticked?: { at: string; by: string; reason: string } | null };
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
  // QA-323: the count the item's own reason gives (engine/runtime/answer-sheet.ts sheetWords): a section not ticked, or
  // ticked before an answer changed, is still to tick.
  const toTick = s.sections.filter((x) => !x.entered || x.out_of_date).length, n = s.sections.length;
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
        <p className="text-[13px]" data-progress data-to-tick={toTick}>{toTick ? `${toTick} of ${n} section${n === 1 ? "" : "s"} still to tick “Entered in the portal”` : `Every section is ticked “Entered in the portal”`}</p>
        <p className="text-[13px] text-text-muted" data-order-note>{s.order_note}</p>
        {readOnly ? <Notice title="Submitted to IRCC">This filing is recorded as submitted: its sheet is read only.</Notice> : null}
      </header>
      {!s.sections.length ? <Notice title="Nothing to enter yet">This form has no section for this person on the case’s release yet.</Notice> : null}
      <ol className="space-y-4">
        {s.sections.map((x, i) => <SectionCard key={x.key} n={i + 1} x={x} nameOf={nameOf} item={s.item} caseId={id!} readOnly={readOnly} />)}
      </ol>
    </div>
  );
}

function SectionCard({ n, x, nameOf, item, caseId, readOnly }: { n: number; x: SheetSection; nameOf: (u: string) => string; item: string; caseId: string; readOnly: boolean }) {
  const hid = `sec-${x.key}`;
  const state = x.out_of_date ? <Pill tone="warn">Tick cleared: answers changed</Pill>
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
      <EnteredTick x={x} nameOf={nameOf} item={item} caseId={caseId} readOnly={readOnly} />
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

/** C7.3 (P-401): the section's "Entered in the portal" tick. Ticking sends the section's version as read (the server
 *  freezes those answers, who and when); taking it off sends the version, the tick read and a reason. A 409 from a sheet
 *  or tick that changed since says so and offers Reload; nothing is changed. A submitted filing shows no control. */
function EnteredTick({ x, nameOf, item, caseId, readOnly }: { x: SheetSection; nameOf: (u: string) => string; item: string; caseId: string; readOnly: boolean }) {
  const qc = useQueryClient(), toast = useToast();
  const [asking, setAsking] = React.useState(false), [reason, setReason] = React.useState(""), [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<{ text: string; stale: boolean; field?: string | null } | null>(null);
  const tickRef = React.useRef<HTMLButtonElement>(null), offRef = React.useRef<HTMLButtonElement>(null), reasonRef = React.useRef<HTMLTextAreaElement>(null);
  const focusNext = React.useRef<"tick" | "off" | null>(null);
  const current = !!x.entered && !x.out_of_date;
  React.useEffect(() => { if (asking) reasonRef.current?.focus(); }, [asking]);
  // After a tick or an untick the focus stays on this section's control (keyboard users keep their place).
  React.useEffect(() => { const f = focusNext.current; if (!f) return; focusNext.current = null; (f === "off" ? offRef : tickRef).current?.focus(); }, [current]);
  const reload = async () => { setError(null); await qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] }); };
  async function send(path: "entered" | "unentered", json: object, ok: string, next: "tick" | "off") {
    setBusy(true); setError(null);
    try {
      await api(`/runtime/items/${item}/screens/${encodeURIComponent(x.key)}/${path}`, { method: "POST", json });
      focusNext.current = next; setAsking(false); setReason("");
      toast.push({ tone: "ok", text: ok });
      await qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
    } catch (e) {
      const a = e instanceof ApiError ? e : null;
      setError({ text: (e as Error).message, stale: a?.status === 409 && /changed since|ticked again since|not ticked/.test((e as Error).message), field: a?.field("reason") });
    } finally { setBusy(false); }
  }
  if (readOnly) return null;
  const tick = () => void send("entered", { version: x.version }, `“${x.title}” ticked as entered in the portal.`, "off");
  const takeOff = () => {
    if (!reason.trim()) { setError({ text: "Say why the tick comes off.", stale: false, field: "Say why the tick comes off." }); reasonRef.current?.focus(); return; }
    void send("unentered", { version: x.version, entered_at: x.entered?.at, reason }, `The tick came off “${x.title}”: it counts as still to tick.`, "tick");
  };
  return (
    <div className="space-y-2 border-t border-border px-4 py-3 text-[13px]" data-tick={current ? "entered" : x.out_of_date ? "cleared" : "not-entered"}>
      {x.out_of_date && x.entered ? (
        <div data-changes role="note" aria-label={`Why the tick on ${x.title} was cleared`}>
          <p>Ticked by {nameOf(x.entered.by)}, {when(x.entered.at)}; {x.changes?.length ? `${x.changes.length === 1 ? "this answer" : "these answers"} changed since, so the tick no longer counts:` : "an answer here changed since, so the tick no longer counts."}</p>
          {x.changes?.length ? <ul className="mt-1 list-disc space-y-0.5 pl-5">{x.changes.map((c, i) => <li key={i} data-change>{c.label} · {c.person}: {c.now === null ? <>no longer on the sheet (was <span className="mono">{c.was}</span>)</> : c.was === null ? <>new: <span className="mono">{c.now}</span></> : <>was <span className="mono">{c.was}</span>, now <span className="mono">{c.now}</span></>}</li>)}</ul> : null}
          <p className="mt-1">Enter the new answers in the portal, then tick again.</p>
        </div>
      ) : null}
      {!x.entered && x.unticked ? <p className="text-text-muted" data-unticked>Tick taken off by {nameOf(x.unticked.by)}, {when(x.unticked.at)}. Reason: {x.unticked.reason}</p> : null}
      {error && !(error.field && asking) ? (
        <Notice tone={error.stale ? "warn" : "danger"} title={error.stale ? "Changed since you opened the sheet" : "Not saved"} action={error.stale ? <Button size="sm" variant="secondary" onClick={() => void reload()}>Reload</Button> : undefined}>
          {error.text}
        </Notice>
      ) : null}
      {asking ? (
        <form className="space-y-2" aria-label={`Take the tick off ${x.title}`} onSubmit={(e) => { e.preventDefault(); takeOff(); }} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setAsking(false); setError(null); offRef.current?.focus(); } }}>
          <Field label="Why does the tick come off? (required)" hint="Kept in the case's activity with your name and the time." error={error?.field ?? null}>
            <Textarea ref={reasonRef} rows={2} maxLength={400} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" busy={busy}>Take the tick off</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => { setAsking(false); setError(null); offRef.current?.focus(); }}>Keep the tick</Button>
          </div>
        </form>
      ) : current ? (
        <Button ref={offRef} size="sm" variant="secondary" aria-label={`Take the tick off ${x.title}`} onClick={() => { setAsking(true); setError(null); }}>Take the tick off</Button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button ref={tickRef} size="sm" busy={busy} aria-label={`Entered in the portal: ${x.title}`} onClick={tick}><Check className="size-3.5" aria-hidden />{x.out_of_date ? "Entered again in the portal" : "Entered in the portal"}</Button>
          {x.waiting.length ? <span className="text-text-muted" data-tick-hint>{x.waiting.length} answer{x.waiting.length === 1 ? "" : "s"} still to answer or confirm: tick what you typed; when they are confirmed this section reads out of date until you tick again.</span> : null}
        </div>
      )}
    </div>
  );
}
