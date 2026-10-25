// scout lane, firm-admin-day-one (25 Oct): replayable checks for findings SC-2 and SC-4.
// SC-2 (UX · Minor): the New-combination picker shows an existing name with a bare number ("Sample Skilled Worker 1"),
//    which reads as part of the name — a best-in-class picker says what the number means. Fails until the option
//    explains the count (scout fix: "used by n").
// SC-4 (UX · Minor): the combination Overview shows "Filing: No forms yet" while forms are attached as sources — the
//    sentence contradicts the status a row below it shows. Fails until the wording tells the two apart.
//   zsh studio/tools/isolated.sh scout_x1 4480 start && node studio/tests/scout/check_sc2_sc4_1025.cjs
const { chromium } = require("../../node_modules/playwright");
const BASE = process.argv[2] ?? "http://localhost:4480";
let pass = 0, fail = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  // any existing combination (the walk creates "Sample Federal Skilled Worker" on a fresh scout copy)
  const combos = await fetch(`${BASE}/api/catalog/combinations`, { headers: { "x-actor": "user-A" } }).then((r) => r.json()).catch(() => null)
    .then((c) => Array.isArray(c) ? c : c?.combinations ?? c?.items ?? null);
  let cid = Array.isArray(combos) ? combos[0]?.id ?? combos[0]?.key : null;
  if (!cid) { // fall back to the walk's combination
    cid = "00f7ceaf-3fb8-478d-8837-420d5cd1c09d";
  }
  const comb = await fetch(`${BASE}/api/combinations/${cid}`, { headers: { "x-actor": "user-A" } }).then((r) => r.json());
  const programLabel = comb?.program?.label ?? comb?.path?.[1] ?? null;

  // SC-2: type the existing program name into the New-combination picker; the option must explain the count.
  await p.goto(`${BASE}/new`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  if (programLabel) {
    await p.locator("input[role=combobox]").nth(0).fill(programLabel); await p.waitForTimeout(500);
    const opt = await p.locator("[role=option]").nth(0).innerText().catch(() => "");
    const bare = new RegExp(`^${programLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\d+$`).test(opt.trim());
    step("SC-2: an existing name's option explains its count, not a bare number", !bare && /used by|combination/i.test(opt), JSON.stringify(opt));
  } else step("SC-2: combination found to test against", false, "no program label");

  // SC-4: on a combination whose forms are all still sources, "Filing" must not read "No forms yet".
  // (runtime S2 FIX: the overview's Forms stat carries data-filing; "attached as sources" is the missing line's words.)
  await p.goto(`${BASE}/c/${cid}`, { waitUntil: "networkidle" }); await p.waitForTimeout(600);
  const filing = await p.locator("[data-filing]").innerText().catch(() => "");
  const hasPending = await p.locator("text=/attached as source/i").count().catch(() => 0);
  if (hasPending) step("SC-4: Filing sentence distinguishes sources from set-up forms", !/Filing:\s*No forms yet/i.test(filing), filing.trim().slice(0, 120));
  else step("SC-4: combination has forms pending as sources to test against", false, "no pending sources");
  await b.close();
  console.log(fail ? `\n${fail} FAILURES — the findings stand (or the fix did not reach this copy).` : "\nAll pass.");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("ERR", e.message); process.exit(2); });
