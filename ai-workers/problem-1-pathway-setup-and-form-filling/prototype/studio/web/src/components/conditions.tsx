// Conditions in the team's closed 11-operator vocabulary (eq, neq, in, gt, gte, lt, lte, exists, and, or, not) with a
// root subjectKind. The builder edits a flat "all of / any of" list of comparisons; anything more nested is edited as
// JSON. Every change is checked by the server against the library's field types; nothing here runs code.
import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { Button, Input, Select, Textarea } from "@/components/ui/controls";
import { fieldName } from "@/lib/field-name";

export type Tree = any;
export type FieldInfo = { key: string; meaning: string; value_type: string; name?: string | null };
/** UX-A part 4 (break M3): a field is offered and shown by its name; the condition still stores its key. */
const baseName = (f: FieldInfo) => f.name || fieldName(f.key);
const OPS: [string, string][] = [["eq", "is"], ["neq", "is not"], ["in", "is one of"], ["gt", "is after / more than"], ["gte", "is on or after / at least"], ["lt", "is before / less than"], ["lte", "is on or before / at most"], ["exists", "is answered"]];
const SUBJECTS: [string, string][] = [["EACH_APPLICANT", "each applicant"], ["CASE", "the application (once)"], ["PRINCIPAL", "the principal applicant"], ["SPOUSE", "the spouse or partner"], ["DEPENDENT", "each child"], ["EACH_PERSON", "each person"]];
export const subjectLabel = (k?: string) => SUBJECTS.find(([v]) => v === k)?.[1] ?? (k === "PERSON" ? "each person" : k) ?? ""; // PERSON: an eligibility gate (B106)

export function plainCondition(t: Tree, meaning: (k: string) => string = (k) => k): string {
  if (!t) return "always";
  const walk = (n: any): string => {
    if (!n) return "";
    if (n.op === "and" || n.op === "or") return n.args.map((a: any) => (a.op === "and" || a.op === "or" ? `(${walk(a)})` : walk(a))).join(n.op === "and" ? " and " : " or ");
    if (n.op === "not") return `not (${walk(n.arg)})`;
    const f = meaning(n.field);
    const v = Array.isArray(n.value) ? n.value.join(" / ") : typeof n.value === "boolean" ? (n.value ? "yes" : "no") : n.value;
    if (n.op === "exists") return `${f} is answered`;
    return `${f} ${OPS.find(([o]) => o === n.op)?.[1] ?? n.op} ${v}`;
  };
  const { subjectKind, ...node } = t;
  return `For ${subjectLabel(subjectKind)}: ${walk(node)}`;
}

type Row = { field: string; op: string; value: string };
const isFlat = (t: Tree) => { if (!t) return true; const { subjectKind: _s, ...n } = t; const leaf = (x: any) => x && x.field && !x.args && !x.arg; return leaf(n) || ((n.op === "and" || n.op === "or") && n.args.every(leaf)); };
const toRows = (t: Tree): { combine: "and" | "or"; rows: Row[] } => {
  if (!t) return { combine: "and", rows: [{ field: "", op: "eq", value: "" }] };
  const { subjectKind: _s, ...n } = t;
  const leaves = n.args ?? [n];
  return { combine: n.op === "or" ? "or" : "and", rows: leaves.map((l: any) => ({ field: l.field, op: l.op, value: Array.isArray(l.value) ? l.value.join(", ") : l.value === undefined ? "" : String(l.value) })) };
};
const typed = (raw: string, type: string): any => {
  if (type === "yes_no") return raw === "true" ? true : raw === "false" ? false : raw;
  if (type === "number" && raw.trim() !== "" && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
};

/** A calculated value's answer type from the words of its key (review r3-n1, break r3-m4: whole words, so "country" is
 *  not "count"); the derived table holds no type. */
export const derivedType = (key: string) => {
  const w = (key.split(".").pop() ?? key).split("_");
  if (w.includes("differs") || w[0] === "is" || w[0] === "has") return "yes_no";
  if (w.includes("date")) return "date";
  return w.some((x) => ["days", "age", "years", "months", "count", "number"].includes(x)) ? "number" : "text";
};

/** `only="person-questions"` (B106 Q1, eligibility gates; default off, so the other users are unchanged): the rule is
 *  checked for each person (subjectKind PERSON, the one kind a gate takes, C6.9 BR-2a), only the library's questions
 *  are offered (a calculated value is refused at release, engine/eligibility-gates.ts gateProblems), and a yes/no
 *  declaration is compared as true or false, as a yes/no question is (break M1 (b): the text "false" never equals no). */
export function ConditionBuilder({ value, onChange, fields, defaultSubject = "EACH_APPLICANT", only }: { value: Tree; onChange: (t: Tree | null) => void; fields: FieldInfo[]; defaultSubject?: string; only?: "person-questions" }) {
  const gate = only === "person-questions";
  const [json, setJson] = React.useState(!isFlat(value));
  const [text, setText] = React.useState(value ? JSON.stringify(value, null, 1) : "");
  const [errors, setErrors] = React.useState<string[]>([]);
  // Break R2-M1: while a person types, the box keeps exactly what they typed (a name that is the start of another, such
  // as "Email" in "Email address", never swaps the text); the condition stores the key of a whole name only.
  const [typing, setTyping] = React.useState<Record<number, string>>({});
  // Break R3-M1, R3-M2: the editor keeps its own rows, an empty one included, so clearing a field box to retype it never
  // moves the rows below up under the text being typed, and "Add a comparison" shows its new row. The condition sent out
  // leaves empty rows out; a condition that changes from outside (Edit as JSON, a reload) is read in again.
  const norm = (t: Tree) => JSON.stringify(t ?? null);
  const [local, setLocal] = React.useState(() => ({ subject: (gate ? "PERSON" : value?.subjectKind ?? defaultSubject) as string, ...toRows(value) }));
  const emitted = React.useRef(norm(value));
  React.useEffect(() => {
    if (norm(value) === emitted.current) return;
    emitted.current = norm(value); setLocal({ subject: gate ? "PERSON" : value?.subjectKind ?? defaultSubject, ...toRows(value) }); setTyping({});
  }, [norm(value)]);
  const { subject, combine, rows } = local;
  // Break R2-M2: calculated values (age, days until expiry) are offered by name beside the library's fields.
  const derivedQ = useApi<{ key: string; plain: string; executable?: boolean }[]>(["library-derived"], gate ? null : "/library/derived", { staleTime: 60_000 });
  const derived: (FieldInfo & { executable?: boolean })[] = React.useMemo(() => (derivedQ.data ?? []).map((d) => ({ key: d.key, meaning: d.plain, value_type: derivedType(d.key), executable: d.executable !== false, name: `${fieldName(d.key)} (calculated)` })), [derivedQ.data]);
  const offered = React.useMemo(() => [...fields, ...derived], [fields, derived]);
  const typeOf = (k: string) => { const t = offered.find((f) => f.key === k)?.value_type ?? derivedType(k); return gate && t === "declaration" ? "yes_no" : t; };
  const listId = React.useId();

  React.useEffect(() => {
    if (!value) { setErrors([]); return; }
    const h = setTimeout(() => { api("/conditions/check", { method: "POST", json: { condition: value } }).then((r) => setErrors(r.errors)).catch((e) => setErrors([e.message])); }, 250);
    return () => clearTimeout(h);
  }, [JSON.stringify(value)]);

  const build = (sub: string, comb: string, rsIn: Row[]) => {
    const rs = rsIn.length ? rsIn : [{ field: "", op: "eq", value: "" }];
    setLocal({ subject: sub, combine: comb === "or" ? "or" : "and", rows: rs });
    const send = (t: Tree | null) => { emitted.current = norm(t); onChange(t); };
    const leaves = rs.filter((r) => r.field).map((r) => (r.op === "exists" ? { op: "exists", field: r.field } : r.op === "in" ? { op: "in", field: r.field, value: r.value.split(",").map((x) => typed(x.trim(), typeOf(r.field))).filter((x) => x !== "") } : { op: r.op, field: r.field, value: typed(r.value, typeOf(r.field)) }));
    if (!leaves.length) return send(null);
    send(leaves.length === 1 ? { subjectKind: sub, ...leaves[0] } : { subjectKind: sub, op: comb, args: leaves });
  };
  // The field box shows a known field's name; a name typed or chosen becomes its key (a key typed still works; a value
  // that is not a library field, such as a derived age, stays as typed).
  // Two fields with one name are told apart by the group they belong to ("Family name (person)", "Family name (case)").
  const nameOf = React.useMemo(() => { const n = new Map<string, number>(); for (const f of offered) n.set(baseName(f), (n.get(baseName(f)) ?? 0) + 1); return (f: FieldInfo) => (n.get(baseName(f)) ?? 0) > 1 ? `${baseName(f)} (${(f.key.split(".")[0] ?? "").replace(/_/g, " ")})` : baseName(f); }, [offered]);
  // A key the editor does not offer (a retired field, break r2-m4) is shown in words too; its warning says what it is.
  const shownField = (k: string) => { const f = offered.find((x) => x.key === k); return f ? nameOf(f) : /^[a-z][a-z0-9_]*\.[a-z0-9_.]+$/.test(k) ? fieldName(k) : k; };
  const keyOf = (t: string) => { const v = t.trim().toLowerCase(); return offered.find((x) => x.key === t.trim())?.key ?? offered.find((x) => nameOf(x).toLowerCase() === v)?.key ?? t; };
  const sameName = (t: string) => offered.filter((x) => baseName(x).toLowerCase() === t.trim().toLowerCase());
  if (json) return (
    <div className="flex flex-col gap-2">
      <Textarea className="mono min-h-32" value={text} onChange={(e) => { setText(e.target.value); try { onChange(JSON.parse(e.target.value)); } catch { setErrors(["not valid JSON yet"]); } }} aria-label="Condition as JSON" />
      <div className="flex items-center justify-between"><Errors errors={errors} />{isFlat(value) ? <Button size="sm" variant="ghost" onClick={() => setJson(false)}>Use the simple editor</Button> : null}</div>
    </div>
  );
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {gate ? <span className="text-text-muted" data-subject-fixed>Checked for each person</span> : <>
        <span className="text-text-muted">Evaluate for</span>
        <Select className="w-auto" value={subject} onChange={(e) => build(e.target.value, combine, rows)} aria-label="Whom the condition is evaluated for">{SUBJECTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></>}
        <span className="text-text-muted">when</span>
        <Select className="w-auto" value={combine} onChange={(e) => build(subject, e.target.value, rows)} aria-label="Combine">{[["and", "all of these are true"], ["or", "any of these is true"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
      </div>
      <datalist id={listId}>{offered.map((f) => <option key={f.key} value={nameOf(f)}>{f.meaning}</option>)}</datalist>
      {rows.map((r, i) => {
        const t = typeOf(r.field);
        const set = (p: Partial<Row>) => build(subject, combine, rows.map((x, j) => (j === i ? { ...x, ...p } : x)));
        return (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
            <Input list={listId} value={typing[i] ?? shownField(r.field)} placeholder={gate ? "question, e.g. Passport number" : "field, e.g. Marital status"} onChange={(e) => { const v = e.target.value; setTyping((t) => ({ ...t, [i]: v })); set({ field: keyOf(v) }); }} onBlur={() => setTyping((t) => { const { [i]: _drop, ...rest } = t; return rest; })} aria-label="Field" />
            <Select className="w-44" value={r.op} onChange={(e) => set({ op: e.target.value })} aria-label="Comparison">{OPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            {r.op === "exists" ? <span className="text-xs text-text-muted">(no value)</span>
              : t === "yes_no" && r.op !== "in" ? <Select value={r.value} onChange={(e) => set({ value: e.target.value })} aria-label="Value"><option value="">choose</option><option value="true">yes</option><option value="false">no</option></Select>
              : <Input type={t === "date" && r.op !== "in" ? "date" : "text"} value={r.value} placeholder={r.op === "in" ? "values, separated by commas" : t === "number" ? "number" : "value"} onChange={(e) => set({ value: e.target.value })} aria-label="Value" />}
            <Button size="icon" variant="ghost" aria-label="Remove this comparison" onClick={() => build(subject, combine, rows.filter((_, j) => j !== i))}><Trash2 /></Button>
            {!r.field ? null
              : derived.some((f) => f.key === r.field) ? <p className={`col-span-4 -mt-1 text-xs ${derived.find((f) => f.key === r.field)?.executable ? "text-text-muted" : "text-text-warn"}`}>Calculated: {derived.find((f) => f.key === r.field)?.meaning}{derived.find((f) => f.key === r.field)?.executable ? "" : " Not worked out by the studio yet, so a condition on it cannot be decided on a case."}</p>
              : fields.some((f) => f.key === r.field) ? <p className="col-span-4 -mt-1 text-xs text-text-muted">{fields.find((f) => f.key === r.field)?.meaning} · {t}</p>
              : gate ? <p className="col-span-4 -mt-1 text-xs text-text-warn">"{shownField(r.field)}" is not a question in the library. Choose one from the list: a gate reads only the answers a case is asked.</p>
              : sameName(typing[i] ?? r.field).length > 1 ? <p className="col-span-4 -mt-1 text-xs text-text-warn">{sameName(typing[i] ?? r.field).length} fields are named "{(typing[i] ?? r.field).trim()}": choose one from the list ({sameName(typing[i] ?? r.field).map(nameOf).join(" or ")}).</p>
              : <p className="col-span-4 -mt-1 text-xs text-text-warn">"{shownField(r.field)}" is not a library field or a calculated value yet. The draft saves; release waits until the fact is added from Smart questionnaire (SQR) › Facts a rule needs, or a calculated value is chosen from the list.</p>}
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => build(subject, combine, [...rows, { field: "", op: "eq", value: "" }])}><Plus /> Add a comparison</Button><Button size="sm" variant="ghost" onClick={() => { setText(value ? JSON.stringify(value, null, 1) : ""); setJson(true); }}>Edit as JSON</Button></div>
        <Errors errors={errors} />
      </div>
    </div>
  );
}

function Errors({ errors }: { errors: string[] }) {
  if (!errors.length) return <span className="text-xs text-text-ok">Condition is valid</span>;
  return <span className="text-xs text-text-danger">{errors.slice(0, 2).join("; ")}</span>;
}
