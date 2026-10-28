// W1-visual-system VS-8: every level text colour (web/src/styles/levels.css) is at least 4.5:1 (WCAG 1.4.3) on the
// surfaces it sits on, in the light and the dark theme: the raised card, the page surface and its own band tint. A
// fail fixture at 4.4:1 proves the check can fail. No server, no model call.
//   tsx studio/tests/check_w1_level_tokens.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(import.meta.dirname, "..", "web", "src", "styles", "levels.css"), "utf8");
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`); };

const block = (sel: string) => { const m = css.match(new RegExp(`${sel.replace(/[[\]']/g, "\\$&")}\\s*\\{([^}]*)\\}`)); return Object.fromEntries([...(m?.[1] ?? "").matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((x) => [x[1], x[2]])); };
const light = block(":root"), dark = block("[data-theme='dark']");
const lum = (hex: string) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

// The team's surfaces (tokens.css): light raised #ffffff and surface #f7f7f7; dark raised #182634 and surface #14202c.
const SURFACES = { light: { raised: "#ffffff", surface: "#f7f7f7" }, dark: { raised: "#182634", surface: "#14202c" } };
ok("setup: the four level colours and their tints are read from levels.css in both themes", ["lv0", "lv1", "lv2", "lv3", "lv1-t", "lv2-t", "lv3-t"].every((k) => light[k] && dark[k]), { light, dark });
for (const [theme, t] of [["light", light], ["dark", dark]] as const) {
  for (const lv of ["lv0", "lv1", "lv2", "lv3"]) {
    const on = { ...SURFACES[theme], ...(t[`${lv}-t`] ? { "own tint": t[`${lv}-t`] } : {}), ...(lv !== "lv1" && t["lv1-t"] ? { "Pathway band": t["lv1-t"] } : {}) };
    for (const [where, bg] of Object.entries(on)) {
      const r = ratio(t[lv], bg);
      ok(`VS-8 ${theme}: --${lv} on the ${where} is at least 4.5:1`, r >= 4.5, `${t[lv]} on ${bg}: ${r.toFixed(2)}:1`);
    }
  }
}
// VS-2: a level colour never reuses a status colour (green Live, red Not ready, orange need you, violet AI, blue links).
const STATUS = ["#16a34a", "#0f5c2e", "#dc2626", "#991b1b", "#ff8500", "#663200", "#6d28d9", "#0862c5", "#054e9c"];
ok("VS-2: no light level colour is a status colour", ["lv0", "lv1", "lv2", "lv3"].every((k) => !STATUS.includes(light[k].toLowerCase())));
// The check can fail: a grey at about 4.4:1 on white is refused.
ok("fail fixture: #777777 on white (about 4.48:1) is below 4.5:1 and refused", ratio("#777777", "#ffffff") < 4.5, ratio("#777777", "#ffffff").toFixed(2));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
