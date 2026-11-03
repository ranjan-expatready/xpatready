// The one form picker and the one form intake (P-25, P-51), used on the combination page ("+ Add form") and on its
// Sources tab. Picking only offers forms already in the library. Every upload — one file or many — goes through the
// server's one intake, which reads each file's code, title, edition, published date and kind (no AI) and answers per
// file: already in the library, added (and attached here), a guide attached here, a new edition held for impact review
// (never attached silently, P-32), held for a person, or refused.
import * as React from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Check, FileUp, Plus, Search } from "lucide-react";
import { api, ApiError, useApi, useToast } from "@/lib/api";
import { Button, Input, Panel, Pill } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type LibraryForm = { code: string; title: string; kind: string; usedBy: number; online_only?: true; editions: { label: string; mapped: boolean; boxes: number; approved: boolean }[] };
export type IntakeResult = { file: string; outcome: "in_library" | "older_in_library" | "added" | "attached" | "new_edition_held" | "older_edition_held" | "held" | "refused" | "failed"; message: string; kind: string; code: string | null; title: string | null; edition: string | null; published: string | null };

export const OUTCOME: Record<IntakeResult["outcome"], [tone: string, label: string]> = {
  in_library: ["ok", "Already in the library"], older_in_library: ["neutral", "Older edition: not used"], added: ["ok", "Added to the library"], attached: ["info", "Guide attached"],
  new_edition_held: ["warn", "New edition: impact review needed"], older_edition_held: ["neutral", "Older edition: not used"], held: ["warn", "Held for a person"], refused: ["danger", "Refused"], failed: ["danger", "Not added: try again"],
};
const KIND: Record<string, string> = { form: "Form", checklist: "Checklist", guide: "Guide", unknown: "File" };

/** Drop zone + file button for one or many files. Keyboard: the button opens the file chooser; the results are
 *  announced. Each file gets its own line with what was read from it and what happened. */
export function FormIntake({ combinationId, onDone, title = "Upload forms, checklists or guides", hint }: { combinationId?: string; onDone?: (r: IntakeResult[]) => void; title?: string; hint?: string }) {
  const qc = useQueryClient();
  const input = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false), [busy, setBusy] = React.useState(false);
  const [results, setResults] = React.useState<IntakeResult[] | null>(null), [error, setError] = React.useState<string | null>(null);
  const send = async (list: FileList | null | undefined) => {
    const files = [...(list ?? [])];
    if (!files.length) return;
    setBusy(true); setError(null);
    const fd = new FormData(); for (const f of files) fd.append("files", f); if (combinationId) fd.append("combinationId", combinationId);
    try {
      const r = await api("/intake", { method: "POST", body: fd });
      setResults(r.results); void qc.invalidateQueries(); onDone?.(r.results);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  return (
    <div>
      <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); void send(e.dataTransfer.files); }}
        className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm", over ? "border-primary bg-primary/5" : "border-border-strong bg-surface")}>
        <FileUp className="size-5 text-text-link" aria-hidden />
        <div className="min-w-0 flex-1"><p className="font-medium">{title}</p><p className="text-xs text-text-muted">{hint ?? "Drop one or many IRCC PDFs or saved pages. We read each file's code, edition and kind from the file itself. A new edition of a form we have is held for review, never used silently."}</p></div>
        <input ref={input} type="file" multiple accept="application/pdf,.pdf,.html,.htm" className="sr-only" aria-label="Choose files to upload" onChange={(e) => void send(e.target.files)} />
        <Button size="sm" variant="secondary" busy={busy} onClick={() => input.current?.click()}>Choose files</Button>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-text-danger">{error}</p> : null}
      {results ? <IntakeResults results={results} /> : null}
    </div>
  );
}

export function IntakeResults({ results }: { results: IntakeResult[] }) {
  return (
    <div role="status"><ul className="mt-2 divide-y divide-border rounded-lg border border-border" aria-label="Upload results">
      {results.map((r, i) => {
        const [tone, label] = OUTCOME[r.outcome];
        return (
          <li key={i} className="flex flex-col gap-1 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{r.edition ?? r.code ?? r.file}</span>
              <Pill tone={tone}>{label}</Pill>
              <span className="text-xs text-text-muted">{[KIND[r.kind] ?? r.kind, r.title, r.published ? `file saved ${r.published}` : null /* K3: the PDF's own date, not IRCC's published month */, r.file].filter(Boolean).join(" · ")}</span>
            </div>
            <p className="text-xs text-text-muted">{r.message}</p>
          </li>
        );
      })}
    </ul></div>
  );
}

/** Library forms to pick from. Only forms (not checklists) with an edition are offered; one already on the row is shown
 *  as added. */
export function FormPicker({ combinationId, onAdded, have = [], uploadBelow = false }: { combinationId: string; onAdded?: (code: string) => void; have?: string[]; uploadBelow?: boolean }) {
  const qc = useQueryClient(); const toast = useToast();
  const lib = useApi<LibraryForm[]>(["library-forms"], "/library/forms");
  const [q, setQ] = React.useState(""), [busy, setBusy] = React.useState<string | null>(null), [err, setErr] = React.useState<string | null>(null);
  const list = (lib.data ?? []).filter((f) => f.kind === "data_form" && f.editions.length && `${f.code} ${f.title}`.toLowerCase().includes(q.trim().toLowerCase()));
  const add = async (code: string) => {
    setBusy(code); setErr(null);
    try {
      const r = await api(`/combinations/${combinationId}/lines`, { method: "POST", json: { kind: "FORM", formKey: code } });
      toast.push({ tone: "ok", text: r.added === "form_line" ? `${r.edition} added` : `${r.edition} attached: its form fields are not mapped yet, so AI can draft them` });
      void qc.invalidateQueries(); onAdded?.(code);
    } catch (e) { setErr(e instanceof ApiError ? e.field("formKey") ?? e.message : (e as Error).message); }
    finally { setBusy(null); }
  };
  return (
    <div className="space-y-2">
      <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-text-muted" aria-hidden /><Input className="pl-8" placeholder="Search forms in the library" aria-label="Search forms in the library" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {lib.isLoading ? <Spinner label="Loading the library" /> : !list.length ? <p className="text-sm text-text-muted" data-picker-empty>{q ? "No form in the library matches." : "The library has no forms yet."} {uploadBelow ? "Upload the IRCC PDF below." : <>A new form enters the library first: <Link className="text-text-link underline" to="/library/forms">upload it in the Form library</Link>.</>}</p> : (
        <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border" aria-label="Library forms">
          {list.map((f) => {
            const cur = f.editions.find((e) => e.mapped) ?? f.editions[0];
            const added = have.includes(f.code);
            return (
              <li key={f.code} className="flex items-center gap-3 px-3 py-2">
                <span className="mono shrink-0 rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-text-link">{f.code}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm" title={f.title}>{f.title}</p><p className="text-xs text-text-muted">{cur.mapped ? `Current edition ${cur.label.replace(`${f.code} `, "")} · ${cur.boxes} form fields mapped` : `Edition ${cur.label.replace(`${f.code} `, "")} · form fields not mapped yet`} · used by {f.usedBy} {f.usedBy === 1 ? "combination" : "combinations"}</p></div>
                {added ? <Pill tone="ok"><Check className="size-3" /> Added</Pill> : <Button size="sm" variant="secondary" busy={busy === f.code} onClick={() => void add(f.code)} aria-label={`Add ${f.code}`}><Plus /> Add</Button>}
              </li>
            );
          })}
        </ul>
      )}
      {err ? <p role="alert" className="text-xs text-text-danger">{err}</p> : null}
    </div>
  );
}

/** "+ Add form" on the combination page: a right panel (team pattern) to pick from the library or upload. */
export function AddFormPanel({ combinationId, label, have, onClose }: { combinationId: string; label: string; have: string[]; onClose: () => void }) {
  return (
    <Panel open onOpenChange={(o) => !o && onClose()} title="Add a form" description={`To ${label}. Pick one the library has, or upload IRCC PDFs: a new form enters the library and is attached here as a source; it joins the configuration through the next step.`} footer={<><Button variant="ghost" onClick={onClose}>Close</Button><span /></>}>
      <div className="space-y-5">
        <section aria-label="From the library"><h3 className="mb-2 text-sm font-semibold">From the library</h3><FormPicker combinationId={combinationId} have={have} uploadBelow /></section>
        <section aria-label="Upload"><h3 className="mb-2 text-sm font-semibold">Not in the library?</h3><FormIntake combinationId={combinationId} title="Drop IRCC PDFs here" /></section>
      </div>
    </Panel>
  );
}
