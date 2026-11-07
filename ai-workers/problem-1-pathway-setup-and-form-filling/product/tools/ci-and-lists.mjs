#!/usr/bin/env node
// ci-and-lists.mjs (P-214, P-376 to-do 3, found by B119): a red check must not hide behind a later green line in CI.
// GitHub runs a multi-line `run: |` step as `bash --noprofile --norc -eo pipefail`, and bash -e does not stop on a failed
// command inside an `a && b && c` list unless it is the last one: the list just returns non-zero and the next line runs,
// so `check-docs && decision-impact && graph --check` followed by a green line passed with check-docs red. This check
// fails on such a list anywhere but the step's last statement; the fix is one command per line, where -e stops at the first
// red. A single-line `run:` is read as a block of one line, so `run: a && b; echo done` fails too.
// Allowed, because they hide nothing: a test that guards an action ([ "$x" = y ] && z=1), a condition (if a && b; then),
// a list inside $( ) or [[ ]], && inside quotes or a comment, and the last statement of the last line (the step ends with
// the list's status). It errs on the strict side: a list inside an if branch or ( ) on the last line is flagged, though
// bash would end red there; split it anyway (one rule).
// Plain Node, no package (STANDARDS §1); reads files only, runs in well under a second, US$0.
//   node product/tools/ci-and-lists.mjs              check every .github/workflows/*.yml; exit 0 = none, 1 = a hidden red
//   node product/tools/ci-and-lists.mjs FILE...      check these files
//   node product/tools/ci-and-lists.mjs --self-test  prove the old layout hid a red under GitHub's bash and this check
//                                                    catches it (CI runs it)
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const WORKFLOWS = join(ROOT, ".github", "workflows");
const HINT = "bash -e passes over a failed command before the last && of a list, so a later green line hides it: put one command per line (P-376 (3))";

// The run blocks of a workflow file: [{ line, lines: [{ n, text }] }], n = 1-based line in the file. A `run: |` (or >, with
// any chomping or indentation indicator) block gives its lines; a single-line `run: cmd` gives one line, YAML-unquoted.
export function runBlocks(text) {
  const rows = text.split("\n"), blocks = [];
  for (let i = 0; i < rows.length; i++) {
    const one = rows[i].match(/^\s*(?:-\s+)?run:\s+([^|>\s].*)$/);
    if (one) { blocks.push({ line: i + 1, lines: [{ n: i + 1, text: unquote(one[1].trim()) }] }); continue; }
    const m = rows[i].match(/^(\s*)(?:-\s+)?run:\s*[|>][-+]?[1-9]?[-+]?\s*(?:#.*)?$/);
    if (!m) continue;
    const keyIndent = rows[i].search(/\S/) + (rows[i].trimStart().startsWith("-") ? 2 : 0);
    const lines = [];
    let j = i + 1;
    for (; j < rows.length; j++) {
      const r = rows[j];
      if (r.trim() === "") { lines.push({ n: j + 1, text: "" }); continue; }
      if (r.search(/\S/) <= keyIndent) break;
      lines.push({ n: j + 1, text: r.trim() });
    }
    blocks.push({ line: i + 1, lines });
    i = j - 1;
  }
  return blocks;
}

// A YAML flow scalar's text: 'a '' b' → a ' b, "a" → a (the shell sees what is inside the quotes).
function unquote(v) {
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1).replace(/\\"/g, '"');
  return v;
}

// Blank out what cannot hide a red: quoted text, comments, $( ) and [[ ]] contents. Keeps the length (columns stay put).
export function strip(s) {
  let out = "", i = 0;
  const blank = (k) => " ".repeat(k);
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") { out += "  "; i += 2; continue; }
    if (c === "'") { const e = s.indexOf("'", i + 1); const k = e < 0 ? s.length : e + 1; out += blank(k - i); i = k; continue; }
    if (c === '"') { let k = i + 1; while (k < s.length && s[k] !== '"') k += s[k] === "\\" ? 2 : 1; k = Math.min(k + 1, s.length); out += blank(k - i); i = k; continue; }
    if (c === "#" && (i === 0 || /\s/.test(s[i - 1]))) { out += blank(s.length - i); break; }
    if (c === "$" && s[i + 1] === "(") { let d = 0, k = i + 1; for (; k < s.length; k++) { if (s[k] === "(") d++; else if (s[k] === ")" && --d === 0) break; } k = Math.min(k + 1, s.length); out += blank(k - i); i = k; continue; }
    if (c === "[" && s[i + 1] === "[") { const e = s.indexOf("]]", i + 2); const k = e < 0 ? s.length : e + 2; out += "[[" + blank(k - i - 4) + (e < 0 ? "  " : "]]"); i = k; continue; }
    out += c; i++;
  }
  return out;
}

const isTest = (cmd) => /^(!\s+)?(\[\[|\[|test)(\s|$)/.test(cmd.trim());

// The hidden-red lists on one logical line (already stripped). Returns the left commands of each && list that hides a red.
// last = the step's last line: its last statement ends the step with the list's status, so only that one is exempt.
export function hiddenLists(stripped, last = false) {
  const found = [];
  // Statements: split on ; and on the shell words that start a new command list.
  const parts = stripped.split(/;|\bthen\b|\bdo\b|\belse\b|\{|\}|\(\s|(?<=\S)\)\s/);
  if (last) { let k = parts.length - 1; while (k >= 0 && parts[k].trim() === "") k--; if (k >= 0) parts.splice(k, 1); }
  for (const raw of parts) {
    let p = raw.trim();
    if (!p.includes("&&")) continue;
    if (/^(if|elif|while|until)\b/.test(p)) continue;               // a condition: its failure is the answer, not a red
    p = p.replace(/^(fi|done|esac)\b\s*/, "");
    const ops = p.split(/(&&|\|\|)/).map((x) => x.trim());          // cmd, op, cmd, op, ...
    const cmds = ops.filter((_, k) => k % 2 === 0), seps = ops.filter((_, k) => k % 2 === 1);
    for (let k = 0; k < seps.length; k++) {
      if (seps[k] !== "&&") continue;
      const left = cmds[k], right = cmds[k + 1] ?? "";
      if (isTest(left) && !isTest(right)) continue;                 // a guard: [ x ] && act
      found.push(left || "(empty)");
      break;
    }
  }
  return found;
}

// Lint one file's text. Returns [{ n, text, left }]: left is the (stripped) command whose failure would be passed over.
export function lint(text) {
  const misses = [];
  for (const b of runBlocks(text)) {
    // Logical lines: join continuations (\ at the end), drop blanks and comment-only lines.
    const logical = [];
    let cur = null;
    for (const l of b.lines) {
      if (cur) { cur.text += " " + l.text; if (!/\\$/.test(l.text)) { logical.push(cur); cur = null; } continue; }
      if (l.text === "" || l.text.startsWith("#")) continue;
      if (/\\$/.test(l.text)) cur = { n: l.n, text: l.text }; else logical.push({ n: l.n, text: l.text });
    }
    if (cur) logical.push(cur);
    logical.forEach((l, k) => {
      for (const left of hiddenLists(strip(l.text.replace(/\\$/, "")), k === logical.length - 1)) misses.push({ n: l.n, text: l.text, left });
    });
  }
  return misses;
}

function check(files) {
  let bad = 0;
  for (const f of files) {
    for (const m of lint(readFileSync(f, "utf8"))) {
      bad++;
      const shown = m.text.length > 110 ? m.text.slice(0, 107) + "..." : m.text;
      console.log(`HIDDEN RED: ${relative(ROOT, f)}:${m.n}: ${shown}\n  ${HINT}`);
    }
  }
  console.log(bad ? `${bad} && list(s) can hide a red` : `ci-and-lists: no && list hides a red in ${files.length} workflow file(s)`);
  return bad ? 1 : 0;
}

function selfTest() {
  let failed = 0;
  const expect = (what, good, why) => { console.log(`${good ? "ok  " : "FAIL"} self-test: ${what}${good || why === undefined ? "" : ` (${JSON.stringify(why)})`}`); if (!good) failed++; };
  const T = mkdtempSync(join(tmpdir(), "ci-and-lists-"));
  try {
    // 1. The cause, under GitHub's own shell for `run:` (bash --noprofile --norc -eo pipefail {0}).
    const gh = (body) => { const f = join(T, "step.sh"); writeFileSync(f, body); return spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", f], { encoding: "utf8" }); };
    const old = gh('bash -c "exit 3" && echo second && echo third\necho next-line green\n');
    expect("the old layout hides the red: a failed first check, then a green line, exits 0", old.status === 0, old.status);
    expect("… and the checks after the red never ran", !/second|third/.test(old.stdout) && /next-line green/.test(old.stdout), old.stdout);
    const fixed = gh('bash -c "exit 3"\necho second\necho third\necho next-line green\n');
    expect("one command per line stops at the red with its exit code", fixed.status === 3 && fixed.stdout === "", [fixed.status, fixed.stdout]);
    const last = gh('echo first\nbash -c "exit 3" && echo second\n');
    expect("a list on the block's last line is not hidden (the step ends with its status)", last.status === 3, last.status);
    const guard = gh('x=no; [ "$x" = yes ] && x=on\necho "x=$x"\n');
    expect("a test that guards an action is not a red: the step goes on", guard.status === 0 && /x=no/.test(guard.stdout), [guard.status, guard.stdout]);

    // 2. The check catches the old layout and lets the safe idioms pass.
    const wf = (run) => `jobs:\n  a:\n    steps:\n      - name: x\n        run: |\n${run.split("\n").map((l) => (l ? "          " + l : l)).join("\n")}\n      - name: y\n        run: echo ok\n`;
    const bad = lint(wf('bash "$P/tools/check-docs.sh" && bash "$P/tools/decision-impact.sh" && node "$P/tools/graph.mjs" --check\nbash "$P/tools/check-select-suites.sh"'));
    expect("the old ci.yml layout fails on its line", bad.length === 1 && bad[0].n === 6 && /check-docs/.test(bad[0].text), bad);
    expect("the new layout passes", lint(wf('bash "$P/tools/check-docs.sh"\nbash "$P/tools/decision-impact.sh"\nnode "$P/tools/graph.mjs" --check\nbash "$P/tools/check-select-suites.sh"')).length === 0);
    expect("a list continued over lines with \\ fails", lint(wf('npm ci \\\n  --no-audit && npm test\necho done')).length === 1);
    expect("cd && command, not last, fails", lint(wf('cd "$S" && npm ci\necho done')).length === 1);
    expect("a chain of tests (an assertion), not last, fails", lint(wf('[ "$a" = 1 ] && [ -n "$b" ]\necho done')).length === 1);
    expect("an action inside if … then, not last, fails", lint(wf('if [ "$R" = yes ]; then gh api x >/dev/null && echo labelled\nelse echo no; fi')).length === 1);
    expect("a list after ; on the same line fails", lint(wf('echo start; make a && make b\necho done')).length === 1);
    const safe = [
      '[ "$x" = y ] && z=1\necho done',
      'queue=false; [[ "$H" == m/* && "$A" == bot ]] && queue=true\necho done',
      'if [ "$Q" != true ] && [ "$S" = true ]; then\n  echo a\nfi\necho done',
      'while read a && [ -n "$a" ]; do echo "$a"; done\necho done',
      'n=$(git log && echo x)\necho done',
      'echo "a && b"\necho \'c && d\'\necho done',
      'echo ok   # a && b in a comment\necho done',
      'case "$k" in\n  *) [ "$q" = true ] && why=a || why=b;;\nesac\necho done',
      'sel=(--x); [ "$D" = direct ] && sel+=(--direct)\necho done',
      'echo first\nbash a.sh && bash b.sh',
      '[ "$r" = success ] || { [ "$r" = skipped ] && [ "$c" = "[]" ]; }',
    ];
    for (const s of safe) expect(`passes: ${JSON.stringify(s)}`, lint(wf(s)).length === 0, lint(wf(s)));
    // The last line's exemption covers its last statement only (review m1, 6 Nov).
    const lastSemi = gh('echo first\nbash -c "exit 3" && echo b; echo done\n');
    expect("a list then ; on the last line hides the red under bash", lastSemi.status === 0, lastSemi.status);
    expect("… and the check catches it", lint(wf('echo first\nbash a.sh && bash b.sh; echo done')).length === 1);
    expect("a list inside a loop on the last line fails", lint(wf('for f in a b; do check "$f" && echo ok; echo next; done')).length === 1);
    const single = (r) => `jobs:\n  a:\n    steps:\n      - run: ${r}\n      - run: c\n`;
    expect("a single-line run: is one statement: a && b passes", lint(single('node t.mjs --self-test && node t.mjs')).length === 0);
    expect("a single-line run: a && b; echo done fails", lint(single('bash a.sh && bash b.sh; echo done')).length === 1);
    expect("a single-line run: in YAML quotes is read unquoted", lint(single("'[ -f s.md ] && cat s.md >> \"$O\" || true'")).length === 0 && lint(single("'make a && make b; echo x'")).length === 1);
    expect("a block with an indentation indicator (run: |2) is read", lint("    steps:\n      - run: |2\n          check-a && check-b\n          echo done\n").length === 1);

    // 3. The real workflows pass.
    const files = readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/.test(f)).map((f) => join(WORKFLOWS, f));
    const real = files.flatMap((f) => lint(readFileSync(f, "utf8")).map((m) => `${relative(ROOT, f)}:${m.n}`));
    expect(`every workflow in .github/workflows passes (${files.length} files)`, real.length === 0, real);
  } finally { rmSync(T, { recursive: true, force: true }); }
  console.log(failed ? `self-test: ${failed} failed` : "self-test: all passed");
  return failed ? 1 : 0;
}

const args = process.argv.slice(2);
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (args[0] === "--self-test") process.exit(selfTest());
  const files = args.length ? args : readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/.test(f)).map((f) => join(WORKFLOWS, f));
  process.exit(check(files));
}
