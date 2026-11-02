// G-CORE B2 (P-253 step 4; concept screens/G-CORE-guarded-change/concept.md v2 §4, BR-3, BR-4, BR-5): the one shared
// panel "What this change touches", shown before a guarded change is confirmed: the checks (or each problem in words, with
// what is not checked), the review tier in words, who makes it, and per item the touched sections, forms, rules,
// combinations, releases and open cases. Its host sends the fingerprint back as `expected`; a stale one answers "look
// again" and the host shows the fresh panel. Hosts: the field rename, the section rename, the merge approval and the
// rename approval. A region with a heading, plain lists, no hover-only text.
import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Notice, Pill } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { MADE_BY_WORDS, type ChangeItem, type CheckResult, type PreviewItem } from "../../contracts/change-set";

/** The check for these items (no write). `enabled` false while the person is still typing an empty name. */
export function useChangeCheck(items: ChangeItem[], enabled = true) {
  const json = JSON.stringify(items);
  return useQuery<CheckResult>({ queryKey: ["change-check", json], queryFn: () => api<CheckResult>("/change-sets/check", { method: "POST", json: { items } }), enabled, staleTime: 0, retry: false });
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Group({ title, count, children }: { title: string; count: number; children?: React.ReactNode }) {
  return (
    <div data-group={title}>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title} ({count})</h4>
      {count ? <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{children}</ul> : <p className="mt-1 text-sm text-text-muted">None</p>}
    </div>
  );
}

function Item({ p }: { p: PreviewItem }) {
  const open = p.open_cases.reduce((n, o) => n + o.cases, 0);
  return (
    <div className="space-y-3" data-preview-item={p.key}>
      {p.before !== null || p.after !== null ? <p className="text-sm" data-before-after><span className="text-text-muted">{p.before ?? "Nothing"}</span> → <b className="font-semibold">{p.after ?? "Nothing"}</b></p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Group title="Sections" count={p.sections.length}>{p.sections.map((s) => <li key={s.key}>{s.title}</li>)}</Group>
        <Group title="Forms" count={p.forms.length}>{p.forms.map((f) => <li key={f}>{f}</li>)}</Group>
        <Group title="Rules" count={p.rules.length}>{p.rules.map((r, i) => <li key={i}>{r.kind} {r.key} · {r.combination}</li>)}</Group>
        <Group title="Combinations" count={p.combinations.length}>{p.combinations.map((c) => <li key={c.id}><Link className="text-text-link underline" to={`/c/${c.id}`}>{c.label}</Link></li>)}</Group>
        <Group title="Releases" count={p.releases.length}>{p.releases.map((r, i) => <li key={i}>{r.combination}, release {r.version} (unchanged: a release is never edited)</li>)}</Group>
        <Group title="Open cases" count={open}>{p.open_cases.map((o, i) => <li key={i}>{o.combination}: {plural(o.cases, "open case")} {o.release === null ? "not pinned to a release yet" : `stay on release ${o.release}; nothing changes for them`}</li>)}</Group>
      </div>
    </div>
  );
}

/** The panel. `check` comes from useChangeCheck in the host (so the host can send its fingerprint as `expected`). */
export function ChangePreview({ check, stale }: { check: ReturnType<typeof useChangeCheck>; /** The confirm answered "look again". */ stale?: boolean }) {
  const id = React.useId();
  const r = check.data;
  return (
    <section role="region" aria-labelledby={id} className="space-y-3 rounded-lg border border-border bg-surface-raised p-4" data-change-preview={r ? (r.ok ? "ok" : "refused") : check.isError ? "error" : "loading"}>
      <h3 id={id} className="font-semibold">What this change touches</h3>
      {stale ? <Notice tone="warn" title="Look again">What this change touches changed since you opened it. Look at it again, then confirm.</Notice> : null}
      {check.isLoading ? <Spinner label="Checking the change" /> : check.isError || !r ? <Notice tone="danger" title="The change could not be checked">{(check.error as Error | null)?.message ?? "No answer from the studio."}</Notice> : <>
        {r.ok ? <p className="text-sm text-text-ok" data-checks="passed">Checks passed.</p>
          : <div data-checks="problems"><Notice tone="danger" title="This change is refused">
            <ul className="list-disc space-y-1 pl-5">{r.problems.map((p, i) => <li key={i}>{p.message}</li>)}</ul>{r.truncated ? <p className="mt-1">More problems were found than are listed.</p> : null}
          </Notice></div>}
        <p className="text-xs text-text-muted" data-not-checked>Not checked: {r.not_checked.join("; ")}.</p>
        <p className="flex flex-wrap items-center gap-2 text-sm" data-tier={r.tier.tier}><Pill tone={r.tier.tier === "direct" ? "info" : "warn"}>{r.tier.tier === "direct" ? "Applies now" : "Second person"}</Pill>{r.tier.words}</p>
        <p className="text-xs text-text-muted" data-made-by={r.made_by}>{MADE_BY_WORDS[r.made_by]}.</p>
        {r.preview.map((p) => <Item key={p.item} p={p} />)}
      </>}
    </section>
  );
}
