import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Select } from "@/components/ui/controls";

export const ROLES: [string, string][] = [["principal", "Principal applicant"], ["spouse_or_partner", "Spouse or partner"], ["child", "Child"], ["representative", "Representative"], ["parent", "Parent"]];
export const roleLabel = (r: string) => ROLES.find(([v]) => v === r)?.[1] ?? r;
export function roleSummary(ps: any[]) {
  return (ps ?? []).map((p) => `${p.label}${p.max > 1 ? ` (${p.min}–${p.max})` : p.min === 0 ? " (optional)" : ""}`).join(", ");
}

/** Who is part of a combination: role, how many, whether they file their own application. */
export function ParticipantsEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const set = (i: number, p: any) => onChange(value.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1.2fr_1.2fr_70px_70px_1fr_auto] gap-2 text-[11px] font-medium uppercase tracking-wide text-text-muted"><span>Role</span><span>Shown as</span><span>Min</span><span>Max</span><span>Files own application</span><span /></div>
      {value.map((p, i) => (
        <div key={i} className="grid grid-cols-[1.2fr_1.2fr_70px_70px_1fr_auto] items-center gap-2">
          <Select value={p.role} onChange={(e) => set(i, { role: e.target.value, label: roleLabel(e.target.value) })} aria-label="Role" disabled={i === 0}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          <Input value={p.label} onChange={(e) => set(i, { label: e.target.value })} aria-label="Shown as" />
          <Input type="number" min={0} max={9} value={p.min} onChange={(e) => set(i, { min: Number(e.target.value) })} aria-label="Minimum" disabled={i === 0} />
          <Input type="number" min={1} max={9} value={p.max} onChange={(e) => set(i, { max: Number(e.target.value) })} aria-label="Maximum" disabled={i === 0} />
          <Select value={p.applies === false ? "no" : "yes"} onChange={(e) => set(i, { applies: e.target.value === "yes" })} aria-label="Files own application" disabled={p.role === "representative"}><option value="yes">Yes, files their own forms</option><option value="no">No, included on others' forms</option></Select>
          <Button size="icon" variant="ghost" aria-label="Remove" disabled={i === 0} onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 /></Button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...value, { role: "spouse_or_partner", label: "Spouse or partner", min: 0, max: 1, preview: 1, applies: true }])}><Plus /> Add a person</Button>
    </div>
  );
}
