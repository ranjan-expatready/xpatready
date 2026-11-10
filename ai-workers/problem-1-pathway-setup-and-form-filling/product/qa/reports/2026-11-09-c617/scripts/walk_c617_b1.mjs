// Gate A part B1: open a study-permit case (stage 1), add a library form to its filing (C7.8), 1440 px, by screens.
//   node walk_c617_b1.mjs <port> <outDir>
import { start } from "./lib.mjs";
const [port, out] = process.argv.slice(2);
const { b, p, errors, shot, say } = await start(port, out);
await p.goto("/cases"); await p.waitForLoadState("networkidle");
await p.getByRole("button", { name: "Open a case" }).click();
const d = p.getByRole("dialog"); await d.waitFor();
await d.getByLabel("Combination (released)").selectOption({ label: "Outside Canada · release 1" });
await p.waitForTimeout(600);
say("open dialog (study)", (await d.innerText()).slice(0, 600));
await d.getByLabel("Case reference").fill("QA-C617-STAGES");
await d.getByLabel("Principal applicant's name").fill("Sample Client S");
await d.getByLabel("Client login that answers").selectOption({ label: "Client B (simulated)" });
await d.getByRole("button", { name: "Open case" }).click();
await p.waitForURL(/\/cases\/[0-9a-f-]{36}/, { timeout: 30000 }); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1000);
say("case url", p.url());
const main = await p.locator("main").innerText();
say("stages part", main.slice(main.indexOf("Stages"), main.indexOf("Stages") + 400));
await shot("B01-study-case-stage-1", null);
// C7.8 on stage 1
const addBtn = p.getByRole("button", { name: /Add a form to .*filing/ }).first();
await addBtn.scrollIntoViewIfNeeded(); await addBtn.click();
const panel = p.getByRole("dialog"); await panel.waitFor(); await p.waitForTimeout(600);
const box = panel.getByRole("combobox"); await box.fill("IMM"); await p.waitForTimeout(1200);
const rows = await panel.locator("[data-addable]").evaluateAll((els) => els.map((e) => `${e.getAttribute("data-addable")}|${e.getAttribute("data-kind")}|${e.getAttribute("data-refused") ?? ""}|${e.innerText.replace(/\s+/g, " ").slice(0, 100)}`));
rows.forEach((r) => console.log("   ", r));
const blank = rows.find((r) => r.split("|")[1] === "blank" && !r.split("|")[2])?.split("|")[0];
say("pick blank", blank);
await box.fill(blank); await p.waitForTimeout(900);
await panel.locator(`[data-addable="${blank}"]`).click(); await p.waitForTimeout(700);
await shot("B02-add-blank-form-stage-1", panel);
await panel.getByRole("button", { name: /^Add to / }).click(); await p.waitForTimeout(1500);
const row = p.getByText(new RegExp(`${blank.replace(/ /g, "\\s")} for Sample Client S`)).first();
await row.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
await shot("B03-added-on-stage-1-prepare", null);
say("errors", JSON.stringify(errors));
await b.close();
