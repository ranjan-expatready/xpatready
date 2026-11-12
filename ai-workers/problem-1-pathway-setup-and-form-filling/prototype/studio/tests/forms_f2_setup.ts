// Scaffolding (P-33) shared by the F2 checks (forms lane): the steps a content team and a case officer take through the
// API before the browser extension fills a screen, on an isolated copy only (M4: the demo seed's channel is never
// changed). Not under test here; each check tests its own part.
//   setupVisitorVisa: the runtime lane's visitor-visa setup (released, IMM 5257 filed as a PDF)
//   releaseOnline: IMM 5257 filed Online, on that version's portal, from an approved online version: screen map (no AI), the UCI marked "You answer
//     this on screen" by the immigration expert role (Q3, Sample), the sex option map, submit, sign-off, release
//   openCase: a case on the newest release with the principal's identity facts entered and confirmed by the officer
import { execFileSync } from "node:child_process";
import { join } from "node:path";

type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
export type Call = (method: string, path: string, body?: unknown, actor?: string) => Promise<Res>;
const STUDIO = join(import.meta.dirname, "..");
export const SEX_MAP = { f_female: "FEMALE", m_male: "MALE", u_unknown: "UNKNOWN", x_another_gender: "ANOTHER" };

export function setupVisitorVisa(port: number, db: string) {
  execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(port), db], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 600_000 });
}

/** Files IMM 5257 Online with the approved online version `ed` and releases the visitor visa again. */
export async function releaseOnline(call: Call, sql: (q: string) => string, vv: string, ed: string, opts: { unused?: string[]; note: string }) {
  // The combination files through the portal the approved online version was captured on (P-98: the APR Portal unless a
  // check chose another).
  await call("PATCH", `/combinations/${vv}/portal`, { portal: sql(`select portal_key from form_edition where id='${ed}'`) });
  await call("PATCH", `/combinations/${vv}/forms/IMM 5257/channel`, { channel: "ONLINE" });
  await call("POST", `/online-versions/${ed}/screen-map/draft`);
  await call("POST", `/online-versions/${ed}/screen-map/accept`, {}, "user-C");
  for (const i of sql(`select data_path from form_field_map where form_edition_id='${ed}' and outcome='unresolved'`).split("\n").filter(Boolean))
    if (i !== "uci") await call("PATCH", `/online-versions/${ed}/screen-map`, i === "birthCity" ? { input: i, fact: "person.place_of_birth_city" } : { input: i, notAFact: true, reason: "Asked elsewhere in this case (F2 setup)" }, "user-C");
  await call("PATCH", `/online-versions/${ed}/screen-map`, { input: "uci", answerOnScreen: true, reason: "Sample: the representative answers this on the portal" }, "user-C");
  await call("POST", `/editions/${ed}/option-maps/draft`);
  await call("PATCH", `/editions/${ed}/option-maps`, { dataPath: "sex", map: SEX_MAP, unused: opts.unused ?? [] });
  await call("POST", `/combinations/${vv}/submit`, { note: opts.note });
  const sub = (await call("GET", `/combinations/${vv}/review`, undefined, "user-C")).body.submission;
  await call("POST", `/combinations/${vv}/signoff`, { items: (sub?.changeSummary ?? []).map((x: { kind: string; key: string }) => `${x.kind}|${x.key}`), action: "signed" }, "user-C");
  return call("POST", `/combinations/${vv}/approve`, undefined, "user-B");
}

/** A case on the newest release; the officer enters the given facts for the principal and confirms their sections. */
export async function openCase(call: Call, vv: string, reference: string, facts: [string, unknown][], confirm: string[]) {
  const OFFICER = "user-O";
  const c = (await call("POST", "/runtime/cases", { combinationId: vv, reference, clientActor: "user-P", principal: { displayName: "Client A" } }, OFFICER)).body;
  const P = (await call("GET", `/runtime/cases/${c.id}`, undefined, OFFICER)).body.people.find((x: { role: string }) => x.role === "principal").subject_id as string;
  type View = { sections: { section: string; subjectId: string; questions: { fact: string; subjectId: string; answer?: { id: string } }[] }[] };
  const view = async () => (await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, OFFICER)).body as View;
  const save = async (fact: string, value: unknown) => { const q = (await view()).sections.flatMap((s) => s.questions).find((x) => x.subjectId === P && x.fact === fact); return call("PUT", `/runtime/cases/${c.id}/answers/${P}/${fact}`, { value, expectedId: q?.answer?.id ?? null }, OFFICER); };
  for (const [f, v] of facts) await save(f, v);
  for (const f of confirm) {
    const s = (await view()).sections.find((x) => x.subjectId === P && x.questions.some((q) => q.fact === f))!;
    await call("POST", `/runtime/cases/${c.id}/sections/${s.section}/confirm`, { subjectId: P, seen: s.questions.filter((q) => q.subjectId === P && q.answer).map((q) => q.answer!.id) }, OFFICER);
  }
  return { id: c.id as string, principal: P, save };
}
