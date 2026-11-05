// S5 Preview (walkthrough v2 S5: "one sample family, person chips, three columns"): pick a Sample family and a person,
// and see what the client is asked (the runtime's own renderer, read-only), the documents and the forms, each saying why.
// M2 item 4 (C4.3, C4.6): per person, the three sets (pre-qualification; what the client is asked once documents fill
// theirs; the case officer's view, each answer with its source) and the forms grouped by how each is filed.
// The answers that change what applies can be tried. Family, person and tried answers live in the address, so a view can
// be shared and Back works. One request per view: GET /combinations/:id/workspace?tab=preview&family=&person=&tweaks=.
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { OUTPUT_GROUPS, type PreviewForm, type PreviewView } from "../../../../contracts/workspace";
import { ONLINE_LATER_WAVE } from "../../../../contracts/runtime";

import { PreviewQuestions } from "@/runtime/questionnaire";
import { Notice, Pill } from "@/components/ui/controls";
import { cn } from "@/lib/utils";
import { questionsWords } from "../../../../contracts/counts";

/** C4.6: the preview's extra words per form (engine/runtime/preview.ts outputOf); optional, so an older response reads. */
type FormOut = PreviewForm & { signature?: string; signatureWords?: string; toSign?: boolean; laterWave?: string | null; checklist?: boolean };
/** C4.6 (P-62 §7): what one person gets, counted per channel, in words: "2 filled PDFs to upload · 1 to sign by hand". */
export function outputsLine(forms: FormOut[]): string {
  const n = (k: (f: FormOut) => boolean) => forms.filter(k).length;
  const say = (c: number, one: string, many: string) => (c ? `${c} ${c === 1 ? one : many}` : "");
  return [
    say(n((f) => !f.checklist && f.channel === "ONLINE"), "filled on the portal (later wave)", "filled on the portal (later wave)"),
    say(n((f) => !f.checklist && f.channel === "PDF_UPLOAD"), "filled PDF to upload", "filled PDFs to upload"),
    say(n((f) => !f.checklist && f.channel === "PAPER"), "PDF to print, sign in pen and mail", "PDFs to print, sign in pen and mail"),
    // Review m2: a Paper line is already "sign in pen"; this counts only the uploads a person signs by hand.
    say(n((f) => !!f.toSign && f.channel !== "PAPER"), "PDF to sign by hand and scan", "PDFs to sign by hand and scan"),
    say(n((f) => !f.checklist && f.channel === "NOT_NEEDED"), "asked by the IRCC account itself", "asked by the IRCC account itself"),
    say(n((f) => !!f.checklist), "document checklist (read, not filed)", "document checklists (read, not filed)"),
].filter(Boolean).join(" · ");
}

export function usePreviewParams() {
  const [sp] = useSearchParams();
  return { family: sp.get("family") ?? "", person: sp.get("person") ?? "", tweaks: sp.get("tweaks") ?? "", release: sp.get("release") === "1" ? "1" : "" };
}

/** C4.3 (board v2 frame 4): the three sets for one person, side by side from 1280 px, one at a time with a switch below. */
const SETS = [
  { key: "pqr", title: (p: PreviewView) => `Prospect questionnaire (PQR) · ${p.sets.pqr.length}` },
  // UX-A part 1 (contracts/counts.ts): "asked" is part of the person's questions (the SQR tab's chip), said as such.
  { key: "sqr", title: (p: PreviewView) => `Client questionnaire · ${p.sets.sqr.asked} of ${questionsWords(p.sets.agent.questions)}` },
  { key: "agent", title: (p: PreviewView) => `Agent view · ${p.sets.agent.questions}` },
] as const;
type SetKey = (typeof SETS)[number]["key"];

const chip = (on: boolean) => cn("min-h-9 rounded-full border px-3 py-1 text-sm", on ? "border-primary bg-primary/10 font-medium text-text-link" : "border-border bg-surface-raised text-text-muted hover:bg-text/5");

export function PreviewTab({ id, p, empty, fetching, hasRelease }: { id: string; p: PreviewView | null; empty: string | null; fetching: boolean; hasRelease: boolean }) {
  const [sp, setSp] = useSearchParams();
  const set = (k: string, v: string | null) => { const n = new URLSearchParams(sp); if (v === null || v === "") n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  if (!p) return <div className="rounded-xl border border-border bg-surface-raised p-5" data-preview-empty><h2 className="font-semibold">Nothing to preview yet</h2><p className="mt-1 text-sm text-text-muted">{empty}</p></div>;
  const tweaks = (() => { try { return JSON.parse(sp.get("tweaks") ?? "{}") as Record<string, boolean>; } catch { return {}; } })();
  const setTweak = (key: string, v: boolean | null) => { const t = { ...tweaks }; if (v === null) delete t[key]; else t[key] = v; set("tweaks", Object.keys(t).length ? JSON.stringify(t) : null); };
  const who = p.people.find((x) => x.subjectId === p.person) ?? p.people[0];
  const mine = p.tweaks.filter((t) => t.subjectId === who.subjectId || (who.subjectId === "principal" && t.subjectId === "case"));
  const release = sp.get("release") === "1";
  const shown: SetKey = SETS.some((x) => x.key === sp.get("set")) ? (sp.get("set") as SetKey) : "sqr";
  return (
    <div className="space-y-4" aria-busy={fetching || undefined} data-preview>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm"><span className="text-text-muted">Sample family</span>
          <select className="h-9 rounded-lg border border-border-strong bg-surface-raised px-2 text-sm" value={p.family} onChange={(e) => { const n = new URLSearchParams(sp); n.set("family", e.target.value); n.delete("person"); n.delete("tweaks"); setSp(n, { replace: true }); }}>{p.families.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select>
        </label>
        {hasRelease ? <div role="radiogroup" aria-label="Which version" className="flex gap-1"><button type="button" role="radio" aria-checked={!release} className={chip(!release)} onClick={() => set("release", null)}>Draft</button><button type="button" role="radio" aria-checked={release} className={chip(release)} onClick={() => set("release", "1")}>Released</button></div> : null}
        <span className="flex-1" />
        <span className="text-xs text-text-muted">{p.label} · Sample people, never saved · <Link className="text-text-link underline" to={`/c/${id}/preview?view=studio`}>Every form field and a Sample filled PDF</Link></span>
      </div>
      <div role="group" aria-label="Person" className="flex flex-wrap gap-1.5">
        {p.people.map((x) => <button key={x.subjectId} type="button" aria-pressed={x.subjectId === who.subjectId} className={chip(x.subjectId === who.subjectId)} onClick={() => set("person", x.subjectId)} data-person-chip={x.subjectId}>{x.label} · {x.questions} question{x.questions === 1 ? "" : "s"} · {x.documents} document{x.documents === 1 ? "" : "s"} · {x.forms} form{x.forms === 1 ? "" : "s"}</button>)}
      </div>
      {mine.length ? (
        <details className="rounded-xl border border-border bg-surface-raised px-4 py-3" open={Object.keys(tweaks).length > 0} data-tweaks>
          <summary className="cursor-pointer text-sm font-medium">Try answers that change what applies for {who.label} ({mine.length}){Object.keys(tweaks).length ? ` · ${Object.keys(tweaks).length} tried` : ""}</summary>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
            {mine.map((t) => (
              <label key={t.key} className="flex items-center gap-2 text-sm">
                <span>{t.label}{t.subjectId === "case" ? <span className="text-text-muted"> (the application)</span> : null}</span>
                <select className="h-8 rounded-md border border-border-strong bg-surface-raised px-2 text-sm" value={t.value === null ? "" : String(t.value)} onChange={(e) => setTweak(t.key, e.target.value === "" ? null : e.target.value === "true")} aria-label={`${t.label} for ${t.about}`}>
                  <option value="">Not answered</option><option value="true">Yes</option><option value="false">No</option>
                </select>
              </label>
            ))}
          </div>
        </details>
      ) : null}
      <div role="radiogroup" aria-label="Which set" className="flex flex-wrap gap-1 xl:hidden" data-set-switch>
        {SETS.map((x) => <button key={x.key} type="button" role="radio" aria-checked={shown === x.key} className={chip(shown === x.key)} onClick={() => set("set", x.key === "sqr" ? null : x.key)} data-set-button={x.key}>{x.title(p)}</button>)}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)_minmax(0,1fr)]" data-sets>
        <section aria-labelledby="pv-pqr" className={cn("rounded-xl border border-border bg-surface-raised p-4", shown !== "pqr" && "hidden xl:block")} data-set="pqr">
          <h2 id="pv-pqr" className="font-semibold">{SETS[0].title(p)}</h2>
          <p className="mt-1 text-xs text-text-muted">What a prospect is asked first, before an application starts. They confirm these answers later in the Client questionnaire; no result is shown to them.</p>
          {!p.sets.pqr.length ? <p className="mt-2 text-sm text-text-muted" data-pqr-empty>No Prospect questionnaire (PQR) question is ticked for {who.label}. Tick them on the Smart questionnaire (SQR) tab.</p> : (
            <ul className="mt-2 space-y-1.5 text-sm">{p.sets.pqr.map((q) => <li key={q.fact} className="flex flex-wrap items-center gap-1.5" data-pqr-fact={q.fact}><span>{q.label}</span><Pill tone={q.from === "Client" ? "neutral" : "info"} className="max-w-full shrink whitespace-normal [overflow-wrap:anywhere]">{q.from}</Pill></li>)}</ul>
          )}
        </section>
        <section aria-labelledby="pv-q" className={cn("space-y-2", shown !== "sqr" && "hidden xl:block")} data-set="sqr">
          <h2 id="pv-q" className="font-semibold">{SETS[1].title(p)}</h2>
          <p className="text-xs text-text-muted" data-sqr-sub>The questions {who.label} answers on the case's link; the others come from documents or the case officer, or a rule skips them for these Sample answers.</p>
          {p.sets.sqr.fromDocuments.length ? (
            <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm" data-from-documents>
              <p className="font-medium">From {who.label}'s documents</p>
              <ul className="mt-1 space-y-1">{p.sets.sqr.fromDocuments.map((d) => (
                <li key={d.document} data-from-document={d.document}>
                  <details><summary className="cursor-pointer">{d.document} fills {d.facts.length} answer{d.facts.length === 1 ? "" : "s"}</summary><p className="mt-1 text-xs text-text-muted">{d.facts.join(" · ")}</p></details>
                </li>
              ))}</ul>
              <p className="mt-1 text-xs text-text-muted">Not asked while the document is on the checklist; if it is missing or cannot be read, the question is asked instead.</p>
            </div>
          ) : null}
          {p.sets.sqr.missing.length ? (
            // C4.5 (P-130): try a document as missing or unreadable; its answers are asked instead. Preview only: at a case
            // this comes with the document reader (M3).
            <fieldset className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm" data-try-missing>
              <legend className="px-1 text-xs font-medium">Try it missing (Preview only)</legend>
              {p.sets.sqr.missing.map((m) => (
                <label key={m.key} className="flex items-center gap-2"><input type="checkbox" checked={m.marked} onChange={(e) => setTweak(m.key, e.target.checked ? true : null)} data-missing-toggle={m.key} /><span>{m.document} is missing or cannot be read</span></label>
              ))}
              {p.sets.sqr.missing.some((m) => m.marked) ? <p className="mt-1 text-xs text-text-muted" data-missing-note>Tried as missing: its answers are asked instead. At a case this comes with the document reader (M3); until then a case asks them.</p> : null}
            </fieldset>
          ) : null}
          <div className="rounded-[1.75rem] border-8 border-text/80 bg-surface p-3"><PreviewQuestions view={p.questionnaire} person={who.subjectId} /></div>
        </section>
        <section aria-labelledby="pv-agent" className={cn("rounded-xl border border-border bg-surface-raised p-4", shown !== "agent" && "hidden xl:block")} data-set="agent">
          <h2 id="pv-agent" className="font-semibold">{SETS[2].title(p)}</h2>
          <p className="mt-1 text-xs text-text-muted">Every question for {who.label} in this Sample family, with where its answer comes from. Counted as the Smart questionnaire (SQR) tab counts them; that tab reads the largest household the combination allows, so a person's number can differ with the family chosen here.</p>
          <div className="mt-2 max-h-[36rem] space-y-3 overflow-y-auto pr-1" tabIndex={0} role="region" aria-label={`Every question for ${who.label}`}>
            {p.sets.agent.sections.map((x) => (
              <div key={`${x.about}|${x.section}`} data-agent-section={x.section}>
                <h3 className="text-sm font-medium">{x.title}{x.about === "The application" ? <span className="font-normal text-text-muted"> (the application)</span> : null}</h3>
                <ul className="mt-1 space-y-1 text-sm">{x.questions.map((q) => (
                  <li key={q.fact} className="flex flex-wrap items-center gap-1.5" data-agent-fact={q.fact}>
                    <span className={q.hidden ? "text-text-muted" : undefined}>{q.label}</span>
                    {/* G5 (#868): a document's name can be long ("Passport or travel document information page photocopy"); the
                        tag wraps inside the row rather than widen the page at 400 px. */}
                    <Pill tone={q.from.startsWith("Document") ? "info" : q.from === "Case officer" ? "warn" : "neutral"} className="max-w-full shrink whitespace-normal [overflow-wrap:anywhere]">{q.from}</Pill>
                    {q.hidden ? <span className="text-xs text-text-muted">hidden by a rule for this family</span> : null}
                  </li>
                ))}</ul>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section aria-labelledby="pv-d" className="rounded-xl border border-border bg-surface-raised p-4">
          <h2 id="pv-d" className="font-semibold">Documents ({p.documents.length})</h2>
          {!p.documents.length ? <p className="mt-2 text-sm text-text-muted">No document is needed from this person for this family.</p> : (
            <ul className="mt-2 space-y-2 text-sm">{p.documents.map((d, i) => <li key={i}><span className="font-medium">{d.requirement}</span>{d.status === "Cannot tell yet" ? <Pill tone="warn" className="ml-1.5">Cannot tell yet</Pill> : null}<br /><span className="text-xs text-text-muted">because {d.why || "this combination asks for it"}</span></li>)}</ul>
          )}
        </section>
        <section aria-labelledby="pv-f" className="rounded-xl border border-border bg-surface-raised p-4">
          <h2 id="pv-f" className="font-semibold">Forms ({p.forms.length})</h2>
          <p className="mt-1 text-xs text-text-muted">What {who.label} gets, by how each form is filed.</p>
          {p.forms.length ? <p className="mt-1 text-sm" data-outputs-line><span className="font-medium">{who.label} gets:</span> {outputsLine(p.forms as FormOut[])}</p> : null}
          {!p.forms.length ? <p className="mt-2 text-sm text-text-muted">No form applies to this person for this family.</p> : OUTPUT_GROUPS.filter((g) => p.forms.some((f) => f.group === g.key)).map((g) => (
            <div key={g.key} className="mt-3" data-output-group={g.key}>
              <h3 className="text-sm font-medium">{g.title}</h3>
              {g.key === "ONLINE" ? <p className="text-xs text-text-muted" data-later-wave>{(p.forms as FormOut[]).find((f) => f.group === "ONLINE")?.laterWave ?? "Portal screens come with the browser extension in a later wave."}</p> : null}
              <ul className="mt-1 space-y-2 text-sm">{p.forms.filter((f) => f.group === g.key).map((f) => (
                <li key={f.form} data-preview-form={f.form}>
                  <span className="mono font-medium">{f.form}</span> <span className="text-text-muted">{f.title}</span>
                  <span className="ml-1.5 inline-flex gap-1">{/* C11.1 (P-102): each Online line says itself that it is a later-wave line, not only its group's heading. */}{g.key === "ONLINE" ? <span data-later-wave-pill><Pill tone="ai">{ONLINE_LATER_WAVE}</Pill></span> : null}{g.key === "APPLICATION" || g.key === "COUPLE" ? <Pill tone={f.channel === "ONLINE" ? "ai" : f.channel === "PAPER" ? "warn" : "neutral"}>{f.channel === "ONLINE" ? ONLINE_LATER_WAVE : f.channelWords}</Pill> : null}{(f as FormOut).checklist ? <Pill tone="neutral">Checklist · read, not filed</Pill> : null}{(f as FormOut).toSign ? <span data-to-sign><Pill tone="warn">{(f as FormOut).signatureWords}</Pill></span> : (f as FormOut).signatureWords && (f as FormOut).signature !== "NONE" ? <Pill tone="neutral">{(f as FormOut).signatureWords}</Pill> : null}{f.noRule ? <Pill tone="warn">Cannot tell yet: no rule</Pill> : f.applies === "cannot_tell" ? <Pill tone="warn">Cannot tell yet</Pill> : null}</span>
                  <br /><span className="text-xs text-text-muted">{f.why}</span>
                  {/* C4.6 (IRCC-P2-06, P2-09): who signs this form for this person, and how. */}
                  {f.sign ? <><br /><span className="text-xs" data-sign><span className="font-medium">Signed by:</span> {f.sign.by} · {f.sign.how}</span></> : null}
                  {/* Review Major 2: an Online line filed for the couple or the application says it too. */}
                  {g.key !== "ONLINE" && (f as FormOut).laterWave ? <><br /><span className="text-xs text-text-muted" data-later-wave-line>Online: {(f as FormOut).laterWave}</span></> : null}
                </li>
              ))}</ul>
            </div>
          ))}
        </section>
      </div>
      {p.questionnaire.summary.not_asked ? <Notice tone="info">{p.questionnaire.summary.not_asked} question{p.questionnaire.summary.not_asked === 1 ? " is" : "s are"} placed in a selected section but not asked of this family: no form reads them and they decide nothing.</Notice> : null}
    </div>
  );
}
