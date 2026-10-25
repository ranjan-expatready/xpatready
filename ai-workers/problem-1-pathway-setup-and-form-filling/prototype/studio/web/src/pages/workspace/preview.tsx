// Screen 03 Preview by person (S1, BR-15, P-37, P-47): choose a Sample family, tweak the yes/no answers that decide what
// applies, pick a person, and see their questionnaire (the runtime's renderer, read-only), documents and forms, each
// saying why. The family, person, mode and tweaks live in the address, so a view can be shared and Back works. One
// request per view: GET /combinations/:id/workspace?tab=preview&family=&person=&mode=&tweaks=.
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import type { PreviewView } from "../../../../contracts/workspace";
import { PreviewQuestions } from "@/runtime/questionnaire";
import { Notice, Pill, Table } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

export function usePreviewParams() {
  const [sp] = useSearchParams();
  return { family: sp.get("family") ?? "", person: sp.get("person") ?? "", mode: sp.get("mode") === "agent" ? "agent" : "sqr", tweaks: sp.get("tweaks") ?? "", release: sp.get("release") === "1" ? "1" : "" };
}

const chip = (on: boolean) => cn("min-h-9 rounded-full border px-3 py-1 text-sm", on ? "border-primary bg-primary/10 font-medium text-text-link" : "border-border bg-surface-raised text-text-muted hover:bg-text/5");

export function PreviewTab({ p, empty, fetching, studio }: { p: PreviewView | null; empty: string | null; fetching: boolean; studio?: React.ReactNode }) {
  const [sp, setSp] = useSearchParams();
  const set = (k: string, v: string | null) => { const n = new URLSearchParams(sp); if (v === null || v === "") n.delete(k); else n.set(k, v); setSp(n, { replace: true }); };
  if (!p) return <div className="rounded-xl border border-border bg-surface-raised p-5"><h2 className="font-semibold">Nothing to preview yet</h2><p className="mt-1 text-sm text-text-muted">{empty}</p></div>;
  const tweaks = (() => { try { return JSON.parse(sp.get("tweaks") ?? "{}") as Record<string, boolean>; } catch { return {}; } })();
  const setTweak = (key: string, v: boolean | null) => { const t = { ...tweaks }; if (v === null) delete t[key]; else t[key] = v; set("tweaks", Object.keys(t).length ? JSON.stringify(t) : null); };
  const who = p.people.find((x) => x.subjectId === p.person) ?? p.people[0];
  // The person's own deciding answers (and the application's, with the principal applicant who answers them).
  const mineTweaks = p.tweaks.filter((t) => t.subjectId === who.subjectId || (who.subjectId === "principal" && t.subjectId === "case"));
  return (
    <div className="space-y-4" aria-busy={fetching || undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-muted">Sample family</span>
        <div role="radiogroup" aria-label="Sample family" className="flex flex-wrap gap-1.5">
          {p.families.map((f) => <button key={f.key} type="button" role="radio" aria-checked={p.family === f.key} className={chip(p.family === f.key)} onClick={() => { const n = new URLSearchParams(sp); n.set("family", f.key); n.delete("person"); n.delete("tweaks"); setSp(n, { replace: true }); }}>{f.label}</button>)}
        </div>
        <span className="flex-1" />
        <span className="text-xs text-text-muted">{p.label} · Sample people, never saved</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-muted">Person</span>
        <div role="group" aria-label="Person" className="flex flex-wrap gap-1.5">
          {p.people.map((x) => <button key={x.subjectId} type="button" aria-pressed={x.subjectId === who.subjectId} className={chip(x.subjectId === who.subjectId)} onClick={() => set("person", x.subjectId)}>{x.label} · {x.questions} question{x.questions === 1 ? "" : "s"} · {x.documents} document{x.documents === 1 ? "" : "s"} · {x.forms} form{x.forms === 1 ? "" : "s"}</button>)}
        </div>
      </div>
      {mineTweaks.length ? (
        <fieldset className="rounded-xl border border-border bg-surface-raised px-4 py-3">
          <legend className="px-1 text-sm font-medium">Answers that decide what applies for {who.label}</legend>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
            {mineTweaks.map((t) => (
              <label key={t.key} className="flex items-center gap-2 text-sm">
                <span>{t.label} <span className="text-text-muted">({t.about})</span></span>
                <select className="h-8 rounded-md border border-border-strong bg-surface-raised px-2 text-sm" value={t.value === null ? "" : String(t.value)} onChange={(e) => setTweak(t.key, e.target.value === "" ? null : e.target.value === "true")} aria-label={`${t.label} for ${t.about}`}>
                  <option value="">Not answered</option><option value="true">Yes</option><option value="false">No</option>
                </select>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className={cn("grid items-start gap-4", p.mode === "sqr" ? "lg:grid-cols-2 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]")}>
        <section aria-labelledby="pv-q" className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="pv-q" className="font-semibold">{p.mode === "sqr" ? "What the client sees" : "Facts and the form fields they fill"}</h2>
            <span className="flex-1" />
            <button type="button" className="text-sm text-text-link underline" onClick={() => set("mode", p.mode === "sqr" ? "agent" : null)}>{p.mode === "sqr" ? "Show facts and the form fields they fill" : "Show what the client sees"}</button>
          </div>
          <div className={cn(p.mode === "sqr" && "rounded-[1.75rem] border-8 border-text/80 bg-surface p-3")}><PreviewQuestions view={p.questionnaire} person={who.subjectId} /></div>
        </section>
        <div className={cn(p.mode === "agent" ? "space-y-4" : "contents")}>
        <section aria-labelledby="pv-d" className="rounded-xl border border-border bg-surface-raised p-4">
          <h2 id="pv-d" className="font-semibold">Documents for {who.label} ({p.documents.length})</h2>
          {!p.documents.length ? <p className="mt-2 text-sm text-text-muted">No document is needed from this person for this family.</p> : (
            <ul className="mt-2 space-y-2 text-sm">{p.documents.map((d, i) => <li key={i}><span className="font-medium">{d.requirement}</span>{d.status === "Cannot tell yet" ? <Pill tone="warn" className="ml-1.5">Cannot tell yet</Pill> : null}<br /><span className="text-xs text-text-muted">because {d.why || "this combination asks for it"}</span></li>)}</ul>
          )}
        </section>
        <section aria-labelledby="pv-f" className="rounded-xl border border-border bg-surface-raised p-4">
          <h2 id="pv-f" className="font-semibold">Forms for {who.label} ({p.forms.length})</h2>
          {!p.forms.length ? <p className="mt-2 text-sm text-text-muted">No form applies to this person for this family.</p> : (
            <Table className="mt-2" dense head={["Form", "Filed as", "Why"]}>{p.forms.map((f) => <tr key={f.form}><td><span className="mono font-medium">{f.form}</span><br /><span className="text-xs text-text-muted">{f.title}</span></td><td><Pill tone={f.channel === "ONLINE" ? "ai" : f.channel === "SIGNED_PDF_UPLOAD" ? "warn" : "neutral"}>{f.channelWords}</Pill>{f.applies === "cannot_tell" ? <Pill tone="warn" className="ml-1">Cannot tell yet</Pill> : null}</td><td className="text-xs text-text-muted">{f.why}</td></tr>)}</Table>
          )}
          <p className="mt-2 text-xs text-text-muted">Every form field's coverage and a Sample filled PDF: {studio}. Portal sheets come with the runtime (M3).</p>
        </section>
        </div>
      </div>
      {p.questionnaire.summary.not_asked ? <Notice tone="info">{p.questionnaire.summary.not_asked} question{p.questionnaire.summary.not_asked === 1 ? " is" : "s are"} placed in a selected section but not asked of this family: no form reads them and they decide nothing.</Notice> : null}
    </div>
  );
}
