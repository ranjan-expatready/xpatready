# Where this package came from

This folder is our XFA PDF-form engine, built outside this POC and **copied unchanged** into this repository by row B170a (founder P-464; P-470: the code is ours, no outside team; P-471 "Yes, publish it", 11 Nov 2026). Plan: `ai-workers/problem-1-pathway-setup-and-form-filling/product/design/xfa-reuse-analysis-2026-11-11.md` §4.1 row a, §4.2, §6.2 (L1 to L4).

| What | Value |
|---|---|
| Source | The share of 11 Nov 2026, bundle `ERv2-xfa-full.bundle`, SHA-256 `897c25bf7641aa3112406e589ad37dbc8bd694d07182b1a35a17db702af35065` (kept on the Mac only, under `code/`; never committed) |
| Commit | `a01197278de7d8cfa19cb70299bae8630bbe081d` (branch `feat/xfa-viewer`, 20 Oct 2026 23:14 -04:00), "host requests, clear-button field, full problem list, effective access (E8-E11)" |
| Folder copied | `packages/xfa-engine/` at that commit: git tree `a6ba2186450aad705ef05efe07d5f16127c3951d`, 512 files, about 63,800 lines |
| Also copied | `tsconfig.base.json` at the repository root (blob `b903f8b9b2a25237915599002fe27ab122429a0a`), because `tsconfig.json` here extends `../../tsconfig.base.json` |
| Copied on | 11 Nov 2026, by `git archive a0119727 packages/xfa-engine tsconfig.base.json` from a clone of the bundle |
| Package | `@expatready-eros/xfa-engine` 0.1.0, licence field `UNLICENSED`, private: the company's own code, no outside licence on it |

**Our additions** (the only files here that are not in the version that arrived): `PROVENANCE.md` (this file), `PATCHES.md` (our changes to the copy: none yet), `package-lock.json` (npm; the source repository uses pnpm). Outside the folder: `tsconfig.base.json` copied as above, `.github/workflows/xfa-engine.yml` (build and unit tests), and in `.gitignore` and `product/tools/push-guard.sh` the four made-up test PDFs, allowed by path and SHA-256 (L1).

## Checking the copy is unchanged

From a clone of the bundle (`git clone ERv2-xfa-full.bundle team`), run in our repository:

```bash
diff <(git -C team ls-tree -r a0119727 packages/xfa-engine tsconfig.base.json) \
     <(git ls-tree -r HEAD packages/xfa-engine tsconfig.base.json | grep -vE 'packages/xfa-engine/(PROVENANCE\.md|PATCHES\.md|package-lock\.json)$')
```

No output means every file has the same path, mode and content (git's object id) as commit `a0119727`. Once `PATCHES.md` lists a change, the files it names are the expected differences.

## Libraries it uses (all MIT; pinned exactly in `package.json`)

| Library | Version | Licence | What for | New to us? |
|---|---|---|---|---|
| `quickjs-emscripten-core` | 0.32.0 | MIT | Script sandbox: runs the form's own JavaScript in a locked QuickJS box with time and memory limits | New |
| `@jitl/quickjs-wasmfile-release-sync` | 0.32.0 | MIT | The compiled QuickJS WebAssembly module for the sandbox (brings `@jitl/quickjs-ffi-types` 0.32.0) | New |
| `@noble/hashes` | 2.2.0 | MIT | Hashes (MD5, SHA-256) for PDF decryption keys (AES, RC4), the form packet's checksum and image hashing | New |
| `@xmldom/xmldom` | 0.9.12 | MIT | Reading and writing the form's XML parts (template, data) | New |
| `acorn` | 8.17.0 | MIT | Parsing the form's JavaScript before it runs (the names a script uses, its regular expressions) | New |
| `zod` | 4.4.3 | MIT | Checking the shape of data at the package's edges (worker messages, size limits, the drawn-page tree) | No: the studio uses 4.4.3 |
| `typescript` (build) | 6.0.3 | Apache-2.0 | Build | No: the studio uses 6.0.3 |
| `vitest` (tests) | 4.1.10 | MIT | The engine's own unit tests | New to this repository (named in `STANDARDS.md` §1's default stack) |
| `@types/node` (build) | 26.1.1 | MIT | Types for the tests | The studio has 24.19.1; this package keeps its own |

**The lockfile:** `package-lock.json` was made with Node 24.21.0 and npm 11.19.0: `npm install --legacy-peer-deps --before 2026-10-18T09:45:00Z` (the time of the source repository's last lockfile change). Every runtime package (the seven above, with the FFI types) has exactly the version in the source repository's `pnpm-lock.yaml`. Vitest's own build tools resolve slightly newer than that lock (for example `vite` 8.3.4 against 8.1.0, `rolldown` 1.2.14 against 1.1.3): test tooling only, never shipped, and the tests pass with them (below). npm 11 does not run `fsevents`' install script (a macOS file watcher, optional); nothing needs it.

**Other people's code inside the source** (from the source repository's NOTICE, made by its `scripts/build-xfa-engine-dist.mjs`, not copied here):
* **pdf.js** (Mozilla Foundation and contributors), Apache-2.0, version cited v4.10.38: 37 files are semantic ports of pdf.js' XFA layout code (not verbatim copies); each carries an "Origin" comment naming the pdf.js file and function. Licence text: `third-party/Apache-2.0.txt`.
* **PDFium** (BSD-style): `src/model/form-packet/checksum.ts` reproduces the behaviour of PDFium's XFA checksum (a behavioural port, not a copy). Its licence terms are an open item in that NOTICE; they stay one here.
* Nothing copyleft.

## Technology gate (`STANDARDS.md` §1), for the five new libraries and Vitest

* **Problem (evidenced):** we have no way to run an IRCC form's own Validate before download, and no way to show the filled form in the app (analysis §3: the engine runs the form's Validate on our own IMM 5257 copy in 0.2 s with Adobe's same answer; draws our form as pages in 1.5 s). The five libraries are what the engine is built on; they come as one unit with it.
* **Options:** (1) this engine with its libraries, unchanged (chosen, P-464); (2) one built package with no source (the planner's first idea; loses the tests and small fixes, analysis §0); (3) write our own XFA runtime (weeks; P-464 "adopt the entire code without writing from the scratch"); (4) keep Adobe-only checks by hand (today; C7.2 stays Partial).
* **Integration cost:** one package folder with its own lockfile and its own CI job; nothing in the studio imports it until row c's adapter. Build about 3 s, unit tests about 75 s on the Mac.
* **Upkeep:** six pinned runtime libraries, all small and widely used (acorn and xmldom are long-lived; QuickJS bindings are the newest). If a newer version ever arrives, it is taken by replacing the tree and re-applying `PATCHES.md` (below). Vitest is the testing tool `STANDARDS.md` §1 already names.
* **Data and licence impact:** no data leaves the machine; the engine reads and writes PDF bytes in memory. All MIT; pdf.js-derived code Apache-2.0 with its licence text; PDFium note open. No copyleft. The IRCC forms are never committed (the corpus tests read them from outside git).
* **When to reconsider:** if row j's sizing shows the form coverage gaps (18 of 21 blank forms refused today) need large changes rather than small listed fixes (P-470); if `PATCHES.md` grows long (a sign we are rebuilding); if a library becomes unmaintained or has an unfixed security advisory.

## Measured on 11 Nov 2026 (Mac, Node 24.21.0, npm 11.19.0)

* `npm ci --legacy-peer-deps`: exit 0 (also exit 0 without the flag).
* `npm run build` (`tsc -p tsconfig.build.json`): exit 0.
* `npx vitest run`: **201 test files, 3,369 tests passed, 0 failed**, 76 s. (The planner saw one load-sensitive limit test fail once per full run on 11 Nov and pass alone; this run had none. The CI job must be green three runs in a row.)
* Not run: the real-form suite (`npm run test:corpus`, 401 tests; needs `qpdf` and the IRCC PDFs): row b.

## If a newer version ever arrives

1. Clone the newer bundle; note its commit and the bundle's SHA-256.
2. Replace `packages/xfa-engine/` (and `tsconfig.base.json`) with that commit's tree; keep our three added files.
3. Re-apply every change listed in `PATCHES.md`, or drop the ones the newer version already has.
4. Refresh `package-lock.json` the same way as above if the pins changed; re-check the four test PDFs' SHA-256 against `product/tools/push-guard.sh` (a changed one is refused until its line is updated in the same PR).
5. Run the diff above (only `PATCHES.md`'s files may differ), the build and the unit tests; update this file's table.
