// C7.3 packs' shared set-up (C7.3-tick, C7.3-screen): a new case with one principal and that person's Online form item:
// the release's Online line (row C1's expectedFor), else the application form filed Online on the case (C11.6), as
// C7.3.test.ts does. No form number written here (P-319).
import { OFFICER, call, expectedFor, itemsOf, needVisitorVisa, openCase, prepare, yearsAgo } from "./m3.ts";

/** The principal's Online form item on a new case: the release's Online line, else the application filed Online (C11.6). */
export async function onlineItemOf(name: string): Promise<{ caseId: string; subject: string; itemId: string; form: string } | null> {
  const vv = needVisitorVisa();
  const c = await openCase(vv, [{ role: "principal", name, dob: yearsAgo(39) }]);
  const P = c.subjects[name];
  let p = (await prepare(c.id)).p;
  const mine = (await expectedFor(c.id))?.[name];
  const online = mine?.forms.find((l) => l.online), app = mine?.forms.find((l) => l.barcode)?.form;
  if (!online) {
    if (!app) return null;
    const it = itemsOf(p, P, app)[0];
    const moved = await call("PATCH", `/runtime/items/${it?.id}/channel`, { channel: "ONLINE", version: (p as { version?: string } | null)?.version }, OFFICER);
    if (moved.status !== 200) return null;
    p = (await prepare(c.id)).p;
  }
  const form = online?.form ?? app!;
  const item = itemsOf(p, P, form)[0];
  return item ? { caseId: c.id, subject: P, itemId: item.id, form } : null;
}
