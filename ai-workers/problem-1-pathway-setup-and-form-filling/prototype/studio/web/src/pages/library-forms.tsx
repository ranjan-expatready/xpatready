// Shared library › Forms (the form upload's home outside a combination) and › Checks (built with Screen 04).
import * as React from "react";
import { Link } from "react-router-dom";
import { FileUp } from "lucide-react";
import { api, queryClient, useActorId, useApi } from "@/lib/api";
import { RunCard } from "@/components/run-card";
import { Tip, TipProvider } from "@/components/status";
import { Button, Notice, Pill, Table } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { FormIntake, type LibraryForm } from "@/components/forms";

export function FormsPage() {
  const actorId = useActorId();
  const session = useApi<any>(["session", actorId], "/session");
  const lib = useApi<LibraryForm[]>(["library-forms"], "/library/forms");
  const canAuthor = (session.data?.actor?.duties ?? []).includes("author");
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div><h1 className="text-2xl font-bold tracking-tight">Forms</h1><p className="mt-1 text-sm text-text-muted">Government forms in the shared library. Each form is defined once; combinations attach it. A new edition date is a new edition of the same form.</p></div>
      {canAuthor ? <UploadPdf /> : null}
      {canAuthor ? <FormIntake title="Add forms to the library" /> : null}
      {lib.isLoading ? <Spinner label="Loading forms" /> : lib.isError ? <Notice tone="danger" title="The forms could not be loaded">{(lib.error as Error).message}</Notice> : !lib.data?.length ? (
        <EmptyState title="No forms yet" description="Upload an official IRCC PDF above, or load the sample inputs: forms join the library as combinations are set up." />
      ) : (
        <Table head={["Form", "Title", "Editions", "Used in"]}>
          {lib.data.map((f) => (
            <tr key={f.code}>
              <td className="mono whitespace-nowrap">{f.code}</td>
              <td>{f.title}{f.kind !== "data_form" ? <Pill tone="neutral" className="ml-2">Checklist or instructions</Pill> : null}{f.online_only ? <Pill tone="warn" className="ml-2" title="Only an online version of this form is stored; online filling needs the browser extension (later wave). Add its official PDF to use it.">Online version only · later wave</Pill> : null}</td>
              <td>{f.editions.length ? f.editions.map((e) => <p key={e.label} className="whitespace-nowrap">{e.label.replace(`${f.code} `, "")} · {e.mapped ? `${e.boxes} form fields mapped` : "form fields not mapped yet"}{e.approved ? "" : " · not an approved official file"}</p>) : <span className="text-text-muted">{f.online_only ? "no PDF edition yet: add its official PDF above" : "no edition stored"}</span>}</td>
              <td className="tabular-nums">{f.usedBy} {f.usedBy === 1 ? "combination" : "combinations"}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

/** S4 slice 2: Upload PDF through the shared run: rules check the file, rules read what it is (AI only when they cannot,
 *  M1), compare with canada.ca, then the one intake adds it or holds it for a second person. The run card follows it. */
function UploadPdf() {
  const input = React.useRef<HTMLInputElement>(null);
  const [runId, setRunId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const start = async (f: File) => {
    setError(null);
    const fd = new FormData(); fd.append("files", f, f.name);
    try { const r = await api<{ runId: string }>("/library/forms/upload", { method: "POST", body: fd }); setRunId(r.runId); } catch (e) { setError((e as Error).message); }
  };
  return (
    <TipProvider><div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Tip tip="Upload one IRCC PDF. Rules check the file and read its number, edition and title (no AI when they can), compare it with canada.ca, then it joins the library, or waits for a second person unless it is the very file canada.ca links.">
          <Button onClick={() => input.current?.click()}><FileUp /> Upload PDF</Button>
        </Tip>
        <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Choose a PDF to upload" onChange={(e) => { const f = e.target.files?.[0]; if (f) void start(f); e.target.value = ""; }} />
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      </div>
      {runId ? <RunCard runId={runId} onEnded={() => void queryClient.invalidateQueries({ queryKey: ["library-forms"] })} /> : null}
    </div></TipProvider>
  );
}

export function ChecksPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div><h1 className="text-2xl font-bold tracking-tight">Checks</h1><p className="mt-1 text-sm text-text-muted">Field validation, consistency checks, document validity and AI review objectives.</p></div>
      <EmptyState title="Checks are set up on a later screen" description="This list is built with the shared-library screen (Screen 04). Combination rules and checks imported from the reviewed release are visible in each combination's full configuration." action={<Link className="text-sm text-text-link underline" to="/">Back to Immigration programs</Link>} />
    </div>
  );
}
