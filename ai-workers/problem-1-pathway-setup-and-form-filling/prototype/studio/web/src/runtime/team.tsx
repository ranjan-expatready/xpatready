// Case team (C6.11, M3-11, BR-20; board r5c frames 1 and 2): the representative of record and the case officers on
// "Open a case", the team chip in the case header, and the firm admin's "Change" dialog (assign and reassign with
// history). The firm and its users are seeded Sample data: every place carries the "Stand-in" chip SI-9. The server
// decides who may change what; this page only offers it.
import * as React from "react";
import { History, Pencil, UserMinus, UserPlus } from "lucide-react";
import { api, ApiError, useAction, useActorId, useApi } from "@/lib/api";
import { Button, Dialog, Field, Notice, Pill, Select, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { StandIn } from "@/components/stand-in";
import type { CaseTeamLine } from "./questionnaire";

type Licence = { body: string; category: string; number: string } | null;
type FirmUser = { id: string; name: string; duties: string[]; licence: Licence; may_represent: boolean; may_be_officer: boolean };
export type FirmView = { key: string; name: string; solo: boolean; default_representative: string | null; you: { id: string; duties: string[] }; users: FirmUser[] };
type TeamView = {
  firm: { key: string; name: string; solo: boolean };
  representative: { id: string; name: string; licence: Licence; since: string } | null;
  officers: { id: string; name: string; since: string }[];
  history: { user: string; user_id: string; role: "LEAD_REPRESENTATIVE" | "OFFICER"; assigned_by: string; assigned_at: string; ended_at: string | null; ended_by: string | null; reason: string | null }[];
  imm5476: { facts: Record<string, string | null> | null; new_needed: boolean; since: string | null; earlier: string | null };
  may_assign: boolean;
};

const TODAY = "one Sample firm and one Sample solo firm, seeded.";
const LATER = "the team's AG-01 firm setup and users, and AG-07's case team.";
export const TeamStandIn = () => <StandIn id="SI-9" today={TODAY} later={LATER} />;
const licenceText = (l: Licence) => (l ? `${l.body} ${l.number}` : "");
const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function useFirm() {
  const actor = useActorId();
  return useApi<FirmView>(["runtime", "firm", actor], "/runtime/firm", { retry: false });
}

/** "Open a case" › Case team (frame 1): the representative of record and a case officer, prefilled from the firm. */
export function OpeningTeam({ firm, value, onChange, errors }: { firm: ReturnType<typeof useFirm>; value: { representative: string; officer: string }; onChange: (v: { representative: string; officer: string }) => void; errors: Record<string, string> }) {
  const f = firm.data;
  const reps = f?.users.filter((u) => u.may_represent) ?? [];
  const officers = f?.users.filter((u) => u.may_be_officer) ?? [];
  const defRep = f?.default_representative ?? (reps.length === 1 ? reps[0].id : "");
  const defOfficer = f ? (f.users.find((u) => u.may_be_officer && !u.duties.includes("represent"))?.id ?? defRep) : "";
  // The dialog shows what the server will use when nothing is chosen: the firm's defaults (a solo firm: one person, both).
  const rep = value.representative || defRep, off = value.officer || defOfficer;
  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-3">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold">Case team <TeamStandIn /></legend>
      {firm.isLoading ? <Skeleton className="h-16 w-full" /> : firm.isError ? <Notice tone="warn" title="Your firm could not be read">{(firm.error as Error).message}</Notice> : (
        <>
          <Field label="Representative of record" hint="Licensed, named on IMM 5476; IRCC deals with them." error={errors.representative}>
            <Select value={rep} onChange={(e) => onChange({ representative: e.target.value, officer: off })}>{reps.map((u) => <option key={u.id} value={u.id}>{u.name} · {licenceText(u.licence)}</option>)}</Select>
          </Field>
          <Field label="Case officer" hint="Prepares the case." error={errors.caseOfficers}>
            <Select value={off} onChange={(e) => onChange({ representative: rep, officer: e.target.value })}>{officers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          </Field>
          <p className="text-xs text-text-muted">IMM 5476's representative part fills from the representative of record.{f!.solo ? " Solo firm: the same person is both, and is offered here already filled." : ""}</p>
        </>
      )}
    </fieldset>
  );
}

/** The case header's team chip (frame 2) and, for the firm admin, "Change". */
export function CaseTeamChip({ caseId, line }: { caseId: string; line: CaseTeamLine }) {
  const [open, setOpen] = React.useState(false);
  const rep = line.representative, offs = line.officers.map((o) => o.name).join(", ");
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px]" data-testid="case-team">
      <span className="rounded-full border border-border px-2.5 py-0.5" title="Representative of record (licensed, on IMM 5476) · case officers. The firm admin changes them, with history; a new representative asks for a new IMM 5476.">
        {rep ? <>{rep.name}{rep.licence ? <span className="text-text-muted"> · {rep.licence.body} {rep.licence.number}</span> : null}</> : <span className="text-warn">No representative of record yet</span>}
        <span className="text-text-muted"> · </span>{offs || <span className="text-text-muted">no case officer</span>}
      </span>
      <TeamStandIn />
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><Pencil aria-hidden />Case team</Button>
      {open ? <TeamDialog caseId={caseId} close={() => setOpen(false)} /> : null}
    </div>
  );
}

function TeamDialog({ caseId, close }: { caseId: string; close: () => void }) {
  const team = useApi<TeamView>(["runtime", "team", caseId], `/runtime/cases/${caseId}/team`);
  const firm = useFirm();
  const [rep, setRep] = React.useState(""), [reason, setReason] = React.useState(""), [add, setAdd] = React.useState("");
  const [ending, setEnding] = React.useState<string | null>(null), [endWhy, setEndWhy] = React.useState("");
  const [err, setErr] = React.useState<Record<string, string>>({});
  const onErr = (field: string) => (e: Error) => setErr({ [field]: e instanceof ApiError ? e.field("userId") ?? e.field("reason") ?? e.message : e.message });
  const change = useAction(() => api(`/runtime/cases/${caseId}/team/representative`, { method: "PUT", json: { userId: rep, reason } }), { success: "Representative of record changed: a new IMM 5476 is needed", invalidate: [["runtime"]], onDone: () => { setRep(""); setReason(""); setErr({}); } });
  const addOff = useAction(() => api(`/runtime/cases/${caseId}/team/officers`, { method: "POST", json: { userId: add } }), { success: "Case officer assigned", invalidate: [["runtime"]], onDone: () => { setAdd(""); setErr({}); } });
  const endOff = useAction(() => api(`/runtime/cases/${caseId}/team/officers/${ending}/end`, { method: "POST", json: { reason: endWhy } }), { success: "Case officer taken off the case", invalidate: [["runtime"]], onDone: () => { setEnding(null); setEndWhy(""); setErr({}); } });
  const t = team.data, f = firm.data;
  const repChoices = f?.users.filter((u) => u.may_represent && u.id !== t?.representative?.id) ?? [];
  const addChoices = f?.users.filter((u) => u.may_be_officer && !t?.officers.some((o) => o.id === u.id)) ?? [];
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} wide title="Case team" description={<span className="inline-flex items-center gap-2">The representative of record and the case officers, with their history. <TeamStandIn /></span>}
      footer={<Button variant="ghost" onClick={close}>Close</Button>}>
      {team.isLoading || firm.isLoading ? <Skeleton className="h-40 w-full" /> : team.isError ? <Notice tone="danger" title="The case team could not be read">{(team.error as Error).message}</Notice> : (
        <div className="space-y-5 text-sm">
          {t!.imm5476.new_needed ? <Notice tone="warn" title="A new IMM 5476 is needed">The representative of record changed on {when(t!.imm5476.since!)}. IMM 5476 must name {t!.representative?.name}; the one with the earlier representative is out of date.</Notice> : null}
          <section aria-labelledby="t-rep" className="space-y-2">
            <h3 id="t-rep" className="font-semibold">Representative of record</h3>
            <p>{t!.representative ? <>{t!.representative.name} · {licenceText(t!.representative.licence)} <span className="text-text-muted">since {when(t!.representative.since)}</span></> : "None yet."}</p>
            {t!.imm5476.facts ? <p className="text-xs text-text-muted">IMM 5476 fills: membership number {t!.imm5476.facts["representative.membership_id"]}, category {t!.imm5476.facts["representative.representative_category"]?.toUpperCase()} (Sample).</p> : null}
            {t!.may_assign ? (repChoices.length ? (
              <form className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); change.mutate(undefined, { onError: onErr("rep") }); }}>
                <Field label="Change to" error={null}><Select value={rep} onChange={(e) => setRep(e.target.value)}><option value="">Choose…</option>{repChoices.map((u) => <option key={u.id} value={u.id}>{u.name} · {licenceText(u.licence)}</option>)}</Select></Field>
                <Field label="Reason" hint="Kept in the history" error={err.rep}><Textarea rows={1} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
                <Button type="submit" variant="secondary" busy={change.isPending} disabled={!rep}>Change representative</Button>
              </form>
            ) : <p className="text-xs text-text-muted">Your firm has no other licensed representative.</p>) : <p className="text-xs text-text-muted">Only the firm admin changes the case team.</p>}
          </section>
          <section aria-labelledby="t-off" className="space-y-2">
            <h3 id="t-off" className="font-semibold">Case officers</h3>
            <ul className="space-y-1.5">{t!.officers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2"><span className="font-medium">{o.name}</span><span className="text-xs text-text-muted">since {when(o.since)}</span>
                {t!.may_assign ? (ending === o.id ? (
                  <form className="flex w-full flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); endOff.mutate(undefined, { onError: onErr("end") }); }}>
                    <Field label={`Why ${o.name} leaves the case`} error={err.end} className="min-w-60 flex-1"><Textarea rows={1} value={endWhy} onChange={(e) => setEndWhy(e.target.value)} autoFocus /></Field>
                    <Button type="submit" size="sm" variant="secondary" busy={endOff.isPending}>Take off</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEnding(null)}>Cancel</Button>
                  </form>
                ) : <Button size="sm" variant="ghost" onClick={() => { setEnding(o.id); setEndWhy(""); }}><UserMinus aria-hidden />Take off</Button>) : null}
              </li>))}
              {!t!.officers.length ? <li className="text-text-muted">No case officer now.</li> : null}
            </ul>
            {t!.may_assign && addChoices.length ? (
              <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); addOff.mutate(undefined, { onError: onErr("add") }); }}>
                <Field label="Assign a case officer" error={err.add}><Select value={add} onChange={(e) => setAdd(e.target.value)}><option value="">Choose…</option>{addChoices.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
                <Button type="submit" size="sm" variant="secondary" busy={addOff.isPending} disabled={!add}><UserPlus aria-hidden />Assign</Button>
              </form>
            ) : null}
          </section>
          <section aria-labelledby="t-hist" className="space-y-2">
            <h3 id="t-hist" className="flex items-center gap-1.5 font-semibold"><History className="size-4" aria-hidden />History</h3>
            <ul className="space-y-1 text-[13px]">{t!.history.map((h, i) => (
              <li key={i} className="flex flex-wrap gap-x-2"><span className="font-medium">{h.user}</span><Pill>{h.role === "LEAD_REPRESENTATIVE" ? "Representative of record" : "Case officer"}</Pill>
                <span className="text-text-muted">from {when(h.assigned_at)}{h.ended_at ? ` to ${when(h.ended_at)}` : " · now"}</span>{h.reason ? <span className="[overflow-wrap:anywhere]">“{h.reason}”</span> : null}</li>))}
            </ul>
          </section>
        </div>
      )}
    </Dialog>
  );
}
