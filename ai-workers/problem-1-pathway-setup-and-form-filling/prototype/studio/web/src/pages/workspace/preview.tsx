// S5 Preview (walkthrough v2 S5: "one sample family, person chips, three columns"): pick a Sample family and a person,
// and see what the client is asked (the runtime's own renderer, read-only), the documents and the forms, each saying why.
// The answers that change what applies can be tried. Family, person and tried answers live in the address, so a view can
// be shared and Back works. One request per view: GET /combinations/:id/workspace?tab=preview&family=&person=&tweaks=.
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { PreviewView } from "../../../../contracts/workspace";
import { PreviewQuestions } from "@/runtime/questionnaire";
import { Notice, Pill } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

export function usePreviewParams() {
  const [sp] = useSearchParams();
  return { family: sp.get("family") ?? "", person: sp.get("person") ?? "", tweaks: sp.get("tweaks") ?? "", release: sp.get("release") === "1" ? "1" : "" };
}

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
      <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="pv-q" className="space-y-2">
          <h2 id="pv-q" className="font-semibold">What {who.label} is asked</h2>
          <div className="rounded-[1.75rem] border-8 border-text/80 bg-surface p-3"><PreviewQuestions view={p.questionnaire} person={who.subjectId} /></div>
        </section>
        <section aria-labelledby="pv-d" className="rounded-xl border border-border bg-surface-raised p-4">
          <h2 id="pv-d" className="font-semibold">Documents ({p.documents.length})</h2>
          {!p.documents.length ? <p className="mt-2 text-sm text-text-muted">No document is needed from this person for this family.</p> : (
            <ul className="mt-2 space-y-2 text-sm">{p.documents.map((d, i) => <li key={i}><span className="font-medium">{d.requirement}</span>{d.status === "Cannot tell yet" ? <Pill tone="warn" className="ml-1.5">Cannot tell yet</Pill> : null}<br /><span className="text-xs text-text-muted">because {d.why || "this combination asks for it"}</span></li>)}</ul>
          )}
        </section>
        <section aria-labelledby="pv-f" className="rounded-xl border border-border bg-surface-raised p-4">
          <h2 id="pv-f" className="font-semibold">Forms ({p.forms.length})</h2>
          {!p.forms.length ? <p className="mt-2 text-sm text-text-muted">No form applies to this person for this family.</p> : (
            <ul className="mt-2 space-y-2 text-sm">{p.forms.map((f) => (
              <li key={f.form} data-preview-form={f.form}>
                <span className="mono font-medium">{f.form}</span> <span className="text-text-muted">{f.title}</span>
                <span className="ml-1.5 inline-flex gap-1"><Pill tone={f.channel === "ONLINE" ? "ai" : f.channel === "SIGNED_PDF_UPLOAD" ? "warn" : "neutral"}>{f.channelWords}</Pill>{f.noRule ? <Pill tone="warn">Cannot tell yet: no rule</Pill> : f.applies === "cannot_tell" ? <Pill tone="warn">Cannot tell yet</Pill> : null}</span>
                <br /><span className="text-xs text-text-muted">{f.why}</span>
              </li>
            ))}</ul>
          )}
        </section>
      </div>
      {p.questionnaire.summary.not_asked ? <Notice tone="info">{p.questionnaire.summary.not_asked} question{p.questionnaire.summary.not_asked === 1 ? " is" : "s are"} placed in a selected section but not asked of this family: no form reads them and they decide nothing.</Notice> : null}
    </div>
  );
}
