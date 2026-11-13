// Questionnaire renderer (runtime lane, R1c, P-47): one component, two modes, everything drawn from the case's pinned
// release through the runtime API (engine/runtime/case.ts). SQR: the client on a phone, one part per screen (one
// section for one person), "answering for", save and resume. Agent view: the case officer on a desktop, every section
// and person, each fact with its source, confirmation (P-72) and the form fields it fills; edit in a dialog, "Confirm
// section". Types, limits, answer lists and rules are data; validation never blocks saving (plan §5).
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Check, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Dialog, Input, Notice, Pill, Select, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useWhere } from "@/components/frame"; // BK-3
import { historyGaps, type Period } from "../../../../contracts/history";
import { EmployerCaseSource, LINKED_FILE, type EmployerLink } from "./employer";
import { HouseholdReads, ScopeTag } from "./scope-tag"; // C3.16
import { DocumentsButton } from "./documents-drawer"; // C6.5 part 2b
import { caseName, fillsText, groupLabel, inSentence, type QuestionnaireView, type ViewAnswer, type ViewCheck, type ViewQuestion, type ViewSection } from "../../../contracts/runtime";
import type { ProgressOnly } from "../../../contracts/person-link";
import { PrincipalPersonLine, PrivateProgress, usePeoplePrivacy } from "./privacy"; // C6.16
import { HandOff, handName, handedFrom } from "./hand-off"; // BK-4c
import { isFirmStaff } from "@/lib/simulated-people"; // BK-4c

/** role: any role the case's release lists (B115: the sponsor too); role_label is that role in the release's own words. */
export type CasePerson = { subject_id: string; role: string; role_label?: string | null; label: string; applies: boolean; co_files?: boolean;
  /** C6.13 BR-3b: the client who answers, once roles were swapped (absent before any swap: the principal). */
  client?: boolean };
/** B115 (P-319): a role a person may add to this case, from its pinned release; has = how many the case has now. */
export type CanAdd = { role: string; label: string; max: number; has: number };
/** C6.11: the case team in the header (staff only; Sample firm, stand-in SI-9). */
export type CaseTeamLine = { firm: { key: string; name: string; solo: boolean } | null; representative: { id: string; name: string; licence: { body: string; number: string } | null } | null; officers: { id: string; name: string }[] };
export type CaseInfo = { id: string; /** A24-1 (P-492, CS-7) */ case_number: string; /** The firm's own reference, optional since A24-1. */ reference: string | null; status: string; combination_id: string; client: string; pin: { release_version: number; sha256: string; pinned_at: string; revision: number }; release?: { label: string }; people: CasePerson[]; can_add?: CanAdd[]; team?: CaseTeamLine; employer_link?: EmployerLink };
/** private_people (C6.16, client view only): people kept private from the client, with their progress only. */
export type View = QuestionnaireView & { case: CaseInfo; private_people?: { subject_id: string; label: string; progress: ProgressOnly }[] };
type Section = ViewSection;
type Question = ViewQuestion;
type Answer = ViewAnswer;
export type SaveResult = { answer: { id: string; problems: string[] }; fills: Question["fills"]; message: string };
type Mode = "sqr" | "agent";

const ROLE_WORDS: Record<string, string> = { case: "the whole application", principal: "principal applicant", spouse_or_partner: "spouse or partner", child: "child" };
const keyOf = (q: Question, row?: string) => `${q.subjectId}|${q.fact}${row ? `|${row}` : ""}`;
const cellAnswer = (q: Question, row?: string) => (row ? q.rows.find((r) => r.row === row)?.answer ?? null : q.answer);

/** The view of one case in one mode; every change invalidates it, so counts and confirmations come from the server. */
/** A24-2 (P-492): a case in words: the firm's own reference when it gave one, else its case number (contracts caseName). */
export const caseWords = (c: { reference: string | null; case_number: string }) => caseName({ reference: c.reference, caseNumber: c.case_number });
export function useCaseView(caseId: string, mode: Mode) {
  const actor = useActorId();
  return useApi<View>(["runtime", "view", caseId, mode, actor], `/runtime/cases/${caseId}/questionnaire${mode === "agent" ? "?mode=agent" : ""}`, { retry: noRetryOnRefusal });
}
/** BK-3: a case page's place on the frame's line, "Cases › <reference> › <page>". The reference comes from the case's
 *  prepare view, which the case pages already read (same query). */
export function useCaseWhere(caseId: string, here: string, on = true) {
  const prep = useApi<{ reference?: string }>(["runtime", "view", caseId, "prepare"], on ? `/runtime/cases/${caseId}/prepare` : null, { retry: noRetryOnRefusal });
  useWhere(on && prep.data?.reference ? [{ label: "Cases", to: "/cases" }, { label: prep.data.reference, to: `/cases/${caseId}` }, { label: here }] : null);
}
/** A refusal (4xx) is an answer, not a failure: show it at once instead of retrying. */
export const noRetryOnRefusal = (n: number, e: Error) => !(e instanceof ApiError && e.status < 500) && n < 1;

// ------------------------------------------------------------------ question kinds and values

type Kind = "text" | "long" | "email" | "number" | "date" | "month" | "yes_no" | "radio" | "select" | "address" | "phone" | "multi" | "name" | "history" | "declaration" | "document";
/** How a question is asked, read from its type and the shape the forms need (precision, lists, phone parts). */
export function kindOf(q: Question): Kind {
  if (q.shape.phone) return "phone";
  switch (q.value_type) {
    case "address": return "address";
    case "yes_no": return "yes_no";
    case "date": return q.shape.datePrecision === "month" ? "month" : "date";
    case "number": return "number";
    // P-47 types (C4.4). "document" is never asked: an upload is a checklist line (P-130); the field says where it goes.
    case "long_text": return "long";
    case "multi_choice": return "multi";
    case "person_name": return "name";
    case "period_history": return "history";
    case "declaration": return "declaration";
    case "document": return "document";
    case "code": case "country": return q.options ? (q.options.length <= 5 && q.value_type === "code" ? "radio" : "select") : "text";
    default: return q.value_type === "email" || /email/.test(q.fact) ? "email" : q.shape.maxLength <= 200 && /detail|explain|describe|reason/.test(q.fact) ? "long" : "text";
  }
}

type Parts = Record<string, string>;
const ADDRESS: [string, string][] = [["street_number", "Street number"], ["street_name", "Street name"], ["apt_unit", "Apartment or unit (optional)"], ["city", "City or town"], ["province", "Province, state or district (optional)"], ["postal_code", "Postal code (optional)"], ["country", "Country"]];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const asParts = (v: unknown): Parts => (v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, String(x ?? "")])) : {});
const datePartsOf = (v: unknown): Parts => { const [y = "", m = "", d = ""] = typeof v === "string" ? v.split("-") : []; return { y, m: m.replace(/^0(?=\d)/, ""), d: d.replace(/^0(?=\d)/, "") }; };
type Name = { family_name?: string; given_names?: string; no_given_name?: boolean };
type HistoryRow = { from: Parts; to: Parts; what: string };
const NAME: [keyof Name & string, string][] = [["family_name", "Family name"], ["given_names", "Given names"]];
const monthOf = (p: Parts) => (p.y || p.m ? `${p.y ?? ""}-${pad(p.m ?? "")}` : "");
const historyOf = (v: unknown): HistoryRow[] => (Array.isArray(v) ? (v as Period[]).map((r) => ({ from: datePartsOf(r?.from), to: datePartsOf(r?.to), what: String(r?.what ?? "") })) : []);
const monthWords = (v: unknown) => { const p = datePartsOf(v), m = MONTHS[Number(p.m) - 1]; return m && p.y ? `${m} ${p.y}` : ""; };
const pad = (x: string) => (/^\d$/.test(x) ? `0${x}` : x);

/** A value as a person reads it: Yes, 14 Jun 2019, the answer list's label, an address on one line. */
export function shown(q: Question, value: unknown): string {
  if (value === null || value === undefined) return "";
  const k = kindOf(q);
  if (k === "declaration") return value === true ? "Declared" : "Not declared";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (k === "multi" && Array.isArray(value)) return value.map((v) => q.options?.find((o) => o.key === v)?.label ?? String(v)).join(", ");
  if (k === "name") { const n = (value ?? {}) as Name; return n.no_given_name ? `${n.family_name ?? ""} (no given name)`.trim() : [n.given_names, n.family_name].filter(Boolean).join(" "); }
  if (k === "history" && Array.isArray(value)) return (value as Period[]).map((r) => `${monthWords(r?.from)} to ${r?.to ? monthWords(r.to) : "today"}: ${String(r?.what ?? "")}`).join("; ");
  if ((k === "date" || k === "month") && typeof value === "string") {
    const p = datePartsOf(value), m = MONTHS[Number(p.m) - 1];
    return m && p.y ? `${k === "date" ? `${Number(p.d)} ` : ""}${m} ${p.y}` : value;
  }
  if (k === "phone") { const p = asParts(value); return [p.country_code ? `+${p.country_code}` : "", p.number].filter(Boolean).join(" "); }
  if (k === "address") { const p = asParts(value); return [[p.apt_unit, p.street_number, p.street_name].filter(Boolean).join(" "), p.city, p.province, p.postal_code, p.country].filter(Boolean).join(", "); }
  if (q.options && typeof value === "string") return q.options.find((o) => o.key === value)?.label ?? value;
  if (k === "number" && q.shape.money && /^\d+$/.test(String(value))) return `CAD ${Number(value).toLocaleString("en-CA")}`;
  return String(value);
}

/** The value to send: a date from its parts, an address or phone without empty parts; undefined when nothing is given. */
export function toValue(k: Kind, draft: unknown): unknown {
  if (k === "date" || k === "month") {
    const p = draft as Parts;
    if (!p.y && !p.m && !p.d) return undefined;
    return k === "date" ? `${p.y ?? ""}-${pad(p.m ?? "")}-${pad(p.d ?? "")}` : `${p.y ?? ""}-${pad(p.m ?? "")}`;
  }
  if (k === "multi") return Array.isArray(draft) && draft.length ? draft : undefined;
  if (k === "declaration") return typeof draft === "boolean" ? draft : undefined;
  if (k === "name") {
    const n = (draft ?? {}) as Name, family = (n.family_name ?? "").trim(), given = (n.given_names ?? "").trim();
    return family || given || n.no_given_name ? { family_name: family, given_names: given, ...(n.no_given_name ? { no_given_name: true } : {}) } : undefined;
  }
  if (k === "history") {
    const rows = ((draft ?? []) as HistoryRow[]).filter((r) => monthOf(r.from) || monthOf(r.to) || r.what.trim());
    return rows.length ? rows.map((r) => ({ from: monthOf(r.from), to: monthOf(r.to), what: r.what.trim() })) : undefined;
  }
  if (k === "address" || k === "phone") { const p = Object.fromEntries(Object.entries(draft as Parts).map(([a, b]) => [a, b.trim()]).filter(([, b]) => b)); return Object.keys(p).length ? p : undefined; }
  if (typeof draft === "string") return draft.trim() ? draft.trim() : undefined;
  return draft ?? undefined;
}
export function toDraft(k: Kind, value: unknown): unknown {
  if (k === "date" || k === "month") return datePartsOf(value);
  if (k === "address" || k === "phone") return asParts(value);
  if (k === "yes_no" || k === "declaration") return typeof value === "boolean" ? value : undefined;
  if (k === "multi") return Array.isArray(value) ? value : [];
  if (k === "name") return value && typeof value === "object" ? { ...(value as Name) } : {};
  if (k === "history") return historyOf(value);
  return value === null || value === undefined ? "" : String(value);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// ------------------------------------------------------------------ one question (both modes)

/** One question's input, labelled, with its checks under it (server problems first, then a refused save). */
export function QuestionField({ q, draft, onChange, errors, warnings = [], idBase, compact, officer }: { q: Question; draft: unknown; onChange: (d: unknown) => void; errors: string[]; warnings?: string[]; idBase: string; compact?: boolean; officer?: boolean }) {
  const k = kindOf(q), noteId = `${idBase}-note`, invalid = errors.length > 0;
  const note = officer ? q.note : null; // a configuration note ("no answer list yet") is for the officer, not the client
  const hint = [q.required ? null : "Optional", note].filter(Boolean).join(" · ");
  const control = { id: idBase, "aria-invalid": invalid || undefined, "aria-describedby": invalid || warnings.length || hint ? noteId : undefined };
  const label = <>{q.label}{q.required || /\(optional\)\s*$/i.test(q.label) ? null : <span className="font-normal text-text-muted"> (optional)</span>}<ScopeTag q={q} /></>;
  const listId = q.countries ? `${idBase}-countries` : undefined;
  const countryList = q.countries ? <datalist id={listId}>{q.countries.map((c) => <option key={c} value={c} />)}</datalist> : null;
  const notes = (
    <>
      {errors.map((e, i) => <p key={i} id={i === 0 ? noteId : undefined} className="flex items-start gap-1 text-[13px] font-medium text-text-danger"><AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />{e}</p>)}
      {warnings.map((w, i) => <p key={`w${i}`} id={!invalid && i === 0 ? noteId : undefined} className="flex items-start gap-1 text-[13px] font-medium text-text-warn"><AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />{w}</p>)}
      {!invalid && !warnings.length && note ? <p id={noteId} className="text-xs text-text-muted">{note}</p> : null}
    </>
  );
  const box = cn("flex flex-col gap-1.5", invalid ? "border-l-4 border-danger pl-3" : warnings.length ? "border-l-4 border-warn pl-3" : null, !compact && "py-1");
  if (k === "document") {
    return (
      <div className={box} id={idBase}>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-text-muted">This is a document, not a question: it is uploaded from the document checklist.</p>
      </div>
    );
  }
  if (k === "declaration") {
    return (
      <fieldset className={box} aria-describedby={control["aria-describedby"]} id={idBase} tabIndex={-1}>
        <legend className="mb-1.5 text-sm font-medium">{label}</legend>
        {q.meaning ? <p className="whitespace-pre-line text-sm">{q.meaning}</p> : null}
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={draft === true} onChange={(e) => onChange(e.target.checked)} />
          I declare that this is true and complete
        </label>
        {notes}
      </fieldset>
    );
  }
  if (k === "multi") {
    const cur = Array.isArray(draft) ? (draft as string[]) : [];
    return (
      <fieldset className={box} aria-describedby={control["aria-describedby"]} id={idBase} tabIndex={-1}>
        <legend className="mb-1 text-sm font-medium">{label}</legend>
        <p className="-mt-0.5 mb-1 text-xs text-text-muted">Choose all that apply</p>
        <div className="grid grid-cols-1 gap-2">
          {(q.options ?? []).map((o) => (
            <label key={o.key} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm", cur.includes(o.key) ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border-strong bg-surface-raised hover:bg-text/5")}>
              <input type="checkbox" className="size-4 accent-[var(--color-primary)]" value={o.key} checked={cur.includes(o.key)} onChange={(e) => onChange(e.target.checked ? [...cur, o.key] : cur.filter((x) => x !== o.key))} />
              {o.label}
            </label>
          ))}
        </div>
        {notes}
      </fieldset>
    );
  }
  if (k === "name") {
    const n = (draft ?? {}) as Name, set = (part: keyof Name, v: string | boolean) => onChange({ ...n, [part]: v });
    return (
      <fieldset className={box} aria-describedby={control["aria-describedby"]} id={idBase} tabIndex={-1}>
        <legend className="mb-1 text-sm font-medium">{label}</legend>
        <p className="-mt-0.5 mb-1 text-xs text-text-muted">As on the passport</p>
        <div className="flex flex-wrap gap-2">
          {NAME.map(([part, l]) => (
            <label key={part} className="flex w-full flex-col gap-1 text-xs text-text-muted sm:w-[calc(50%-0.25rem)]">
              {l}
              <Input value={String(n[part] ?? "")} onChange={(e) => set(part, e.target.value)} aria-invalid={invalid || undefined} disabled={part === "given_names" && n.no_given_name} className="h-10 text-base sm:h-9 sm:text-sm" autoComplete="off" />
            </label>
          ))}
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={n.no_given_name === true} onChange={(e) => onChange({ ...n, no_given_name: e.target.checked, ...(e.target.checked ? { given_names: "" } : {}) })} />
          No given name (the passport shows none)
        </label>
        {notes}
      </fieldset>
    );
  }
  if (k === "history") {
    const rows = Array.isArray(draft) ? (draft as HistoryRow[]) : [];
    const setRow = (i: number, r: HistoryRow) => onChange(rows.map((x, j) => (j === i ? r : x)));
    const today = new Date().toISOString().slice(0, 10);
    const gaps = rows.length ? historyGaps(rows.map((r) => ({ from: monthOf(r.from), to: monthOf(r.to), what: r.what })), today, 10) : undefined;
    const month = (i: number, r: HistoryRow, end: "from" | "to") => (
      <div className="flex flex-col gap-1">
      <span className="text-xs font-medium" aria-hidden>{end === "from" ? "From" : "To"}</span>
      <div className="flex gap-2">
        {([["m", "Month", "w-16"], ["y", "Year", "w-24"]] as const).map(([part, l, w]) => (
          <label key={part} className={cn("flex flex-col gap-1 text-xs text-text-muted", w)}>
            <span><span className="sr-only">{end === "from" ? "From: " : "To: "}</span>{l}</span>
            <Input value={r[end][part] ?? ""} onChange={(e) => setRow(i, { ...r, [end]: { ...r[end], [part]: e.target.value } })} aria-invalid={invalid || undefined} inputMode="numeric" maxLength={part === "y" ? 4 : 2} className="h-10 text-base sm:h-9 sm:text-sm" autoComplete="off" />
          </label>
        ))}
      </div>
      </div>
    );
    return (
      <fieldset className={box} aria-describedby={control["aria-describedby"]} id={idBase} tabIndex={-1}>
        <legend className="mb-1 text-sm font-medium">{label}</legend>
        <p className="-mt-0.5 mb-1 text-xs text-text-muted">The last 10 years, with no gaps. Leave "To" empty for what goes on today.</p>
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={i} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-2" aria-label={`Period ${i + 1}`}>
              {month(i, r, "from")}
              {month(i, r, "to")}
              <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-text-muted">
                What you did
                <Input value={r.what} onChange={(e) => setRow(i, { ...r, what: e.target.value })} aria-invalid={invalid || undefined} className="h-10 text-base sm:h-9 sm:text-sm" autoComplete="off" />
              </label>
              <Button type="button" variant="ghost" className="h-11" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Remove period ${i + 1}`}><Trash2 aria-hidden />Remove</Button>
            </li>
          ))}
        </ol>
        <div><Button type="button" variant="secondary" className="h-11" onClick={() => onChange([...rows, { from: {}, to: {}, what: "" }])}><Plus aria-hidden />Add a period</Button></div>
        {gaps?.length ? <p className="text-[13px] text-text-warn" aria-live="polite">{`Gaps in the 10 years to today: ${gaps.map((g) => g.words).join("; ")}.`}</p> : null}
        {notes}
      </fieldset>
    );
  }
  if (k === "yes_no" || k === "radio") {
    const opts = k === "yes_no" ? [{ key: "true", label: "Yes" }, { key: "false", label: "No" }] : q.options!;
    const cur = k === "yes_no" ? (draft === undefined ? "" : String(draft)) : String(draft ?? "");
    return (
      <fieldset className={box} aria-describedby={control["aria-describedby"]} id={idBase} tabIndex={-1}>
        <legend className="mb-1.5 text-sm font-medium">{label}</legend>
        <div className={cn("grid gap-2", k === "yes_no" ? "grid-cols-2" : "grid-cols-1")}>
          {opts.map((o) => (
            <label key={o.key} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm", cur === o.key ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border-strong bg-surface-raised hover:bg-text/5")}>
              <input type="radio" className="size-4 accent-[var(--color-primary)]" name={idBase} value={o.key} checked={cur === o.key} onChange={() => onChange(k === "yes_no" ? o.key === "true" : o.key)} />
              {o.label}
            </label>
          ))}
        </div>
        {notes}
      </fieldset>
    );
  }
  if (k === "date" || k === "month" || k === "address" || k === "phone") {
    const p = (draft ?? {}) as Parts, set = (part: string, v: string) => onChange({ ...p, [part]: v });
    const parts: [string, string, string][] = k === "date" ? [["d", "Day", "w-16"], ["m", "Month", "w-16"], ["y", "Year", "w-24"]] : k === "month" ? [["m", "Month", "w-16"], ["y", "Year", "w-24"]]
      : k === "phone" ? [["country_code", "Country code", "w-28"], ["number", "Number", "flex-1 min-w-40"]] : ADDRESS.map(([a, b]) => [a, b, a === "street_name" || a === "city" || a === "country" ? "w-full" : "w-full sm:w-[calc(50%-0.25rem)]"]);
    const example = k === "date" ? "For example, 14 6 2019" : k === "month" ? "For example, 6 2019" : k === "phone" ? "Country code without +, for example 91; then the number" : null;
    return (
      <fieldset className={box} aria-describedby={control["aria-describedby"]} id={idBase} tabIndex={-1}>
        <legend className="mb-1 text-sm font-medium">{label}</legend>
        {example ? <p className="-mt-0.5 mb-1 text-xs text-text-muted">{example}</p> : null}
        <div className="flex flex-wrap gap-2">
          {parts.map(([part, l, w]) => (
            <label key={part} className={cn("flex flex-col gap-1 text-xs text-text-muted", w)}>
              {l}
              <Input value={p[part] ?? ""} onChange={(e) => set(part, e.target.value)} aria-invalid={invalid || undefined} className="h-10 text-base sm:h-9 sm:text-sm"
                inputMode={k === "date" || k === "month" || part === "country_code" || part === "number" ? "numeric" : undefined} autoComplete="off" maxLength={k === "date" || k === "month" ? (part === "y" ? 4 : 2) : undefined} list={part === "country" ? listId : undefined} />
            </label>
          ))}
        </div>
        {countryList}
        {notes}
      </fieldset>
    );
  }
  const input = k === "select" ? (
    <Select {...control} value={String(draft ?? "")} onChange={(e) => onChange(e.target.value)} className="h-11 text-base sm:h-9 sm:text-sm">
      <option value="">Choose…</option>
      {q.options!.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </Select>
  ) : k === "long" ? (
    <Textarea {...control} value={String(draft ?? "")} onChange={(e) => onChange(e.target.value)} className="text-base sm:text-sm" />
  ) : (
    <div className={cn(k === "number" && q.shape.money && "flex items-center gap-2")}>
      {k === "number" && q.shape.money ? <span className="text-sm text-text-muted">CAD $</span> : null}
      <Input {...control} value={String(draft ?? "")} onChange={(e) => onChange(e.target.value)} className="h-11 text-base sm:h-9 sm:text-sm"
        type={k === "email" ? "email" : "text"} inputMode={k === "number" ? "numeric" : k === "email" ? "email" : undefined} autoComplete="off" list={listId} />
      {countryList}
    </div>
  );
  const len = typeof draft === "string" ? [...draft].length : 0;
  return (
    <div className={box}>
      <label htmlFor={idBase} className="text-sm font-medium">{label}</label>
      {input}
      {(k === "long" || k === "text") && q.shape.maxLength < 500 && len > q.shape.maxLength * 0.7 ? <p className={cn("text-xs", len > q.shape.maxLength ? "text-text-danger" : "text-text-muted")} aria-live="polite">{len} of {q.shape.maxLength} characters</p> : null}
      {notes}
    </div>
  );
}

// ------------------------------------------------------------------ saving

/** Saves one answer with the id the person saw (409 when someone changed it first). Returns the server's result. */
export function putAnswer(caseId: string, q: Question, value: unknown, row?: string) {
  const seen = cellAnswer(q, row);
  return api<SaveResult>(`/runtime/cases/${caseId}/answers/${q.subjectId}/${q.fact}`, { method: "PUT", json: { value, expectedId: seen?.id ?? null, ...(row ? { row } : {}) } });
}

/** C6.16: where the one-part-per-screen questionnaire reads and saves: the client's runtime routes (the default), or an
 *  adult's own link (/api/link/*, link/link-page.tsx), with the same screens and the same rules on the server. */
export type QuestionnaireIo = {
  mode: "client" | "link";
  /** The query key prefix to refresh after a save, and the key of the view a part reads back after saving. */
  viewKey: (caseId: string) => unknown[]; freshKey: (caseId: string) => unknown[];
  put: (caseId: string, q: Question, value: unknown, row?: string) => Promise<SaveResult>;
  addRow: (caseId: string, subjectId: string, group: string) => Promise<unknown>;
  removeRow: (caseId: string, subjectId: string, row: string) => Promise<unknown>;
  noneApply: (caseId: string, subjectId: string, group: string, body: { noneApply: boolean; expectedId: string | null }) => Promise<unknown>;
};
const RUNTIME_IO: QuestionnaireIo = {
  mode: "client", viewKey: (id) => ["runtime", "view", id], freshKey: (id) => ["runtime", "view", id, "sqr"], put: putAnswer,
  addRow: (id, subject, group) => api(`/runtime/cases/${id}/groups/${subject}/rows`, { method: "POST", json: { group } }),
  removeRow: (id, subject, row) => api(`/runtime/cases/${id}/groups/${subject}/rows/${row}`, { method: "DELETE" }),
  noneApply: (id, subject, group, body) => api(`/runtime/cases/${id}/groups/${subject}/${group}/none-apply`, { method: "PUT", json: body }),
};
export const QuestionnaireIoContext = React.createContext<QuestionnaireIo>(RUNTIME_IO);
export const refusal = (e: unknown) => (e instanceof ApiError ? (e.status === 409 ? `${e.message}` : e.problem.errors?.[0]?.message ?? e.message) : (e as Error).message);

/** Drafts for a set of questions (and row cells): what the person typed, compared with what is saved. */
type Cell = { q: Question; row?: string };
function useDrafts(cells: Cell[]) {
  const [drafts, setDrafts] = React.useState<Record<string, unknown>>({});
  const base = React.useMemo(() => Object.fromEntries(cells.map(({ q, row }) => [keyOf(q, row), toDraft(kindOf(q), cellAnswer(q, row)?.value)])), [cells]);
  const get = (q: Question, row?: string) => (keyOf(q, row) in drafts ? drafts[keyOf(q, row)] : base[keyOf(q, row)]);
  const set = (q: Question, row: string | undefined, d: unknown) => setDrafts((x) => ({ ...x, [keyOf(q, row)]: d }));
  const dirty = cells.filter(({ q, row }) => keyOf(q, row) in drafts && !same(toValue(kindOf(q), drafts[keyOf(q, row)]), toValue(kindOf(q), base[keyOf(q, row)])));
  const reset = (keys?: string[]) => setDrafts((x) => (keys ? Object.fromEntries(Object.entries(x).filter(([k]) => !keys.includes(k))) : {}));
  return { get, set, dirty, reset };
}

// ------------------------------------------------------------------ the component

/** The questionnaire renderer (P-47): one component; the mode decides who it is for. */
export function Questionnaire({ caseId, mode }: { caseId: string; mode: Mode }) {
  const view = useCaseView(caseId, mode);
  if (view.isLoading) return <div className="space-y-3" aria-busy="true"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>;
  if (view.isError) {
    const e = view.error as ApiError;
    return <Notice tone="danger" title={e.status === 404 ? "This questionnaire is not available to you" : e.status === 403 ? "Not available to this person" : "The questionnaire could not be loaded"}>{e.message}</Notice>;
  }
  return mode === "sqr" ? <Sqr view={byPerson(view.data!)} /> : <AgentView view={byPerson(view.data!)} />;
}

/** B128, B155: whom else the client answers for: the parents, and the brothers and sisters, the forms ask about. */
function relativesWords(view: View) {
  const rel = view.sections.filter((x) => x.subjectId.includes("/"));
  const parents = rel.some((x) => !x.group), lists = rel.some((x) => x.group);
  return parents || lists ? `, and for the ${[parents ? "parents" : null, lists ? "brothers and sisters" : null].filter(Boolean).join(", ")} its forms ask about` : "";
}

/** Parts person by person, in the case's order (the application, the principal, then the family), each person's
 *  sections in the release's order: the client finishes one person before "answering for" the next. */
export function byPerson(v: View): View {
  // B128 (QA-153): a parent a form describes (`<person>/parent_1`) comes right after the person whose parent they are.
  const at = (id: string) => { const [own, relative] = id.split("/"); return v.case.people.findIndex((p) => p.subject_id === own) + (relative ? 0.5 : 0); };
  return { ...v, sections: [...v.sections].sort((a, b) => at(a.subjectId) - at(b.subjectId)) };
}

// ------------------------------------------------------------------ SQR: the client, one part per screen

/** Parts the client passed with "Save and continue" on this device: a part with nothing required and nothing answered
 *  (no previous jobs, no other names) is done once passed. A per-device convenience; the server holds every answer. */
const passedKey = (caseId: string) => `xr-passed-${caseId}`;
function passedParts(caseId: string): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(passedKey(caseId)) ?? "[]") as string[]); } catch { return new Set(); } }
/** QA-417 (P-497; P-72 and P-78 kept): what each person's tab still has to confirm, summed from the same sections as the
 *  household line (the engine's summary is the sum of its sections, engine/runtime/case.ts), so the tabs add up to it.
 *  In the Agent view's tab order; a person with nothing to confirm is kept (n = 0). */
export function toConfirmByTab(v: View): { id: string; label: string; n: number }[] {
  const tabs = new Map<string, { id: string; label: string; n: number }>();
  for (const s of byPerson(v).sections) { const t = tabs.get(s.subjectId) ?? { id: s.subjectId, label: s.about_label, n: 0 }; t.label = s.about_label; t.n += s.answered - s.confirmed; tabs.set(s.subjectId, t); }
  return [...tabs.values()];
}
/** QA-417: the address that opens one person's tab in the Agent view (the household line's links). */
export const tabHash = (subjectId: string) => `#tab-${encodeURIComponent(subjectId)}`;

function markPassed(caseId: string, s: Section) { try { const x = passedParts(caseId); x.add(`${s.subjectId}|${s.section}`); localStorage.setItem(passedKey(caseId), JSON.stringify([...x])); } catch { /* private window: the part stays "Optional" */ } }

/** QA-441 (P-498): where Save and continue goes: the first later part that is not done, wrapping round to the first
 *  parts, or the overview (null) when every other part is done. On a first pass that is the next part; on a second pass
 *  the client skips the parts already done. `parts` is the order the questionnaire shows after the save (review m1: a
 *  save can add or remove parts, so the index is read on that order); `from` is the part left, -1 when the save
 *  removed it (then the search starts at `after`, where it stood). Judged with the parts' checks and the parts passed
 *  on this device. */
function nextNotDone(parts: Section[], from: number, after: number, passed: Set<string>, checks: ViewCheck[]): number | null {
  const start = from >= 0 ? from : after - 1;
  for (let k = 1; k <= parts.length; k++) {
    const i = (((start + k) % parts.length) + parts.length) % parts.length;
    if (i === from) continue;
    if (!partState(parts[i], passed, checks).done) return i;
  }
  return null;
}
const partKey = (s: Section) => `${s.subjectId}|${s.section}`;

function partState(s: Section, passed: Set<string>, checks: ViewCheck[] = []) {
  if (checks.some((c) => c.subjectId === s.subjectId && c.section === s.section)) return { tone: "warn", text: "Check answers", done: false };
  const invalid = s.questions.some((q) => (q.group ? q.rows.some((r) => r.answer?.problems.length) : q.answer?.problems.length));
  if (invalid) return { tone: "danger", text: "Needs fixing", done: false };
  if (s.missing.length) return { tone: s.answered ? "warn" : "neutral", text: s.answered ? `${s.missing.length} to answer` : "Not started", done: false };
  if (!s.answered && !passed.has(`${s.subjectId}|${s.section}`)) return { tone: "neutral", text: "Optional", done: false };
  return { tone: "ok", text: "Done", done: true };
}

/** `order`: the parts this questionnaire shows for a view (by default every part, person by person); Save and continue
 *  reads its target on the order of the view just reloaded (QA-441). The adult's own link shows only their parts. */
export function Sqr({ view, order = (v: View) => byPerson(v).sections }: { view: View; order?: (v: View) => Section[] }) {
  const [params, setParams] = useSearchParams();
  const parts = view.sections;
  const raw = params.get("part");
  const index = raw === null ? null : Math.min(Math.max(Math.floor(Number(raw)) - 1 || 0, 0), parts.length - 1);
  // BK-4c: the hand-off's `from` (who hands back) stays while the client moves between parts.
  const from = params.get("from");
  const go = (i: number | null) => { setParams({ ...(i === null ? {} : { part: String(i + 1) }), ...(from ? { from } : {}) }); window.scrollTo({ top: 0 }); };
  if (index === null) return <SqrOverview view={view} open={go} />;
  return <SqrPart key={`${parts[index].subjectId}|${parts[index].section}`} view={view} index={index} go={go} order={order} />;
}

function SqrOverview({ view, open }: { view: View; open: (i: number) => void }) {
  const io = React.useContext(QuestionnaireIoContext), link = io.mode === "link";
  const [params] = useSearchParams(), from = params.get("from"); // BK-4c: who handed the questionnaire over
  const passed = passedParts(view.case.id);
  const parts = view.sections, done = parts.filter((s) => partState(s, passed, view.checks).done).length;
  const next = parts.findIndex((s) => !partState(s, passed, view.checks).done);
  // C6.16: a person kept private from the client has no parts here, only their progress; Send to … sits under each adult.
  const privacy = usePeoplePrivacy(link ? null : view.case.id);
  const priv = view.private_people ?? [];
  const at = (id: string) => { const [own, relative] = id.split("/"); return view.case.people.findIndex((p) => p.subject_id === own) + (relative ? 0.5 : 0); }; // B128: a relative after their person
  const people = [...new Map<string, string>([...parts.map((s) => [s.subjectId, s.about_label] as const), ...priv.map((p) => [p.subject_id, p.label] as const)]).entries()].sort((a, b) => at(a[0]) - at(b[0]));
  const lineOf = (id: string) => privacy.data?.people.find((p) => p.subject_id === id);
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{link ? "Your questions" : "Client questionnaire"}</h1>
        <p className="mt-1 text-sm text-text-muted">{link ? `Case ${caseWords(view.case)}. You answer your own questions. Each answer is saved when you press Save; to come back later, open your link again and ask for a new code.` : <>Case {caseWords(view.case)}. You answer for everyone travelling on this application{relativesWords(view)}. Each answer is saved when you press Save; you can stop and come back at any time.</>}</p>
      </div>
      <RecordedForYou view={view} open={open} />
      <div className="rounded-xl border border-border bg-surface-raised p-4">
        <p className="text-sm font-medium">{done} of {parts.length} parts done</p>
        <div className="mt-2 h-2 rounded-full bg-text/10" role="progressbar" aria-valuemin={0} aria-valuemax={parts.length} aria-valuenow={done} aria-label="Parts done"><div className="h-2 rounded-full bg-primary" style={{ width: `${(100 * done) / Math.max(parts.length, 1)}%` }} /></div>
        {next >= 0 ? <Button className="mt-4 h-11 w-full text-base" onClick={() => open(next)}>{done ? "Continue where you left off" : "Start"} <ChevronRight /></Button> : <Notice tone="ok" className="mt-4" title="Every part is answered">Your officer reviews your answers and may ask you about some of them.
          {/* BK-4c (BR-2, BR-4): back to whoever handed over (?from=, a firm person), on the case page; never on a person's own link. */}
          {/* Review m3: only to the person who handed it over in this tab (a hand-typed ?from= of anyone else shows nothing). */}
          {!link && from && isFirmStaff(from) && handedFrom(view.case.id) === from ? <HandOff className="mt-2" to={from} go={`/cases/${view.case.id}`} label={`Hand back to ${handName(from)} (simulated)`} next={<>{handName(from)} picks up from here.</>} data="back" /> : null}</Notice>}
      </div>
      {people.map(([id, label]) => (
        <section key={id} aria-labelledby={`p-${id}`}>
          <h2 id={`p-${id}`} className="mb-2 text-base font-semibold [overflow-wrap:anywhere]">{link ? (id.includes("/") ? `About ${label.replace(/^.*?['’]s /, "your ")}` : "About you") : `About ${inSentence(label)}`}</h2>
          {link ? null : <div className="mb-2"><HouseholdReads view={view} subjectId={id} words={{ who: WHO, when, shown }} /></div>}
          {!link && lineOf(id) ? <PrincipalPersonLine caseId={view.case.id} person={lineOf(id)!} /> : null}
          {priv.some((p) => p.subject_id === id) ? (lineOf(id) ? null : <PrivateProgress label={label} progress={priv.find((p) => p.subject_id === id)!.progress} />) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-raised">
            {parts.map((s, i) => [s, i] as const).filter(([s]) => s.subjectId === id).map(([s, i]) => {
              const st = partState(s, passed, view.checks);
              return (
                <li key={s.section}>
                  <button className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-text/5 focus-visible:outline-2 focus-visible:outline-primary" onClick={() => open(i)}>
                    <span className="flex-1">{s.title}</span>
                    <Pill tone={st.tone}>{st.tone === "ok" ? <Check className="size-3" aria-hidden /> : null}{st.text}</Pill>
                    <ChevronRight className="size-4 text-text-muted" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>)}
        </section>
      ))}
    </div>
  );
}

function SqrPart({ view, index, go, order }: { view: View; index: number; go: (i: number | null) => void; order: (v: View) => Section[] }) {
  const caseId = view.case.id, part = view.sections[index], total = view.sections.length;
  const qc = useQueryClient(), toast = useToast(), io = React.useContext(QuestionnaireIoContext);
  const person = view.case.people.find((p) => p.subject_id === part.subjectId);
  // A question a rule hides is not asked (its answer, if any, is kept and not used); rules apply on each save.
  const asked = part.questions.filter((q) => !q.hidden);
  const single = asked.filter((q) => !q.group), grouped = asked.filter((q) => q.group);
  const rows = grouped[0]?.rows ?? [];
  const cells = React.useMemo(() => { const group = part.questions.filter((q) => !q.hidden && q.group); return part.questions.filter((q) => !q.hidden).flatMap((q): Cell[] => (q.group ? q.rows.filter((r) => inEntry(q, r.row, group)).map((r) => ({ q, row: r.row })) : [{ q }])); }, [part]);
  const [adding, setAdding] = React.useState(false);
  const d = useDrafts(cells);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [summary, setSummary] = React.useState(false);
  const [removing, setRemoving] = React.useState<string | null>(null);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [focusSummary, setFocusSummary] = React.useState(0);
  React.useEffect(() => { if (focusSummary) summaryRef.current?.focus(); }, [focusSummary]);
  // The part's heading takes the focus when the part opens (keyboard and screen readers hear where they are).
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  // A save that finishes after the person left this part (Back, another part) never moves them (break report m6).
  const alive = React.useRef(true);
  React.useEffect(() => () => { alive.current = false; }, []);
  const refresh = () => qc.invalidateQueries({ queryKey: io.viewKey(caseId) });

  const partChecks = view.checks.filter((c) => c.subjectId === part.subjectId && c.section === part.section);
  const checksOf = (q: Question, row?: string) => (row ? [] : partChecks.filter((c) => c.fact === q.fact).map((c) => c.message));
  const problemsOf = (q: Question, row?: string) => [...(errors[keyOf(q, row)] ? [errors[keyOf(q, row)]] : []), ...(keyOf(q, row) in errors ? [] : cellAnswer(q, row)?.problems ?? [])];
  // After a Save and continue, required questions still unanswered are named too (warn: the client may leave them).
  const missingOf = (q: Question, row?: string) => (summary && q.required && !cellAnswer(q, row) && !d.dirty.some((x) => x.q === q && x.row === row) ? ["Answer this question, or leave it for now."] : []);
  const warningsOf = (q: Question, row?: string) => [...checksOf(q, row), ...missingOf(q, row)];
  const listed = cells.filter(({ q, row }) => problemsOf(q, row).length || warningsOf(q, row).length);
  // A required group with no entries and no "none apply" (review r1d-none-apply M1): named in the summary, linked to "None apply".
  const groupOpen = !!part.group?.required && part.group.rows === 0 && !part.group.none_apply?.value;
  const errorsListed = listed.some(({ q, row }) => problemsOf(q, row).length);

  async function save(): Promise<boolean> {
    setStatus("saving");
    const errs: Record<string, string> = {};
    for (const { q, row } of d.dirty) {
      const value = toValue(kindOf(q), d.get(q, row));
      if (value === undefined) { errs[keyOf(q, row)] = "An answer can be changed but not cleared here. Give an answer, or ask your officer to remove it."; continue; }
      try { await io.put(caseId, q, value, row); } catch (e) { errs[keyOf(q, row)] = refusal(e); if (e instanceof ApiError && e.status === 409) d.reset([keyOf(q, row)]); }
    }
    d.reset(d.dirty.map(({ q, row }) => keyOf(q, row)).filter((k) => !errs[k] || errs[k].startsWith("Someone")));
    await refresh();
    setErrors(errs);
    setStatus(Object.keys(errs).length ? "failed" : "saved");
    return Object.keys(errs).length === 0;
  }
  // One way to leave a part, whichever button (qa QA-36, Lead decision under P-47): what was typed is saved (never lost);
  // an answer that needs a fix, a check, or an empty required question keeps the person on the part with the summary
  // and a way to leave anyway in the direction they chose.
  const [leaveTo, setLeaveTo] = React.useState<{ to: number | null; words: string }>({ to: index + 1 < total ? index + 1 : null, words: "leave them for now and continue" });
  // `to` "next": the next part that is not done (QA-441), worked out on the view the save reloaded.
  async function leave(target: number | null | "next", words: string, forward: boolean) {
    let to = target === "next" ? (index + 1 < total ? index + 1 : null) : target;
    setLeaveTo({ to, words });
    const ok = await save();
    if (!alive.current) return;
    const fresh = qc.getQueriesData<View>({ queryKey: io.freshKey(caseId) })[0]?.[1];
    const now = fresh?.sections.find((s) => s.subjectId === part.subjectId && s.section === part.section) ?? part;
    const invalid = now.questions.some((q) => (q.group ? q.rows.some((r) => r.answer?.problems.length) : q.answer?.problems.length));
    const flagged = (fresh?.checks ?? view.checks).some((c) => c.subjectId === part.subjectId && c.section === part.section) || now.missing.length > 0;
    const stay = !ok || invalid || flagged;
    if (forward && !stay) markPassed(caseId, part);
    if (target === "next") {
      const parts = fresh ? order(fresh) : view.sections;
      to = nextNotDone(parts, parts.findIndex((s) => partKey(s) === partKey(part)), index, passedParts(caseId), fresh?.checks ?? view.checks);
      setLeaveTo({ to, words });
    }
    if (stay) { setSummary(true); setFocusSummary((n) => n + 1); return; }
    go(to);
  }
  const saveAndContinue = () => leave("next", "leave them for now and continue", true);
  const back = () => (d.dirty.length ? leave(index > 0 ? index - 1 : null, "leave them for now and go back", false) : go(index > 0 ? index - 1 : null));
  async function addRow() {
    if (adding) return;
    setAdding(true);
    try { await io.addRow(caseId, part.subjectId, part.section); await refresh(); } catch (e) { toast.push({ tone: "danger", text: refusal(e) }); }
    setAdding(false);
  }
  async function removeRow(row: string) {
    try { await io.removeRow(caseId, part.subjectId, row); setRemoving(null); await refresh(); toast.push({ tone: "ok", text: "Entry removed. Its answers are kept in the case history." }); } catch (e) { toast.push({ tone: "danger", text: refusal(e) }); }
  }
  const field = (q: Question, row?: string) => cellAnswer(q, row)?.awaits_client ? (
    <div key={keyOf(q, row)} className="space-y-2">
      <ReconfirmLine caseId={caseId} q={q} a={cellAnswer(q, row)!} changed={d.dirty.some((x) => x.q === q && x.row === row)} />
      <QuestionField q={q} idBase={`f-${keyOf(q, row).replace(/[^a-z0-9]/gi, "")}`} draft={d.get(q, row)} onChange={(v) => { d.set(q, row, v); setStatus("idle"); }} errors={problemsOf(q, row)} warnings={warningsOf(q, row)} />
    </div>
  ) : (
    <React.Fragment key={keyOf(q, row)}>
      <QuestionField q={q} idBase={`f-${keyOf(q, row).replace(/[^a-z0-9]/gi, "")}`} draft={d.get(q, row)} onChange={(v) => { d.set(q, row, v); setStatus("idle"); }} errors={problemsOf(q, row)} warnings={warningsOf(q, row)} />
      {/* C6.16 (BR-6, P-78): on the person's own link, an answer the principal gave waits for them: Confirm keeps it as theirs. */}
      {io.mode === "link" && !row && q.answer && !q.answer.confirmed && q.answer.channel === "questionnaire" && !d.dirty.some((x) => x.q === q) ? <ConfirmMine caseId={caseId} q={q} onDone={refresh} /> : null}
    </React.Fragment>
  );
  // Saved answers of this part that do not pass their checks (stored and flagged, P-47): never reported as plainly saved.
  const needFix = cells.filter(({ q, row }) => (cellAnswer(q, row)?.problems.length ?? 0) > 0).length;
  const confirmWords = [...new Set(cells.map(({ q, row }) => cellAnswer(q, row)?.why).filter(Boolean))];

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <button className="flex min-h-11 items-center gap-1 font-medium text-text-link hover:underline" disabled={status === "saving"} onClick={() => void back()}><ArrowLeft className="size-4" aria-hidden />Back</button>
        <span role="status" className={cn("text-[13px]", status === "failed" || (needFix && !d.dirty.length) ? "text-text-danger" : "text-text-ok")}>{status === "saving" ? "Saving…" : status === "failed" ? "Some answers were not saved" : d.dirty.length ? "" : needFix ? `Saved: ${needFix} answer${needFix === 1 ? " needs" : "s need"} a fix` : status === "saved" || part.answered ? "✓ Saved" : ""}</span>
      </div>
      <p className="text-[13px] text-text-muted">Part {index + 1} of {total} · {part.title}</p>
      <div className="mb-4 mt-1.5 h-1.5 rounded-full bg-text/10" aria-hidden><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(100 * (index + 1)) / total}%` }} /></div>

      {summary && (listed.length || groupOpen) ? (
        <div ref={summaryRef} tabIndex={-1} role="alert" aria-labelledby="problem-title" className={cn("mb-4 rounded-lg border-2 bg-surface-raised p-4 outline-none", errorsListed ? "border-danger" : "border-warn")}>
          <p id="problem-title" className={cn("font-semibold", errorsListed ? "text-text-danger" : "text-text-warn")}>{errorsListed ? "There is a problem" : "Check these answers"}</p>
          <ul className="mt-1 space-y-1 text-sm">
            {groupOpen ? <li><a className="font-medium text-text-warn underline" href={`#none-apply-${part.subjectId}-${part.section}`} onClick={(e) => { e.preventDefault(); document.getElementById(`none-apply-${part.subjectId}-${part.section}`)?.focus(); }}>{groupLabel(part.title)}.</a></li> : null}
            {listed.map(({ q, row }) => <li key={keyOf(q, row)}><a className={cn("font-medium underline", problemsOf(q, row).length ? "text-text-danger" : "text-text-warn")} href={`#f-${keyOf(q, row).replace(/[^a-z0-9]/gi, "")}`} onClick={(e) => { e.preventDefault(); document.getElementById(`f-${keyOf(q, row).replace(/[^a-z0-9]/gi, "")}`)?.focus(); }}>{q.label}{row ? ` (entry ${(q.rows.find((r) => r.row === row)?.index ?? 0) + 1})` : ""}{/[?:]$/.test(q.label) ? " " : ": "}{problemsOf(q, row)[0] ?? warningsOf(q, row)[0]}{!problemsOf(q, row).length && partChecks.some((c) => c.fact === q.fact && c.illustrative) ? " (Sample check)" : ""}</a></li>)}
          </ul>
          <p className="mt-2 text-xs text-text-muted">Your other answers are saved. You can fix these now, or <button className="font-medium text-text-link underline" onClick={() => go(leaveTo.to)}>{leaveTo.words}</button>.</p>
        </div>
      ) : null}

      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none [overflow-wrap:anywhere]">{part.title}</h1>
      <p className="mt-1 text-sm [overflow-wrap:anywhere]">
        {io.mode === "link" ? "These are your own questions. The person who started the application sees how far you have got, not your answers." : person?.role === "case" ? "Answered once for the whole application." : <>Answering for <b>{inSentence(part.about_label)}</b>{part.subjectId.includes("/") ? (part.group ? " (not on this application)" : " (a parent, not on this application)") : person && !(person.client ?? person.role === "principal") ? ` (${ROLE_WORDS[person.role] ?? (person.role_label ?? person.role.replace(/_/g, " ")).toLowerCase()})` : " (you)"}.</>}
      </p>
      {/* B150 (P-411): who gave this part's answers, each kind once (the principal's for an adult, staff's), so a mixed part still says it. */}
      {confirmWords.length === 1 ? <p className="mt-1 text-xs text-text-muted" data-answer-words>{confirmWords[0]}.</p>
        : confirmWords.length > 1 ? <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-text-muted" data-answer-words>{confirmWords.map((w) => <li key={w}>{w}.</li>)}</ul> : null}

      <form className="mt-4 space-y-5" onSubmit={(e) => { e.preventDefault(); void saveAndContinue(); }} noValidate>
        {single.map((q) => field(q))}
        {grouped.length ? (
          <div className="space-y-3">
            <GroupIntro questions={grouped} />
            <NoneApply caseId={caseId} s={part} onAdd={() => void addRow()} adding={adding} />
            {rows.map((r) => (
              <section key={r.row} aria-label={`Entry ${r.index + 1}`} className="space-y-4 rounded-xl border border-border bg-surface-raised p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Entry {r.index + 1}</h2>
                  {removing === r.row ? (
                    <span className="flex items-center gap-2 text-xs">Remove this entry?<Button type="button" size="sm" variant="destructive" onClick={() => void removeRow(r.row)}>Remove</Button><Button type="button" size="sm" variant="ghost" onClick={() => setRemoving(null)}>Keep</Button></span>
                  ) : <Button type="button" size="sm" variant="ghost" onClick={() => setRemoving(r.row)}><Trash2 aria-hidden />Remove</Button>}
                </div>
                {!r.fits ? <Notice tone="warn" title="This entry does not fit on the form">The form has room for {grouped[0].capacity} entries. Keep it here: your officer adds it on an extra sheet.</Notice> : null}
                {grouped.filter((q) => inEntry(q, r.row, grouped)).map((q) => field(q, r.row))}
              </section>
            ))}
            {rows.length ? <Button type="button" variant="secondary" className="h-11" busy={adding} onClick={() => void addRow()}><Plus aria-hidden />Add another</Button> : null}
          </div>
        ) : null}
        <div className="space-y-2 pt-2">
          <Button type="submit" className="h-11 w-full text-base" busy={status === "saving"}>Save and continue</Button>
          <Button type="button" variant="ghost" className="h-11 w-full" disabled={status === "saving"} onClick={async () => { if (await save()) { toast.push({ tone: "ok", text: "Saved. You can close this page and continue later." }); go(null); } else { setSummary(true); setFocusSummary((n) => n + 1); } }}>Save and come back later</Button>
        </div>
      </form>
    </div>
  );
}

/** C6.18 (P-244): re-confirm one background answer the case officer recorded (the version shown), as the client. */
function useReconfirm(caseId: string) {
  const qc = useQueryClient(), toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  async function reconfirm(a: Answer) {
    setBusy(a.id);
    // Break M1 on #1246: the value the client sees goes with it; a changed answer is refused (it is saved instead).
    try { const r = await api<{ message: string }>(`/runtime/cases/${caseId}/answers/${a.id}/reconfirm`, { method: "POST", json: { value: a.value } }); toast.push({ tone: "ok", text: r.message }); }
    catch (e) { toast.push({ tone: "danger", text: refusal(e) }); }
    await qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
    setBusy(null);
  }
  return { busy, reconfirm };
}

/** C6.18: above a question the case officer answered for the client: who, when, and "This is right" (or change it below). */
function ReconfirmLine({ caseId, q, a, changed }: { caseId: string; q: Question; a: Answer; changed: boolean }) {
  const { busy, reconfirm } = useReconfirm(caseId);
  // Break M1 on #1246: once the client changed it on screen, only Save keeps it (theirs); break M2: a problem is fixed first.
  if (changed || a.problems.length) return (
    <p className="rounded-lg border border-warn/50 bg-warn/5 px-3 py-2 text-sm" data-reconfirm={q.fact}>{changed ? "You changed what your case officer recorded. Press Save and continue to keep your answer." : `Your case officer recorded an answer that needs a fix: ${a.problems[0]} Answer it below and save.`}</p>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warn/50 bg-warn/5 px-3 py-2 text-sm" data-reconfirm={q.fact}>
      <span className="min-w-0 flex-1">Your case officer recorded <b>{shown(q, a.value)}</b> on {a.officer ? when(a.officer.at) : "your behalf"}. Is it right? If not, change it below and save.</span>
      <Button type="button" size="sm" variant="secondary" busy={busy === a.id} onClick={() => void reconfirm(a)} aria-label={`This is right: ${q.label}`}><Check aria-hidden />This is right</Button>
    </div>
  );
}

/** C6.18: the client's list of every background answer their case officer recorded and they have not re-confirmed yet,
 *  first on their questionnaire: each is checked one by one (This is right, or Change in its part), before signing. */
function RecordedForYou({ view, open }: { view: View; open: (i: number) => void }) {
  const { busy, reconfirm } = useReconfirm(view.case.id);
  const items = view.sections.flatMap((s, i) => s.questions.flatMap((q) => (q.group ? q.rows.map((r) => ({ q, a: r.answer, i, s })) : [{ q, a: q.answer, i, s }])))
    .filter((x): x is { q: Question; a: Answer; i: number; s: Section } => !!x.a?.awaits_client);
  if (!items.length) return null;
  return (
    <section aria-labelledby="recorded-for-you" className="rounded-xl border-2 border-warn bg-surface-raised p-4" data-recorded-for-you>
      <h2 id="recorded-for-you" className="text-base font-semibold">Check what your case officer recorded ({items.length})</h2>
      <p className="mt-1 text-sm text-text-muted">{items.length === 1 ? "Your case officer wrote down this answer for you. It is on your draft forms now; check it: nothing is printed or signed until you say it is right." : "Your case officer wrote down these answers for you. They are on your draft forms now; check each one: nothing is printed or signed until you say each is right."}</p>
      <ul className="mt-3 divide-y divide-border">
        {items.map(({ q, a, i, s }) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm [overflow-wrap:anywhere]">{q.label}</p>
              <p className="text-sm font-semibold">{shown(q, a.value)}</p>
              <p className="text-xs text-text-muted">{s.about_label === "The application" ? "For the application" : `About ${inSentence(s.about_label)}`} · recorded by your case officer{a.officer ? ` on ${when(a.officer.at)}` : ""}</p>
            </div>
            <span className="flex gap-2">
              {a.problems.length ? <span className="max-w-56 text-xs text-text-warn">Needs a fix: {a.problems[0]}</span> : <Button size="sm" variant="secondary" busy={busy === a.id} onClick={() => void reconfirm(a)} aria-label={`This is right: ${q.label}${s.about_label === "The application" ? "" : `, ${s.about_label}`}`}><Check aria-hidden />This is right</Button>}
              <Button size="sm" variant="ghost" onClick={() => open(i)} aria-label={`Change: ${q.label}${s.about_label === "The application" ? "" : `, ${s.about_label}`}`}><Pencil aria-hidden />Change</Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** B155: whether an entry asks this question: always, unless the form has no box for it in that entry's row while the
 *  entry itself fits (a brother or sister's "accompanies you" Yes/No is on one row of IMM 5645's Section C only). An entry
 *  that does not fit at all keeps every question (it goes on an extra sheet). Groups whose questions share their rows
 *  (every other group) are unchanged. */
function inEntry(q: Question, row: string, group: Question[]) {
  const own = q.rows.find((x) => x.row === row)?.fits, entry = group.some((x) => x.rows.find((r) => r.row === row)?.fits);
  return own !== false || !entry;
}

/** A repeating group with no entries (Lead, break M3, P-71/P-72): add an entry, or say none apply; "none apply" is an
 *  answer like any other (confirmed by the same rule) and can be changed back. Shown in both views. */
function NoneApply({ caseId, s, compact, onAdd, adding }: { caseId: string; s: Section; compact?: boolean; onAdd: () => void; adding: boolean }) {
  const qc = useQueryClient(), toast = useToast(), io = React.useContext(QuestionnaireIoContext);
  const [busy, setBusy] = React.useState(false);
  const g = s.group, na = g?.none_apply;
  // Keyboard (review M2): the pressed button is replaced; the focus goes to the control that replaces it.
  const pressed = React.useRef(false), change = React.useRef<HTMLButtonElement>(null), add = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => { if (pressed.current) { pressed.current = false; (na?.value ? change : add).current?.focus(); } }, [na?.value, na?.id]);
  if (!g || g.rows > 0) return null;
  const whose = `${s.title} for ${inSentence(s.about_label)}`;
  async function say(noneApply: boolean) {
    setBusy(true);
    try {
      await io.noneApply(caseId, s.subjectId, s.section, { noneApply, expectedId: na?.id ?? null });
      pressed.current = true;
      toast.push({ tone: "ok", text: noneApply ? `Saved: none apply in ${s.title} for ${inSentence(s.about_label)}.` : `Saved: entries apply in ${s.title}; add them now.` });
    } catch (e) { toast.push({ tone: "danger", text: refusal(e) }); }
    await qc.invalidateQueries({ queryKey: io.viewKey(caseId) }); setBusy(false);
  }
  if (na?.value) return (
    <div className={cn("flex flex-wrap items-center gap-2", compact ? "text-[13px]" : "rounded-lg border border-border bg-surface-raised p-3 text-sm")}>
      <Check className="size-4 text-text-ok" aria-hidden /><span className="font-medium">None apply</span><ConfirmPill a={na} about={s.about_label} />
      {compact ? <span className="text-xs text-text-muted">{na.answered ? `${CHANNEL[na.answered.channel] ?? "answered"} · ${WHO[na.answered.by] ?? "someone"} · ${when(na.answered.at)} · confirmed by ${WHO[na.by] ?? "someone"} ${when(na.at)}` : `${CHANNEL[na.channel] ?? "answered"} · ${WHO[na.by] ?? "someone"} · ${when(na.at)}`}</span> : null}
      <span className="flex-1" />
      <Button ref={change} type="button" size="sm" variant="secondary" className={compact ? "" : "h-11"} busy={busy} onClick={() => void say(false)} aria-label={`Entries apply after all: ${whose}`}>Entries apply after all</Button>
    </div>
  );
  return (
    <div className={cn("space-y-2", compact ? "" : "rounded-lg border border-dashed border-border-strong p-3")}>
      <p className={cn("text-text-muted", compact ? "text-[13px]" : "text-sm")}>{compact ? "No entries." : "Nothing added yet. Add an entry, or say that none apply."}{g.required ? " The forms need one or the other before filing." : ""}</p>
      <div className="flex flex-wrap gap-2">
        <Button ref={add} type="button" variant="secondary" size={compact ? "sm" : "default"} className={compact ? "" : "h-11"} busy={adding} onClick={onAdd} aria-label={compact ? `Add an entry: ${whose}` : undefined}><Plus aria-hidden />Add an entry</Button>
        <Button id={`none-apply-${s.subjectId}-${s.section}`} type="button" variant="ghost" size={compact ? "sm" : "default"} className={compact ? "" : "h-11"} busy={busy} onClick={() => void say(true)} aria-label={`None apply: ${whose}`}>None apply</Button>
      </div>
    </div>
  );
}

/** C6.16 (BR-6, m4): Confirm on the person's own link saves the same value again, with the id of the answer on screen: a
 *  new answer of their own (a newer answer meanwhile is refused, 409). */
function ConfirmMine({ caseId, q, onDone }: { caseId: string; q: Question; onDone: () => Promise<unknown> }) {
  const io = React.useContext(QuestionnaireIoContext), toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const by = WHO[q.answer!.by] ?? "the person who started the application";
  return (
    <div className="-mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface-sunken px-3 py-2 text-[13px]">
      <span className="flex-1 text-text-muted">Answered by {by}. Keep it as your answer, or change it above.</span>
      <Button type="button" size="sm" variant="secondary" busy={busy} aria-label={`Confirm: ${q.label}`} onClick={async () => { setBusy(true); try { await io.put(caseId, q, q.answer!.value); toast.push({ tone: "ok", text: "Confirmed: it is now your own answer." }); await onDone(); } catch (e) { toast.push({ tone: "danger", text: refusal(e) }); } setBusy(false); }}><Check aria-hidden />Confirm</Button>
    </div>
  );
}

/** What one entry of a repeating group asks (the release names no group; its questions say what an entry is). */
function GroupIntro({ questions }: { questions: Question[] }) {
  return (
    <div>
      <h2 className="text-base font-semibold">Entries</h2>
      <p className="text-[13px] text-text-muted">Each entry asks: {questions.map((q) => q.label.replace(/[?.]$/, "")).join("; ")}.</p>
    </div>
  );
}

// ------------------------------------------------------------------ Agent view: the case officer

/** C7.7: an answer the firm record supplies (the representative's name, e-mail, office address and phone) is shown as
 *  read-only, with its source; it is changed in the firm record, never on the case. */
const FIRM_RECORD = "firm_record";
const fromFirm = (a: Answer | null | undefined) => a?.channel === FIRM_RECORD;
/** QA-293: the representative's tab (the view's "representative" subject): their details come only from the firm record,
 *  so one it does not fill (on this release's keys, or not at all) says so and offers no Add (the route refuses it, 422). */
const aboutRepresentative = (q: Question) => q.subjectId === "representative";
/** `about`: whose answer it is (the person's name), for "Answered by the principal for <name>" (P-411 (1)). `value`: the
 *  answer as shown; a declaration made reads "Declared" itself, so its pill never repeats the word (B150, check_c44). */
function ConfirmPill({ a, about, value }: { a: Answer; about: string; value?: string }) {
  if (fromFirm(a)) return <Pill tone="ok" title="Filled from the representative of record's firm record (Sample). It changes in the firm record, not on the case."><Check className="size-3" aria-hidden />From the firm record</Pill>;
  // P-242, P-411: every answer fills the forms at once; the pill says who gave it and whether it is still to confirm.
  // C6.18 (P-244): a background answer staff recorded waits for the client, whatever the officer did with it.
  if (a.awaits_client) return <Pill tone="warn" title={a.why}>Waits for the client</Pill>;
  const tone = a.status === "VERIFIED" ? "ok" : a.confirmed ? "info" : "warn";
  // C6.13 (break M1): after Make principal the client answered for this adult, so the words name the client.
  const text = a.status === "VERIFIED" ? "Confirmed" : a.mark === "by_principal" ? `Answered by the ${/^Answered by the client/.test(a.why) ? "client" : "principal"} for ${about}` : a.mark === "by_staff" ? "Entered by staff · to confirm" : a.confirmed ? "Declared" : "Declared · to confirm";
  if (text === "Declared" && value === "Declared") return null;
  return <Pill tone={tone} title={a.why}>{tone === "warn" ? null : <Check className="size-3" aria-hidden />}{text}</Pill>;
}
/** C6.18 (P-244): "Officer" on a background answer staff recorded (by phone or in person): who, when, and what follows. */
function OfficerPill({ a }: { a: Answer }) {
  if (!a.officer) return null;
  const again = a.channel === "client_reconfirm" ? a.at : a.answered?.channel === "client_reconfirm" ? a.answered.at : null;
  const title = `Recorded by ${WHO[a.officer.by] ?? "a member of staff"} on ${when(a.officer.at)}, as the client told them. ${a.awaits_client ? "Background answers are the client's: it is on the draft forms now, and nothing is printed or signed until the client re-confirms it." : again ? `The client re-confirmed it on ${when(again)}.` : "The client re-confirmed it."}`;
  return <Pill tone="info" title={title}>Officer</Pill>;
}
const CHANNEL: Record<string, string> = { own_link: "their own link", questionnaire: "questionnaire", agent_view: "Agent view", client_reconfirm: "re-confirmed by the client", confirm_section: "confirmed section", firm_record: "firm record", [LINKED_FILE]: "employer case",
  // C6.5 (BIC-05): a value used from a document, and an answer checked against one.
  document_read: "read from a document", checked_against_document: "checked against a document", earlier_case: "earlier case, re-confirmed" };
/** C1.3: when the value was copied from the employer case (itself, or the answer a confirmation confirmed). */
const linkedAt = (a: Answer) => a.channel === LINKED_FILE ? a.at : a.answered?.channel === LINKED_FILE ? a.answered.at : null;
/** C6.16: an answer saved on a person's own link names them by their role in the case ("person:<subject id>"). */
export const WHO: Record<string, string> = new Proxy<Record<string, string>>({ "user-O": "Case officer", "user-R": "Representative", "user-T": "Second representative", "user-S": "Solo representative", "user-P": "Client A", "user-Q": "Client B" },
  { get: (names, k) => (typeof k === "string" ? names[k] ?? (k.startsWith("person:") ? "the person, on their own link" : undefined) : undefined) });
const when = (at: string) => new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function AgentView({ view }: { view: View }) {
  const [editing, setEditing] = React.useState<{ subjectId: string; fact: string; row?: string } | null>(null);
  const opener = React.useRef<HTMLElement | null>(null);
  const openEdit = (q: Question, row?: string) => { opener.current = document.activeElement as HTMLElement | null; setEditing({ subjectId: q.subjectId, fact: q.fact, row }); };
  const closeEdit = () => { setEditing(null); requestAnimationFrame(() => opener.current?.focus()); };
  // The dialog reads the question from the current view, so a newer answer (after a 409) is what it shows.
  const editQ = editing ? view.sections.flatMap((s) => s.questions).find((q) => q.subjectId === editing.subjectId && q.fact === editing.fact) : undefined;
  const people = [...new Map(view.sections.map((s) => [s.subjectId, s.about_label])).entries()];
  // One person at a time (one row of tabs): a household's answers are long; each person's sections stay together.
  const [who, setWho] = React.useState(() => people[0]?.[0] ?? "");
  // C6.4 (a): a link to a person's question (#a-<subject>-<fact>, the Documents panel's "Answer first") opens that person's
  // tab, then brings the question into view and focuses it; otherwise the question is not on the page and the link leads nowhere.
  const ids = people.map(([id]) => id).join(" ");
  React.useEffect(() => {
    const go = () => {
      const target = window.location.hash.slice(1);
      // QA-417: the household line's link to a person's tab (#tab-<subject>) opens that tab and brings the tabs into view.
      const t = /^tab-(.+)$/.exec(target);
      if (t) {
        let to = ""; try { to = decodeURIComponent(t[1]); } catch { return; }
        if (!ids.split(" ").includes(to)) return;
        setWho(to);
        requestAnimationFrame(() => requestAnimationFrame(() => { const el = document.querySelector<HTMLElement>(`[data-tab="${CSS.escape(to)}"]`); el?.scrollIntoView({ block: "start" }); el?.focus(); window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search); }));
        return;
      }
      const m = /^a-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-/i.exec(target);
      if (!m || !ids.split(" ").includes(m[1])) return;
      setWho(m[1]);
      // Break m5: the address is cleared once used, so a later render (a person added) does not jump back to this tab.
      requestAnimationFrame(() => requestAnimationFrame(() => { const el = document.getElementById(target); el?.scrollIntoView({ block: "center" }); el?.focus(); window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search); }));
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, [ids]);
  const mine = view.sections.filter((s) => s.subjectId === who);
  const toConfirm = new Map(toConfirmByTab(view).map((t) => [t.id, t.n])); // QA-417: each tab's "N to confirm"
  return (
    <div className="space-y-4">
      <Tabs value={who} onValueChange={setWho}>
        <TabsList aria-label="Whose answers" className="h-auto flex-wrap">
          {people.map(([id, label]) => { const m = view.sections.filter((s) => s.subjectId === id).reduce((n, s) => n + s.missing.length, 0), c = toConfirm.get(id) ?? 0; return <TabsTrigger key={id} value={id} data-tab={id} className="h-auto max-w-full scroll-mt-4 whitespace-normal text-left [overflow-wrap:anywhere]" title={`${m ? `${m} required question(s) not answered` : "Every required question answered"}; ${c ? `${c} answer${c === 1 ? "" : "s"} to confirm (Confirm section)` : "nothing to confirm"}`}>{label}{c ? <span className="ml-1.5 text-[11px] text-text-muted" data-tab-to-confirm={c}>{c} to confirm</span> : null}{m ? <span className="ml-1.5 text-[11px] text-text-muted">{m} missing</span> : null}</TabsTrigger>; })}
        </TabsList>
    <TabsContent value={who} className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <nav aria-label="Sections" className="hidden lg:block">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1 text-[13px]">
          {mine.map((s) => (
            <a key={s.section} href={`#s-${who}-${s.section}`} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-text/5">
              <span className="truncate" title={s.title}>{s.title}</span>
              {s.missing.length ? <span className="text-[11px] text-text-muted" title={`${s.missing.length} required question(s) not answered`}>{s.missing.length}</span> : <Check className="size-3 text-text-ok" aria-label="Every required question answered" />}
            </a>
          ))}
        </div>
      </nav>
      <div className="min-w-0 space-y-4">
        <p className="text-[13px] text-text-muted">Click Edit on any answer to change it. A change updates every form that uses it, with a message, and needs the section confirmed again.</p>
        {view.checks.filter((c) => c.subjectId === who && !c.section).map((c) => <Notice key={c.id} tone="warn" title="Check">{c.message}</Notice>)}
        <HouseholdReads view={view} subjectId={who} words={{ who: WHO, when, shown }} onChange={(to, fact) => { setWho(to); requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(lineId(to, fact))?.focus())); }} />
        {mine.map((s) => <AgentSection key={`${s.subjectId}|${s.section}`} view={view} s={s} edit={openEdit} />)}
      </div>
    </TabsContent>
      </Tabs>
      {editing && editQ ? <EditDialog caseId={view.case.id} q={editQ} row={editing.row} close={closeEdit} /> : null}
    </div>
  );
}

/** The id of one answer's line in the officer's section, the target of its error summary link. */
export const lineId = (subjectId: string, fact: string, row?: string) => `a-${subjectId}-${fact.replace(/[^a-z0-9_]/gi, "-")}${row ? `-${row}` : ""}`;

function AgentSection({ view, s, edit }: { view: View; s: Section; edit: (q: Question, row?: string) => void }) {
  const qc = useQueryClient(), toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const single = s.questions.filter((q) => !q.group), grouped = s.questions.filter((q) => q.group);
  const rows = grouped[0]?.rows ?? [];
  // The group's "none apply" is reviewed and confirmed with the section's answers.
  // With entries, the group's earlier answer is not shown, so it is not sent as seen (review m6).
  const shownGroup = s.group && s.group.rows === 0 ? s.group.none_apply : null;
  // C7.7: firm-record answers are never sent as seen (they are not the case's to confirm).
  // B155 (break m2 on #1367): only the cells an entry shows (inEntry) are sent as seen: a hidden answer is never confirmed unseen.
  const shownAnswers = (q: Question) => (q.group ? q.rows.filter((r) => inEntry(q, r.row, grouped)).map((r) => r.answer) : [q.answer]);
  const seen = [...s.questions.flatMap(shownAnswers).filter((a) => !fromFirm(a)).map((a) => a?.id), shownGroup?.id].filter((x): x is string => !!x);
  // Review m2 on #1246: an answer waiting for the client is not the officer's to confirm, so it never makes this the main action.
  const open = [...s.questions.flatMap(shownAnswers), shownGroup].filter((a) => a && a.status !== "VERIFIED" && !a.awaits_client).length;
  const refresh = () => qc.invalidateQueries({ queryKey: ["runtime", "view", view.case.id] });
  const checks = view.checks.filter((c) => c.subjectId === s.subjectId && c.section === s.section);
  // QA-417 (rehearsal §4): a section with no answer for the officer to confirm says so in words beside its (disabled)
  // button, never a silent dead button. Review m1: "no answer yet" only when none is given (firm-record answers are given
  // and confirmed, and never sent as seen).
  const noneToSend = !seen.length;
  async function confirm() {
    setBusy(true);
    try {
      const r = await api<{ confirmed: number; missing: string[]; awaiting_client?: number }>(`/runtime/cases/${view.case.id}/sections/${s.section}/confirm`, { method: "POST", json: { subjectId: s.subjectId, seen } });
      // QA-417: the server's reply decides the words (the page may not have its latest answers yet); with none confirmed
      // it says "nothing to confirm", and "confirmed already" never beside answers that wait for the client (review m2).
      toast.push({ tone: checks.length || !r.confirmed ? "info" : "ok", text: `${s.title} for ${inSentence(s.about_label)}: ${r.confirmed ? `${r.confirmed} answer${r.confirmed === 1 ? "" : "s"} confirmed.` : `nothing to confirm.${r.awaiting_client ? "" : " Every answer here is confirmed already."}`}${r.awaiting_client ? ` ${r.awaiting_client} recorded by staff wait${r.awaiting_client === 1 ? "s" : ""} for the client to re-confirm.` : ""}${r.missing.length ? ` Still unanswered: ${r.missing.length}.` : ""}${checks.length ? ` ${checks.length} check${checks.length === 1 ? "" : "s"} still open: ${checks.map((c) => c.message).join(" ")}` : ""}` });
    } catch (e) { toast.push({ tone: "danger", text: refusal(e) }); }
    await refresh();
    setBusy(false);
  }
  const [adding, setAdding] = React.useState(false);
  async function addRow() { if (adding) return; setAdding(true); try { await api(`/runtime/cases/${view.case.id}/groups/${s.subjectId}/rows`, { method: "POST", json: { group: s.section } }); await refresh(); } catch (e) { toast.push({ tone: "danger", text: refusal(e) }); } setAdding(false); }
  const line = (q: Question, row?: string) => {
    const a = cellAnswer(q, row);
    if (q.hidden) return (
      <div key={keyOf(q, row)} className="grid gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 first:border-t-0 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <div className="text-[13px] text-text-muted">{q.label}</div>
        <div className="text-[13px] text-text-muted">Not asked now: a rule hides it.{a ? " The earlier answer is kept and not used." : ""}</div>
      </div>
    );
    return (
      <div key={keyOf(q, row)} id={lineId(s.subjectId, q.fact, row)} tabIndex={-1} className="grid scroll-mt-4 gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 outline-none first:border-t-0 focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]">
        <div className="text-[13px] text-text-muted">{q.label}{q.required || /\(optional\)\s*$/i.test(q.label) ? null : <span> (optional)</span>}<ScopeTag q={q} /></div>
        <div className="min-w-0 text-sm">
          {a ? (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="min-w-0 font-medium [overflow-wrap:anywhere]">{shown(q, a.value)}</span><ConfirmPill a={a} about={q.about_label} value={String(shown(q, a.value))} /><OfficerPill a={a} />{linkedAt(a) ? <EmployerCaseSource at={linkedAt(a)!} label={view.case.employer_link?.linked?.label} /> : null}</div>
              <p className="text-xs text-text-muted">{a.answered ? `${CHANNEL[a.answered.channel] ?? "answered"} · ${WHO[a.answered.by] ?? "someone"} · ${when(a.answered.at)} · confirmed by ${WHO[a.by] ?? "someone"} ${when(a.at)}` : `${CHANNEL[a.channel] ?? "answered"} · ${WHO[a.by] ?? "someone"} · ${when(a.at)}`}{a.copied_from ? ` · copied from ${a.copied_from.reference}, re-confirmed by ${WHO[a.copied_from.by] ?? "someone"} ${when(a.copied_from.at)}` : null}{q.fills.length ? <> · <span title={q.fills.map((f) => `${f.form} for ${f.person}`).join("\n")}>fills {fillsText(q.fills)}</span></> : null}</p>
              {a.problems.map((p, i) => <p key={i} className="flex items-start gap-1 text-xs font-medium text-text-danger"><AlertCircle className="mt-0.5 size-3 shrink-0" aria-hidden />{p}</p>)}
              {row ? null : checks.filter((c) => c.fact === q.fact).map((c) => <p key={c.id} className="flex items-start gap-1 text-xs font-medium text-text-warn"><AlertCircle className="mt-0.5 size-3 shrink-0" aria-hidden />{c.message}</p>)}
            </>
          ) : <span className="text-text-muted">{q.required ? "Not answered" : "Not answered (optional)"}{aboutRepresentative(q) ? " · not filled from the firm record" : q.collected_from !== "client_questionnaire" ? " · the officer enters this from a document or record" : ""}</span>}
          {q.note ? <p className="text-xs text-text-warn">{q.note}</p> : null}
        </div>
        {kindOf(q) === "declaration" ? <p className="max-w-40 text-xs text-text-muted">Only the client makes this declaration</p> : fromFirm(a) ? <p className="max-w-40 text-xs text-text-muted">{q.fact === "case.uses_representative" ? "Set by the case team (the representative of record)" : "Change it in the firm record"}</p> : aboutRepresentative(q) ? <p className="max-w-40 text-xs text-text-muted">Only the firm record fills this; it is not added on a case</p> : <div><Button size="sm" variant="ghost" onClick={() => edit(q, row)} aria-label={`${a ? "Edit" : "Add"} ${q.label}${row ? ` (entry ${(q.rows.find((r) => r.row === row)?.index ?? 0) + 1})` : ""} for ${inSentence(s.about_label)}`}><Pencil aria-hidden />{a ? "Edit" : "Add"}</Button></div>}
      </div>
    );
  };
  return (
    <section id={`s-${s.subjectId}-${s.section}`} aria-labelledby={`h-${s.subjectId}-${s.section}`} className="scroll-mt-4 overflow-hidden rounded-xl border border-border bg-surface-raised">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3">
        <h2 id={`h-${s.subjectId}-${s.section}`} className="text-base font-semibold">{s.title}</h2>
        {/* B155: a list's section ("Brothers and sisters") is already named by its tab ("…'s brothers and sisters"): no "for" twice. */}
        {s.about_label.toLowerCase().endsWith(s.title.toLowerCase()) ? null : <span className="text-[13px] text-text-muted">{s.about_label === "The application" ? "once for the application" : `for ${inSentence(s.about_label)}`}</span>}
        <span className="flex flex-wrap gap-1.5">
          {/* QA-301 (B150): a declared answer is never counted as "confirmed"; the pill says what is still on the Confirm list. */}
          <Pill title="Answers given (each fills the forms at once), and how many still wait for the officer's Confirm section">{s.answered} answered · {s.answered - s.confirmed} to confirm</Pill>
          {s.missing.length ? <Pill tone="warn" title={`Required and not answered: ${s.missing.join("; ")}`}>{s.missing.length} missing</Pill> : null}
          {s.invalid ? <Pill tone="danger" title="Answers that do not pass their checks">{s.invalid} to fix</Pill> : null}
          {checks.length ? <Pill tone="warn" title={checks.map((c) => c.message).join(" ")}>{checks.length} to check</Pill> : null}
        </span>
        <span className="flex-1" />
        {/* C6.5 part 2b: "Fill this from documents" (documents-drawer.tsx), staff only (the Agent view). */}
        <DocumentsButton view={view} s={s} />
        {noneToSend ? <span className="text-[13px] text-text-muted" data-nothing-to-confirm>{s.answered ? "Nothing to confirm: every answer here is confirmed already" : "Nothing to confirm: no answer yet"}</span> : null}
        <Button size="sm" variant={open > 0 ? "default" : "secondary"} disabled={noneToSend} busy={busy} onClick={() => void confirm()} title={noneToSend ? "Nothing to confirm in this section" : "Confirm the answers shown in this section; an answer that changed since you looked is refused, never confirmed unseen"}>
          <Check aria-hidden />Confirm section
        </Button>
      </header>
      {s.questions.some((q) => q.background) ? <p className="border-b border-border px-4 py-2 text-[13px] text-text-muted" data-background-note>Background answers are the client's. One you record (by phone or in person) is marked <b className="font-medium text-text">Officer</b> and waits for the client to re-confirm it before signing; Confirm section does not confirm it.</p> : null}
      {/* P-47 tier 2 (C4.4 part 2): the section's error summary, GOV.UK pattern: each answer to fix and each fired check, linked to its line. */}
      {(s.problems ?? []).length ? (
        <div className="border-b border-border px-4 py-2" data-section-summary>
          <Notice tone={s.problems.some((p) => p.kind === "field") ? "danger" : "warn"} title={`${checks.length ? "Check before confirming" : "Answers to fix"}${checks.some((c) => c.illustrative) ? " (Sample check)" : ""}`}>
            <ul className="space-y-0.5">{s.problems.map((p, i) => (
              <li key={i}><a className="text-text-link underline" href={`#${lineId(s.subjectId, p.field, p.row ?? undefined)}`} onClick={(e) => { e.preventDefault(); const el = document.getElementById(lineId(s.subjectId, p.field, p.row ?? undefined)); el?.scrollIntoView({ block: "center" }); el?.focus(); }}>{p.label}</a>: {p.message}</li>
            ))}</ul>
          </Notice>
        </div>
      ) : null}
      <div>{single.map((q) => line(q))}</div>
      {grouped.length ? (
        <div className="space-y-2 border-t border-border bg-surface/60 px-4 py-3">
          <GroupIntro questions={grouped} />
          <NoneApply caseId={view.case.id} s={s} compact onAdd={() => void addRow()} adding={adding} />
          {rows.map((r) => (
            <div key={r.row} className="mb-3 overflow-hidden rounded-lg border border-border bg-surface-raised">
              <p className="flex items-center gap-2 border-b border-border px-4 py-1.5 text-xs font-medium">Entry {r.index + 1}{!r.fits ? <Pill tone="warn" title={`The form has room for ${grouped[0].capacity} entries`}>Does not fit on the form</Pill> : null}</p>
              {grouped.filter((q) => inEntry(q, r.row, grouped)).map((q) => line(q, r.row))}
            </div>
          ))}
          {rows.length ? <Button size="sm" variant="secondary" busy={adding} onClick={() => void addRow()}><Plus aria-hidden />Add another</Button> : null}
        </div>
      ) : null}
    </section>
  );
}

function EditDialog({ caseId, q, row, close }: { caseId: string; q: Question; row?: string; close: () => void }) {
  const qc = useQueryClient(), toast = useToast();
  const cells = React.useMemo((): Cell[] => [{ q, row }], [q, row]);
  const d = useDrafts(cells);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const a = cellAnswer(q, row);
  async function save() {
    const value = toValue(kindOf(q), d.get(q, row));
    if (value === undefined) { setError("Give an answer; an answer can be changed but not cleared."); return; }
    setBusy(true);
    try {
      const r = await putAnswer(caseId, q, value, row);
      toast.push({ tone: "ok", text: `${r.message}${a?.status === "VERIFIED" ? " Confirm the section again." : ""}` });
      await qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
      close();
    } catch (e) {
      setError(refusal(e));
      if (e instanceof ApiError && e.status === 409) { await qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] }); d.reset(); }
    }
    setBusy(false);
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={`${a ? "Change" : "Add"}: ${q.label}`} description={`${q.about_label}${row ? ` · entry ${(q.rows.find((r) => r.row === row)?.index ?? 0) + 1}` : ""}${q.fills.length ? ` · fills ${fillsText(q.fills, true)}` : ""}`}
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={busy} onClick={() => void save()}>Save</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <QuestionField q={q} idBase="edit-field" draft={d.get(q, row)} onChange={(v) => { d.set(q, row, v); setError(null); }} errors={error ? [error] : a?.problems ?? []} compact officer />
        {a ? <p className="mt-3 text-xs text-text-muted">Now: {shown(q, a.value)} ({a.why}).</p> : null}
        {q.background ? <Notice tone="info" className="mt-3" title="The client's background answer">Record only what the client told you (by phone or in person). It is marked Officer with your name and the time. It is on the draft forms at once, and nothing is printed or signed until the client re-confirms it.</Notice> : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

// ------------------------------------------------------------------ S5 Preview (one Sample family, never saved)

/** One person's questionnaire of a Sample family, from the runtime's own case view (engine/runtime/preview.ts): what the
 *  client sees, with the same fields (typing tries them; nothing is kept). Early-look fix 4: one section open at a time,
 *  with a jump list of every section and its question count, so the phone column stays one screen long. */
export function PreviewQuestions({ view, person }: { view: QuestionnaireView; person: string }) {
  const [drafts, setDrafts] = React.useState<Record<string, unknown>>({});
  const parts = view.sections.filter((s) => s.subjectId === person || (person === "principal" && s.subjectId === "case"));
  const keyOfPart = (s: (typeof parts)[number]) => `${s.subjectId}|${s.section}`;
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const open = parts.find((s) => keyOfPart(s) === openKey) ?? parts[0];
  if (!parts.length) return <Notice tone="info" title="Nothing to ask">This person answers nothing in the Client questionnaire for this family.</Notice>;
  const asked = (s: (typeof parts)[number]) => s.questions.filter((q) => !q.hidden);
  // Drift check 4: a section asked once for the application and again about the person shares its title; the name then
  // says whom each is about, so the jump list never shows the same name twice.
  const twice = new Set(parts.map((s) => s.title).filter((t, i, all) => all.indexOf(t) !== i));
  const nameOf = (s: (typeof parts)[number]) => (twice.has(s.title) ? `${s.title} (${inSentence(s.subjectId === "case" ? "The application" : s.about_label).replace(/ \(Sample\)$/, "")})` : s.title);
  return (
    <div className="space-y-3" data-preview-questions>
      <nav aria-label="Sections" className="flex flex-wrap gap-1.5" data-section-jump>
        {parts.map((s, i) => <button key={keyOfPart(s)} type="button" aria-current={s === open ? "true" : undefined} onClick={() => setOpenKey(keyOfPart(s))}
          className={cn("rounded-full border px-2.5 py-1 text-xs", s === open ? "border-primary bg-primary/10 font-medium text-text-link" : "border-border bg-surface-raised text-text-muted hover:bg-text/5")}>{i + 1}. {nameOf(s)} · {asked(s).length}</button>)}
      </nav>
      {(() => {
        const s = open, list = asked(s), single = list.filter((q) => !q.group), grouped = list.filter((q) => q.group);
        const at = parts.indexOf(s);
        return (
          <section key={keyOfPart(s)} aria-labelledby={`pv-${s.subjectId}-${s.section}`} className="overflow-hidden rounded-xl border border-border bg-surface-raised" data-preview-section={s.section}>
            <header className="border-b border-border px-4 py-2.5">
              <h3 id={`pv-${s.subjectId}-${s.section}`} className="text-sm font-semibold">{nameOf(s)}</h3>
              <p className="text-xs text-text-muted">Section {at + 1} of {parts.length} · {s.about_label === "The application" ? "once for the application" : `for ${inSentence(s.about_label)}`} · {list.length} question{list.length === 1 ? "" : "s"}{s.questions.length > list.length ? ` · ${s.questions.length - list.length} hidden by a rule` : ""}</p>
            </header>
            <div className="space-y-3 px-4 py-3">
              {single.map((q) => <QuestionField key={q.fact} q={q} draft={drafts[keyOf(q)]} onChange={(d) => setDrafts((x) => ({ ...x, [keyOf(q)]: d }))} errors={[]} idBase={`pv-${s.subjectId}-${q.fact}`} compact />)}
              {grouped.length ? <div className="rounded-lg border border-dashed border-border px-3 py-2 text-[13px]"><p className="font-medium">{groupLabel(s.title)}</p><p className="text-xs text-text-muted">Each entry asks: {grouped.map((q) => q.label).join(", ")}</p><p className="mt-1 text-xs text-text-muted">The client adds entries here, or says none apply.</p></div> : null}
            </div>
            <footer className="flex justify-between border-t border-border px-4 py-2 text-xs">
              <button type="button" className="text-text-link underline disabled:no-underline disabled:text-text-muted" disabled={at === 0} onClick={() => setOpenKey(keyOfPart(parts[at - 1]))}>Previous section</button>
              <button type="button" className="text-text-link underline disabled:no-underline disabled:text-text-muted" disabled={at === parts.length - 1} onClick={() => setOpenKey(keyOfPart(parts[at + 1]))}>Next section</button>
            </footer>
          </section>
        );
      })()}
      <p className="text-center text-xs text-text-muted">Only questions the client fills. Typing here tries the fields; nothing is saved.</p>
    </div>
  );
}
