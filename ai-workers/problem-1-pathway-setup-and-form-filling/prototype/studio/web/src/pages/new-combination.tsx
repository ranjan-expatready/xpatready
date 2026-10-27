// New combination (Layout v2, journey board step 2), built by hand: one field per level with type-ahead — pick what exists
// or "Create '…'" inline — the duplicate check as you type (BR-6, the server's own rule), an optional "Linked to", the
// "Will be created as" line, and one request that checks every level before writing (POST /combinations/path).
// "Describe it" (Screen 02 slice 3, board view 11, P-37/P-41) proposes the path; until paid runs are agreed it matches the
// description's words with the existing paths (no AI, US$0), says so, and creates nothing until the author confirms.
import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Plus } from "lucide-react";
import { normalizeLabel, cleanLabel, labelProblem, type SessionView } from "../../../contracts/programs";
import { api, ApiError, useActorId, useApi } from "@/lib/api";
import { Button, Notice, Select } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CATALOGUE_URL_KEY, PATHWAY_LABEL } from "@/pages/programs";
import type { PathProposal } from "../../../contracts/screen02";

type Opt = { key: string; label: string; combinations: number; hasSetup: boolean; combinationId?: string | null };
type ProgramOpt = Opt & { categories: (Opt & { subCategories: Opt[] })[] };
/** A level's value: an existing node, a new name, or (sub-category only) none. */
type Val = { key: string; label: string } | { create: string } | null;
const labelOf = (v: Val) => (!v ? "" : "key" in v ? v.label : v.create);

export function NewCombinationPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate(); const qc = useQueryClient();
  const actorId = useActorId();
  const session = useApi<SessionView>(["session", actorId], "/session");
  const canAuthor = (session.data?.actor?.duties ?? []).includes("author");
  const [pathway, setPathway] = React.useState(sp.get("pw") === "CORPORATE" ? "CORPORATE" : "INDIVIDUAL");
  const opts = useApi<{ programs: ProgramOpt[]; pathways: { key: string; label: string }[]; combinations: { nodeKey: string; pathway: string; path: string[] }[] }>(["path-options", pathway], `/path-options?pathway=${pathway}`);
  // W1-03 (slice 1): Pathways are names on the Structure; the trail names the type's Pathway when it has exactly one
  // (slice 4 redraws this page with a Pathway picker).
  const pathwayName = opts.data?.pathways?.length === 1 ? `${opts.data.pathways[0].label} › ` : "";
  const [program, setProgram] = React.useState<Val>(null);
  const [category, setCategory] = React.useState<Val>(null);
  const [sub, setSub] = React.useState<Val>(null);
  const [linkKind, setLinkKind] = React.useState<"" | "follows" | "supported_by">("");
  const [link, setLink] = React.useState<Val>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);
  const back = () => nav(-1);
  // S2 (founder, 27 Oct): "Start setup" on a Not started combination (Structure's "Used by", Immigration programs)
  // arrives with ?leaf=<node key>; the pickers are filled with its trail once, until S3 replaces this page.
  const prefilled = React.useRef(false);
  React.useEffect(() => {
    const want = sp.get("leaf");
    if (prefilled.current || !want || !opts.data) return;
    prefilled.current = true;
    for (const p of opts.data.programs) for (const c of p.categories) {
      const s = c.subCategories.find((x) => x.key === want);
      if (c.key !== want && !s) continue;
      setProgram({ key: p.key, label: p.label }); setCategory({ key: c.key, label: c.label }); setSub(s ? { key: s.key, label: s.label } : null);
      return;
    }
  }, [opts.data, sp]);

  const progs = opts.data?.programs ?? [];
  const progNode = program && "key" in program ? progs.find((p) => p.key === program.key) : undefined;
  const cats = progNode?.categories ?? [];
  const catNode = category && "key" in category ? cats.find((c) => c.key === category.key) : undefined;
  const subs = catNode?.subCategories ?? [];
  const subNode = sub && "key" in sub ? subs.find((s) => s.key === sub.key) : undefined;
  const needsSub = !!catNode && subs.length > 0;
  const subBlocked = !!catNode?.hasSetup;
  const leafNode = subNode ?? (!sub ? catNode : undefined);
  const exists = !!leafNode?.hasSetup;
  const path = [labelOf(program), labelOf(category), labelOf(sub)].filter(Boolean);
  const complete = !!program && !!category && (!needsSub || !!sub);

  const submit = async () => {
    setErrors({}); setProblem(null); setBusy(true);
    const lv = (v: Val) => (!v ? null : "key" in v ? { key: v.key } : { create: v.create });
    try {
      const r = await api("/combinations/path", { method: "POST", json: { pathway, program: lv(program), category: lv(category), subCategory: lv(sub), link: linkKind && link && "key" in link ? { kind: linkKind, nodeKey: link.key } : null } });
      void qc.invalidateQueries();
      nav(`/c/${r.combination.id}/sources`);
    } catch (e) {
      // A field error names the level ("program.create" → the Program field, QA-7); one the page has no field for is
      // shown in the notice, so a refusal is never silent.
      const fields = new Set(["program", "category", "subCategory", "link"]);
      const errs = (e instanceof ApiError ? e.problem.errors ?? [] : []).map((x) => ({ ...x, field: x.field.split(".")[0] }));
      const mine = errs.filter((x) => fields.has(x.field));
      if (mine.length) setErrors(Object.fromEntries(mine.map((x) => [x.field, x.message])));
      setProblem(mine.length === errs.length && mine.length ? null : (e as Error).message);
      void opts.refetch(); // someone may have created that level meanwhile: offer it to choose (break round 3)
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-4">
      {/* A way back to the list as it was left (review #10, EXPERIENCE §2.1). */}
      <nav aria-label="Path" className="flex items-center gap-1 text-sm text-text-muted">
        <Link to={(() => { try { return sessionStorage.getItem(CATALOGUE_URL_KEY) ?? "/"; } catch { return "/"; } })()} className="font-medium text-text-link hover:underline">Immigration programs</Link>
        <ChevronRight className="size-3.5" aria-hidden /><span aria-current="page">New combination</span>
      </nav>
      <h1 className="text-[22px] font-bold tracking-tight">New combination</h1>
      {!canAuthor && session.data ? <Notice tone="warn" title="Only a configuration author can create combinations">Switch to the Configuration author with "Acting as" at the top.</Notice> : null}
      {canAuthor ? <Describe pathway={pathway} onUse={(x) => { if (x.pathway !== pathway) setPathway(x.pathway); setProgram(x.program); setCategory(x.category); setSub(x.subCategory); }} /> : null}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-5">
        <p className="text-sm text-text-muted">Pick what already exists, or type a new name and choose <b className="font-semibold text-text">Create</b>. Each level is checked for duplicates as you type.</p>
        {opts.isLoading ? <Skeleton className="h-16 w-full" /> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="pc-pathway" className="text-xs text-text-muted">Pathway</label>
              <Select id="pc-pathway" value={pathway} onChange={(e) => { setPathway(e.target.value); setProgram(null); setCategory(null); setSub(null); }}>
                <option value="INDIVIDUAL">{PATHWAY_LABEL.INDIVIDUAL}</option><option value="CORPORATE">{PATHWAY_LABEL.CORPORATE}</option>
              </Select>
            </div>
            <Picker id="program" label="Program" options={progs} value={program} error={errors.program} onChange={(v) => { setProgram(v); setCategory(null); setSub(null); }} />
            <Picker id="category" label="Category" options={cats} value={category} error={errors.category} disabled={!program} parentNew={!!program && !("key" in program)}
              onChange={(v) => { setCategory(v); setSub(null); }} />
            <Picker id="subCategory" label="Sub-category" options={subs} value={sub} error={errors.subCategory} disabled={!category || subBlocked} parentNew={!!category && !("key" in category)} allowNone={!needsSub}
              noneHint={!category ? undefined : subBlocked ? `${labelOf(category)} has its own setup, so it is the combination` : needsSub ? "choose one: each is its own combination" : "not applicable: the category is the combination"}
              onChange={setSub} />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Linked to <span className="font-normal text-text-muted">optional</span></span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
            <Select aria-label="Kind of link" value={linkKind} onChange={(e) => { setLinkKind(e.target.value as typeof linkKind); if (!e.target.value) setLink(null); }}>
              <option value="">None</option><option value="follows">Next step of…</option><option value="supported_by">Supported by…</option>
            </Select>
            {linkKind ? <Picker id="link" label="Combination it is linked to" hideLabel noCreate options={(opts.data?.combinations ?? []).map((c) => ({ key: c.nodeKey, label: `${c.pathway === pathway ? "" : `${c.pathway === "CORPORATE" ? "Corporate" : "Individual"} › `}${c.path.join(" › ")}`, combinations: 1, hasSetup: true }))}
              value={link} error={errors.link} onChange={setLink} /> : null}
          </div>
          <span className="text-xs text-text-muted">A label on the row for now (for example "Supported by: Corporate › LMIA"); nothing carries across between linked applications yet.</span>
        </div>

        {exists ? (
          <Notice tone="info" title="This combination already exists" action={<Button variant="secondary" onClick={() => nav(leafNode!.combinationId ? `/c/${leafNode!.combinationId}` : `/?${pathway === "CORPORATE" ? "pw=CORPORATE&" : ""}f=all&sel=${encodeURIComponent(leafNode!.key)}`)}>Open the existing combination</Button>}>
            {PATHWAY_LABEL[pathway]} › {pathwayName}{path.join(" › ")} is already set up. Open it instead of creating it again.
          </Notice>
        ) : (
          <div className="rounded-lg bg-surface px-3 py-2.5 text-sm" aria-live="polite">Will be created as <b className="font-semibold">{PATHWAY_LABEL[pathway]} › {pathwayName}{path.length ? path.join(" › ") : "…"}</b></div>
        )}
        {problem ? <Notice tone="danger" title="Not created">{problem}</Notice> : null}
        <div className="flex gap-2">
          <Button onClick={submit} busy={busy} disabled={!canAuthor || !complete || exists || (!!linkKind && !link) || [program, category, sub].some((v) => !!v && "create" in v && !!labelProblem(v.create))}>Create and add sources</Button>
          <Button variant="secondary" onClick={back}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

/** One level of the path: a combobox (team SearchablePicker behaviour — type-ahead over the closed list, ↑/↓/Enter,
 *  Escape closes only the list) with an inline "Create '…'" when no existing name matches (BR-6 rule). */
function Picker({ id, label, options, value, onChange, error, disabled, parentNew, allowNone, noneHint, hideLabel, noCreate }: {
  id: string; label: string; options: Opt[]; value: Val; onChange: (v: Val) => void; error?: string; disabled?: boolean; parentNew?: boolean; allowNone?: boolean; noneHint?: string; hideLabel?: boolean; noCreate?: boolean;
}) {
  const [text, setText] = React.useState<string | null>(null); // null = showing the chosen value
  const [open, setOpen] = React.useState(false);
  const [hi, setHi] = React.useState(0);
  const shown = text ?? labelOf(value);
  const typed = cleanLabel(text ?? "");
  const words = normalizeLabel(typed);
  const matches = options.filter((o) => !words || normalizeLabel(o.label).includes(words));
  const twin = words ? options.find((o) => normalizeLabel(o.label) === words) : undefined;
  type Item = { kind: "opt"; o: Opt } | { kind: "create"; label: string } | { kind: "none" };
  // The server's own name rules, shown as you type and kept on the field once chosen (QA-6, QA-7); Create stays offered
  // so the field keeps the name and its message, and the page will not send it.
  const bad = typed ? labelProblem(typed) : null;
  const items: Item[] = [...(allowNone && !words ? [{ kind: "none" } as Item] : []), ...(bad && !words ? [] : matches.map((o) => ({ kind: "opt", o }) as Item)), ...(!noCreate && typed && !twin ? [{ kind: "create", label: typed } as Item] : [])];
  const choose = (it: Item) => {
    onChange(it.kind === "opt" ? { key: it.o.key, label: it.o.label } : it.kind === "create" ? { create: it.label } : null);
    setText(null); setOpen(false);
  };
  React.useEffect(() => setHi(0), [text, open]);
  const node = value && "key" in value ? options.find((o) => o.key === value.key) : undefined;
  const valueProblem = value && "create" in value ? labelProblem(value.create) : null;
  // While typing, the hint is about the text being typed; the chosen value's problem shows again when typing stops (break m3).
  const typing = open && text !== null;
  const hint = noCreate ? "" : typing && bad ? bad : typing && twin ? `"${twin.label}" exists: choose it` : typing && typed ? (parentNew ? "new" : "new · no duplicate found") : valueProblem ? valueProblem : disabled && !value ? noneHint && !parentNew ? noneHint : "" : !value ? (allowNone ? noneHint ?? "" : "") : "key" in value ? `exists · ${node?.combinations ?? 0} combination${node?.combinations === 1 ? "" : "s"}` : parentNew ? "new" : "new · no duplicate found";
  const listId = `pk-${id}-list`;
  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor={`pk-${id}`} className={cn("text-xs text-text-muted", hideLabel && "sr-only")}>{label}</label>
      <input id={`pk-${id}`} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" autoComplete="off" disabled={disabled}
        aria-activedescendant={open && items[hi] ? `${listId}-${hi}` : undefined} aria-invalid={!!error || !!valueProblem || undefined} aria-describedby={`pk-${id}-hint`}
        value={shown} placeholder={allowNone ? "None" : "Choose or type"}
        onChange={(e) => { setText(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => { setOpen(false); setText(null); }, 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { setOpen(true); setHi((h) => Math.min(h + 1, items.length - 1)); }
          else if (e.key === "ArrowUp") setHi((h) => Math.max(h - 1, 0));
          else if (e.key === "Enter") { if (open && items[hi]) choose(items[hi]); }
          else if (e.key === "Escape") { if (open) { e.stopPropagation(); setOpen(false); setText(null); } else return; }
          else return;
          e.preventDefault();
        }}
        className={cn("h-9 w-full rounded-lg border bg-surface-raised px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:bg-surface disabled:text-text-muted", error ? "border-danger" : value && !("key" in value) ? "border-primary" : "border-border-strong")} />
      {open && !disabled ? (
        <ul id={listId} role="listbox" aria-label={label} className="absolute left-0 right-0 top-[3.6rem] z-40 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-raised p-1 text-sm shadow-lg">
          {items.length ? items.map((it, i) => (
            <li key={it.kind === "opt" ? it.o.key : it.kind} id={`${listId}-${i}`} role="option" aria-selected={i === hi} onMouseDown={(e) => { e.preventDefault(); choose(it); }} onMouseEnter={() => setHi(i)}
              className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5", i === hi && "bg-text/5")}>
              {it.kind === "opt" ? <><span className="flex items-center gap-1.5">{value && "key" in value && value.key === it.o.key ? <Check className="size-3.5 text-text-link" aria-hidden /> : null}{it.o.label}</span>{it.o.combinations ? <span className="text-[12px] tabular-nums text-text-muted">used by {it.o.combinations}</span> : null}</>
                : it.kind === "create" ? <span className="flex items-center gap-1.5 font-semibold text-text-link"><Plus className="size-3.5" aria-hidden />Create "{it.label}"</span>
                : <span className="text-text-muted">None</span>}
            </li>
          )) : <li className="px-2 py-1.5 text-text-muted">{twin ? "" : "Nothing yet: type a name to create one."}</li>}
        </ul>
      ) : null}
      <span id={`pk-${id}-hint`} aria-live="polite" className={cn("text-xs", error || (typing && bad) || (!typing && valueProblem) ? "text-text-danger" : value && !("key" in value) ? "text-text-ok" : "text-text-muted")}>{error ?? hint}</span>
    </div>
  );
}

/** Board view 11: describe the application, get a proposed path, use it (fills the fields below) or build it by hand. */
function Describe({ pathway, onUse }: { pathway: string; onUse: (x: { pathway: string; program: Val; category: Val; subCategory: Val }) => void }) {
  const [text, setText] = React.useState(""), [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null);
  const [r, setR] = React.useState<PathProposal | null>(null);
  const propose = async () => { setBusy(true); setErr(null); try { setR(await api<PathProposal>("/path-proposal", { method: "POST", json: { pathway, description: text } })); } catch (e) { setErr((e as Error).message); setR(null); } finally { setBusy(false); } };
  const p = r?.proposal;
  return (
    <section aria-labelledby="describe-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-5" data-describe>
      <h2 id="describe-h" className="text-sm font-semibold">Describe it</h2>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs text-text-muted">What application is it?<input className="mt-1 h-9 w-full rounded-lg border border-border-strong bg-surface-raised px-3 text-sm text-text outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" value={text} maxLength={400} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void propose(); } }} placeholder="Parents and grandparents super visa, applied from outside Canada" /></label>
        <Button variant="secondary" busy={busy} onClick={() => void propose()}>Propose a path · US$0</Button>
      </div>
      {err ? <p role="alert" className="text-sm text-text-danger">{err}</p> : null}
      {r ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-sm" role="status">
          <p className="text-xs text-text-muted"><b className="font-semibold text-text">Proposal without AI</b> · {r.why}{r.confidence ? ` · Confidence: ${r.confidence}` : ""} · Cost: US$0 · Nothing is created until you confirm.</p>
          {p ? <>
            <p>Will be created as <b className="font-semibold">{p.path.join(" › ")}</b>{r.others?.length ? <span className="text-text-muted"> (also close: {r.others.join("; ")})</span> : null}</p>
            {p.exists ? <Notice tone="warn">"{p.path.slice(-2).join(" › ")}" already exists. <Link className="text-text-link underline" to={`/c/${p.combinationId}`}>Open the existing combination</Link></Notice>
              : <div><Button size="sm" onClick={() => onUse({ pathway: p.pathway, program: p.program, category: p.category, subCategory: p.subCategory })}>Use this path</Button> <span className="text-xs text-text-muted">It fills the fields below; check them, then Create.</span></div>}
          </> : null}
        </div>
      ) : null}
    </section>
  );
}
