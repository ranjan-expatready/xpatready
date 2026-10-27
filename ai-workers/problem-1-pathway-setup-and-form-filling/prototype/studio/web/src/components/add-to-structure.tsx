// "Add to Program structure" (P-127, AD-1…AD-8; board screens/W1-visual-system/design/draft-structure-v2.html §1): the
// one way a name enters the Program structure. Five fields top-down, each enabled once the one above is set: Pathway type
// (a two-button switch, a fixed value), then Pathway, Program, Category and Sub-category, each picking a name under the
// field above (Structure order) or typing a new one, tagged New. Under a New name every level is New. Checks run under
// each field as you type (rules first, US$0). A live "You are adding" trail shows what is new; one Add writes only the
// new parts in one transaction (POST /structure/path), may stop at any level and starts no setup.
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Level, PathwayType, StructureNode, StructurePathResult } from "../../../contracts/structure";
import { api, ApiError, useApi } from "@/lib/api";
import { Button, Dialog } from "@/components/ui/controls";
import { LevelMark, type LevelName } from "@/components/levels";
import { Tip } from "@/components/status";
import { cn } from "@/lib/utils";

export type AddPrefill = { pathwayKey?: string; programKey?: string; categoryKey?: string; focus?: Level };
type ListResp = { nodes: StructureNode[] };
type Close = { key: string; label: string; trail: string[]; why: string };

const TYPES: { value: PathwayType; label: string; tip: string }[] = [
  { value: "INDIVIDUAL", label: "Retail", tip: "Who applies: a person and their family." },
  { value: "CORPORATE", label: "Corporate and employers", tip: "Who applies: an employer or organisation, such as for an LMIA." },
];
const FIELDS: Level[] = ["pathway", "program", "category", "subCategory"];
const WORD: Record<Level, string> = { pathway: "Pathway", program: "Program", category: "Category", subCategory: "Sub-category" };
const EXAMPLE: Record<Level, string> = { pathway: "e.g. Temporary residence", program: "e.g. Visitors", category: "e.g. Visitor visa", subCategory: "e.g. Outside Canada" };
const norm = (s: string) => s.normalize("NFKC").toLocaleLowerCase("en-CA").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export const LOCS = [["inside_canada", "Inside"], ["outside_canada", "Outside"], ["both", "Both"]] as const;
export const locKey = (l: string[]) => (l.length === 2 ? "both" : l[0] ?? "both");
export const locList = (k: string) => (k === "both" ? ["inside_canada", "outside_canada"] : [k]);
export const LOC_TIP = "Where a case for it may be opened. Sample until the immigration expert confirms.";
export function LocationPicker({ value, onChange, disabled, label }: { value: string[]; onChange: (l: string[]) => void; disabled?: boolean; label: string }) {
  const cur = locKey(value);
  return (
    <Tip tip={LOC_TIP}>
      <div role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-lg border border-border-strong text-xs">
        {LOCS.map(([k, w]) => (
          <button key={k} type="button" role="radio" aria-checked={cur === k} disabled={disabled} onClick={() => onChange(locList(k))}
            className={cn("px-2.5 py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&+&]:border-l [&+&]:border-border", cur === k ? "bg-primary font-semibold text-primary-foreground" : "bg-surface-raised text-text hover:bg-surface", disabled && "cursor-not-allowed opacity-60")}>{w}</button>
        ))}
      </div>
    </Tip>
  );
}

export function AddToStructure({ open, onClose, type: initialType, prefill, onAdded, onShow }: {
  open: boolean; onClose: () => void; type: PathwayType; prefill?: AddPrefill;
  /** After Add: the result, and whether the person asked for another (the dialog stays open). */
  onAdded: (r: StructurePathResult, again: boolean) => void;
  /** "Already in the structure: Show it". */
  onShow: (key: string) => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = React.useState<PathwayType>(initialType);
  const list = useApi<ListResp>(["structure", type], open ? `/structure?pathwayType=${type}` : null);
  const nodes = React.useMemo(() => (list.data?.nodes ?? []).filter((n) => !n.retired), [list.data]);
  const [text, setText] = React.useState<Record<Level, string>>({ pathway: "", program: "", category: "", subCategory: "" });
  const [sel, setSel] = React.useState<Record<Level, string | null>>({ pathway: null, program: null, category: null, subCategory: null });
  const [none, setNone] = React.useState(true); // Sub-category "None: the category is the combination"
  const [keep, setKeep] = React.useState<Record<string, boolean>>({});
  const [close, setClose] = React.useState<Record<string, Close[]>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [problem, setProblem] = React.useState<{ text: string; existing?: string } | null>(null);
  const [locs, setLocs] = React.useState<string[]>(["inside_canada", "outside_canada"]);
  const [busy, setBusy] = React.useState(false);
  const refs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const seeded = React.useRef(false);
  const [aim, setAim] = React.useState<Level>("pathway");

  // Prefilled from where it was opened (AD-8): Pathway type from the tab, then the levels above the one to add.
  React.useEffect(() => {
    if (!open) { seeded.current = false; return; }
    if (seeded.current || !list.data) return;
    seeded.current = true;
    const t: Record<Level, string> = { pathway: "", program: "", category: "", subCategory: "" };
    const s: Record<Level, string | null> = { pathway: null, program: null, category: null, subCategory: null };
    for (const [lv, k] of [["pathway", prefill?.pathwayKey], ["program", prefill?.programKey], ["category", prefill?.categoryKey]] as const) {
      const n = k ? nodes.find((x) => x.key === k) : undefined;
      if (n) { t[lv] = n.label; s[lv] = n.key; }
    }
    setText(t); setSel(s); setKeep({}); setClose({}); setErrors({}); setProblem(null);
    const cat = s.category ? nodes.find((x) => x.key === s.category) : undefined;
    setNone(!(prefill?.focus === "subCategory" || (cat && nodes.some((x) => x.parentKey === cat.key))));
    setLocs(cat?.allowedLocations.length ? cat.allowedLocations : ["inside_canada", "outside_canada"]);
    const focus = prefill?.focus ?? FIELDS.find((lv) => !s[lv]) ?? "pathway";
    setAim(focus);
    requestAnimationFrame(() => refs.current[focus]?.focus());
  }, [open, list.data]);
  React.useEffect(() => { if (open) setType(initialType); }, [open, initialType]);

  const parentOf = (lv: Level): Level | null => (lv === "pathway" ? null : FIELDS[FIELDS.indexOf(lv) - 1]);
  const isNew = (lv: Level) => !sel[lv] && !!text[lv].trim();
  const isSet = (lv: Level) => !!sel[lv] || !!text[lv].trim();
  const underNew = (lv: Level) => { for (let p = parentOf(lv); p; p = parentOf(p)) if (isNew(p)) return true; return false; };
  const optionsFor = (lv: Level) => {
    const p = parentOf(lv);
    if (p && (isNew(p) || !sel[p])) return [];
    return nodes.filter((n) => n.level === lv && (p ? n.parentKey === sel[p] : n.parentKey === null && n.pathwayType === type));
  };
  const catNode = sel.category ? nodes.find((n) => n.key === sel.category) : undefined;
  const catHasSubs = !!catNode && nodes.some((n) => n.parentKey === catNode.key);
  const catSetUp = !!catNode?.hasSetup;
  const subOff = !isSet("category") ? "Choose the category first." : catSetUp ? `${catNode!.label} already has its own setup, so it is the combination. A sub-category would leave that setup above a combination.` : null;
  const useNone = !subOff && none && !catHasSubs;
  const enabled = (lv: Level) => { const p = parentOf(lv); return !p || isSet(p); };

  // What one Add writes: every level set, down to the first empty one (AD-3).
  const path = FIELDS.filter((lv, i) => FIELDS.slice(0, i + 1).every((x) => isSet(x)) && (lv !== "subCategory" || (!useNone && !subOff)));
  const last = path[path.length - 1];
  const fresh = path.filter((lv) => isNew(lv));
  const makesCombination = !!last && ((last === "category" && (useNone || catSetUp) && !catHasSubs) || last === "subCategory");
  const showLocs = !!last && (last === "category" || last === "subCategory") && fresh.includes(last);
  const short = !!last && !fresh.length && FIELDS.indexOf(last) < FIELDS.indexOf(aim);
  const exists = !!last && !fresh.length && !short;

  // Checks under each field as you type (AD-4): close spellings among the names of that level; an exact twin is picked.
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      for (const lv of FIELDS) {
        const p = parentOf(lv);
        if (!isNew(lv) || (p && !sel[p] && lv !== "pathway")) { setClose((c) => (c[lv] ? { ...c, [lv]: [] } : c)); continue; }
        void api<{ close: Close[] }>("/structure/name-check", { method: "POST", json: { pathwayType: type, level: lv, parentKey: p ? sel[p] : null, label: text[lv] } })
          .then((r) => setClose((c) => ({ ...c, [lv]: r.close }))).catch(() => undefined);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [open, type, text.pathway, text.program, text.category, text.subCategory, sel.pathway, sel.program, sel.category]);

  const typeIn = (lv: Level, v: string) => {
    setProblem(null); setErrors((e) => ({ ...e, [lv]: "" }));
    const match = optionsFor(lv).find((n) => norm(n.label) === norm(v) && norm(v));
    // A level changed: the levels under it start again.
    const below = FIELDS.slice(FIELDS.indexOf(lv) + 1);
    setText((t) => ({ ...t, [lv]: v, ...(sel[lv] !== (match?.key ?? null) ? Object.fromEntries(below.map((b) => [b, ""])) : {}) }));
    setSel((s) => ({ ...s, [lv]: match?.key ?? null, ...(s[lv] !== (match?.key ?? null) ? Object.fromEntries(below.map((b) => [b, null])) : {}) }));
    setKeep((k) => ({ ...k, [lv]: false }));
    if (lv === "category") { setNone(true); if (match?.allowedLocations.length) setLocs(match.allowedLocations); }
  };
  const pick = (lv: Level, n: StructureNode) => { typeIn(lv, n.label); requestAnimationFrame(() => refs.current[FIELDS[FIELDS.indexOf(lv) + 1]]?.focus()); };

  const send = async (again: boolean) => {
    if (!fresh.length || busy) return;
    setBusy(true); setProblem(null); setErrors({});
    const lvPick = (lv: Level) => (sel[lv] ? { key: sel[lv]! } : { label: text[lv].trim() });
    const body: Record<string, unknown> = { pathwayType: type, decision: Object.values(keep).some(Boolean) ? "add_anyway" : "new" };
    for (const lv of path) body[lv] = lvPick(lv);
    if (last === "category" && useNone) body.subCategory = null;
    if (showLocs) body.allowedLocations = locs;
    // "Add and add another" (QA-44 kept for the pop-up): the last field clears as the name is sent, so whatever is typed
    // next while it saves is kept; a refusal puts the name back only if nothing new was typed.
    const lastLevel = last!, sentText = text[lastLevel];
    if (again) { setText((t) => ({ ...t, [lastLevel]: "" })); setSel((s0) => ({ ...s0, [lastLevel]: null })); requestAnimationFrame(() => refs.current[lastLevel]?.focus()); }
    try {
      const r = await api<StructurePathResult>("/structure/path", { method: "POST", json: body });
      await Promise.all([qc.invalidateQueries({ queryKey: ["structure"] }), qc.invalidateQueries({ queryKey: ["catalogue"] })]);
      onAdded(r, again);
      if (again) {
        // "Add and add another" keeps the levels above the last one written, now existing names (AD-7).
        const above = r.created.filter((c) => c.level !== lastLevel);
        setSel((s0) => ({ ...s0, ...Object.fromEntries(above.map((c) => [c.level, c.key])) }));
        setText((t) => ({ ...t, ...Object.fromEntries(above.map((c) => [c.level, c.label])) }));
        setKeep({}); setClose({});
      }
    } catch (e) {
      if (again) setText((t) => (t[lastLevel] ? t : { ...t, [lastLevel]: sentText }));
      const p = e instanceof ApiError ? (e.problem as { code?: string; existing?: { key: string }; errors?: { field: string; message: string }[] }) : {};
      // Close names keep their "Did you mean … Use it / Keep mine" box under the field instead of an error (AD-4).
      if (p.code !== "close_names") setErrors(Object.fromEntries((p.errors ?? []).map((x) => [x.field, x.message])));
      setProblem({ text: `Nothing was added. ${(e as Error).message}`, existing: p.code === "exists" ? p.existing?.key : undefined });
    } finally { setBusy(false); }
  };

  const verb = fresh.length === 1 ? `Add ${WORD[fresh[0]].toLowerCase()}` : `Add ${fresh.length} names`;
  const title = "Add to Program structure";
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }} title={title} description="Pick what exists or type a new name; each level is checked as you type. Only the new names are written, and no setup starts."
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Tip tip="Adds, then keeps the levels above so you can type the next name."><span><Button variant="secondary" disabled={!fresh.length || busy} onClick={() => void send(true)} data-add-again>Add and add another</Button></span></Tip>
          <Tip tip={fresh.length ? `Writes ${fresh.length === 1 ? "the new name" : `the ${fresh.length} new names`} in one go; all or nothing.` : exists ? "Everything you chose is already in the Program structure." : "Type or pick a name first."}><span><Button disabled={!fresh.length || busy} busy={busy} onClick={() => void send(false)} data-add-submit>{fresh.length ? verb : "Add"}</Button></span></Tip>
        </div>}>
      <div className="space-y-3" data-add-dialog>
        <div className="space-y-1">
          <span className="text-xs font-medium">Pathway type</span>
          <div role="radiogroup" aria-label="Pathway type" className="flex w-fit gap-0.5 rounded-xl border border-border bg-surface p-0.5">
            {TYPES.map((t) => (
              <Tip key={t.value} tip={t.tip}>
                <button type="button" role="radio" aria-checked={type === t.value} onClick={() => { if (type !== t.value) { setType(t.value); setText({ pathway: "", program: "", category: "", subCategory: "" }); setSel({ pathway: null, program: null, category: null, subCategory: null }); } }}
                  className={cn("inline-flex h-8 items-center rounded-lg px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", type === t.value ? "bg-primary font-semibold text-primary-foreground" : "text-text-muted hover:text-text")}>{t.label}</button>
              </Tip>
            ))}
          </div>
        </div>
        {FIELDS.map((lv) => (
          <NameField key={lv} level={lv} label={WORD[lv]} value={text[lv]} options={optionsFor(lv)} isNew={isNew(lv)} underNew={underNew(lv)}
            enabled={enabled(lv) && !(lv === "subCategory" && (useNone || !!subOff))} inputRef={(el) => { refs.current[lv] = el; }}
            onType={(v) => typeIn(lv, v)} onPick={(n) => pick(lv, n)} error={errors[lv]} close={close[lv] ?? []} keep={!!keep[lv]}
            onKeep={() => setKeep((k) => ({ ...k, [lv]: true }))} onUse={(c) => { const n = optionsFor(lv).find((x) => x.key === c.key); if (n) pick(lv, n); }}
            extra={lv === "subCategory" ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {subOff ? <span className="text-text-muted" data-sub-off>{subOff}</span> : (
                  <label className={cn("flex flex-wrap items-center gap-x-1.5", catHasSubs && "opacity-60")}>
                    <input type="checkbox" checked={useNone} disabled={catHasSubs} onChange={(e) => { setNone(e.target.checked); if (!e.target.checked) requestAnimationFrame(() => refs.current.subCategory?.focus()); }} data-none />
                    None: the category is the combination
                    <span className="w-full pl-5 text-text-muted">{catHasSubs ? `(${catNode!.label} has sub-categories: choose or add one)` : "(add one only when IRCC files it as its own application)"}</span>
                  </label>)}
              </div>) : null} />
        ))}
        {showLocs ? (
          <div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-medium">Cases may be opened from</span><LocationPicker value={locs} onChange={setLocs} label="Cases may be opened from" /><span className="text-text-muted">Sample until the immigration expert confirms.</span></div>
        ) : null}
        <div className="rounded-lg bg-surface px-3 py-2.5 text-sm" aria-live="polite" data-you-are-adding>
          <span className="text-text-muted">You are adding </span>
          {path.length ? (
            <>
              <span className="text-lv0">{TYPES.find((t) => t.value === type)!.label}</span>
              {path.map((lv) => <span key={lv}><span className="text-text-muted"> › </span><span className={cn(lv === "pathway" ? "text-lv1" : lv === "program" ? "text-lv2" : "text-lv3", lv === "category" && "font-semibold")}>{text[lv].trim()}</span>{isNew(lv) ? <span className="ml-1 rounded bg-primary/10 px-1 text-[11px] font-semibold text-text-link">New</span> : null}</span>)}
              {last === "category" && useNone ? <span className="text-text-muted"> › No sub-category</span> : null}
              <p className="mt-1 text-xs text-text-muted" data-adding-summary>
                {short ? `Now choose or type the ${WORD[aim].toLowerCase()}.` : exists ? "All of it is already in the Program structure." : `${fresh.length} new ${fresh.length === 1 ? "name" : "names"}${makesCombination ? " · 1 combination, listed on Immigration programs as Not started; no setup starts." : "."}`}
              </p>
            </>
          ) : <span className="text-text-muted">nothing yet: choose the Pathway first.</span>}
        </div>
        {problem ? <p role="alert" className="text-sm text-text-danger" data-add-problem>{problem.text} {problem.existing ? <button type="button" className="font-semibold text-text-link underline underline-offset-2" onClick={() => onShow(problem.existing!)}>Show it</button> : null}</p> : null}
        {exists && !problem ? <p className="text-sm text-text-muted" data-add-exists>Already in the Program structure. <button type="button" className="font-semibold text-text-link underline underline-offset-2" onClick={() => onShow(sel[last!]!)}>Show it</button></p> : null}
      </div>
    </Dialog>
  );
}

/** One level: pick a name under the field above, or type a new one (tagged New); checks show under it as you type. */
function NameField({ level, label, value, options, isNew, underNew, enabled, inputRef, onType, onPick, error, close, keep, onKeep, onUse, extra }: {
  level: Level; label: string; value: string; options: StructureNode[]; isNew: boolean; underNew: boolean; enabled: boolean;
  inputRef: (el: HTMLInputElement | null) => void; onType: (v: string) => void; onPick: (n: StructureNode) => void;
  error?: string; close: Close[]; keep: boolean; onKeep: () => void; onUse: (c: Close) => void; extra?: React.ReactNode;
}) {
  const [show, setShow] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const id = React.useId();
  const shown = options.filter((n) => !value.trim() || norm(n.label).includes(norm(value))).slice(0, 12);
  const choose = (n: StructureNode) => { onPick(n); setShow(false); };
  const levelName: LevelName = level;
  return (
    <div className="space-y-1" data-field={level}>
      <label htmlFor={`${id}-in`} className="flex items-center gap-1.5 text-xs font-medium"><LevelMark level={levelName} />{label}
        {isNew ? <span className="rounded bg-primary/10 px-1 text-[11px] font-semibold text-text-link" data-new>New</span> : null}
        {underNew && !value ? <span className="font-normal text-text-muted">(new, under a new name)</span> : null}
      </label>
      {extra}
      <div className="relative">
        <input id={`${id}-in`} ref={inputRef} role="combobox" aria-expanded={show && enabled && (shown.length > 0 || !!value.trim())} aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-invalid={error ? true : undefined} aria-describedby={`${id}-hint`} disabled={!enabled} value={value} placeholder={enabled ? (options.length ? `Pick or type a ${label.toLowerCase()}` : `Type a new ${label.toLowerCase()} (${EXAMPLE[level]})`) : ""}
          onChange={(e) => { onType(e.target.value); setShow(true); setActive(0); }} onFocus={() => setShow(true)} onBlur={() => setTimeout(() => setShow(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setShow(true); setActive((a) => Math.min(a + 1, shown.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && show && shown[active] && norm(shown[active].label) !== norm(value)) { e.preventDefault(); choose(shown[active]); }
            else if (e.key === "Escape" && show) { e.stopPropagation(); setShow(false); }
          }}
          className={cn("h-9 w-full rounded-lg border bg-surface-raised px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-60", error ? "border-danger" : "border-border-strong")} />
        {show && enabled && (shown.length || value.trim()) ? (
          <ul id={`${id}-list`} role="listbox" aria-label={`${label} names`} className="absolute z-[70] mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface-raised p-1 text-sm shadow-lg">
            {shown.map((n, i) => (
              <li key={n.key} role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); choose(n); }}
                className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5", i === active ? "bg-text/5" : "hover:bg-text/5")}>{n.label}{n.retired ? <span className="text-xs text-text-muted">(retired)</span> : null}</li>
            ))}
            {value.trim() && !options.some((n) => norm(n.label) === norm(value)) ? (
              <li role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); setShow(false); }} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-text-link hover:bg-text/5">
                Add “{value.trim()}” <span className="rounded bg-primary/10 px-1 text-[11px] font-semibold">New</span>
              </li>) : null}
          </ul>) : null}
      </div>
      <div id={`${id}-hint`} className="text-xs" aria-live="polite">
        {error ? <p role="alert" className="text-text-danger">{error}</p>
          : isNew && close.length && !keep ? (
            <div className="rounded-lg border border-warn/40 bg-warn/10 px-2.5 py-1.5 text-text" data-close>
              Did you mean {close.slice(0, 3).map((c, i) => <span key={c.key}>{i ? ", " : ""}<b>{c.trail.join(" › ")}</b> <span className="text-text-muted">({c.why})</span></span>)}?
              <span className="ml-2 inline-flex gap-1.5">
                {options.some((n) => n.key === close[0].key) ? <Button size="sm" variant="secondary" onClick={() => onUse(close[0])}>Use it</Button> : null}
                <Tip tip="Keeps your name; Activity records that close names existed."><Button size="sm" variant="ghost" onClick={onKeep} data-keep>Keep mine</Button></Tip>
              </span>
            </div>)
          : isNew ? <p className="text-text-muted">New {label.toLowerCase()} · no exact match · {keep ? "kept although close names exist" : "no close spelling"}</p>
          : value.trim() ? <p className="text-text-muted">Uses the existing {label.toLowerCase()}.</p> : null}
      </div>
    </div>
  );
}
