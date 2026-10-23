# Prototype environment

19 October 2026 · approved under AIW-D257 (pypdf) and AIW-D259 (Node, TypeScript packages, cryptography pin), following AIW-D258 (a missing tool is asked for and installed, never accepted as a limit). Installed tools live in `Xpatready/.tools/` (outside the folders the backup hook copies): runtimes, packages and verified installers only. Official sources live in `official-sources/ircc/`; test outputs in `prototype/p1/runs/` and `prototype/p1/adobe-test/`. Only this README and `requirements.lock` are inside the prototype folder.

## Python (PDF experiments)

| Item | Version | Source and check |
|---|---|---|
| Python | 3.14.0 | Homebrew `/opt/homebrew/bin/python3` (already installed); venv made with the existing `uv` |
| pypdf | 6.19.0 | PyPI wheel, SHA-256 `7e5d6e73…8d14` |
| cryptography | 49.0.0 | PyPI wheel `cp311-abi3-macosx_11_0_arm64`, SHA-256 `966fe0e9…f2db` (AIW-D259) |
| cffi | 2.0.0 | PyPI wheel `cp314-cp314-macosx_11_0_arm64`, SHA-256 `c654de54…ee13` (required by cryptography) |
| pycparser | 3.0 | PyPI wheel `py3-none-any`, SHA-256 `b7274141…a992` (required by cffi) |
| zxing-cpp | 3.1.1 | PyPI wheel `cp312-abi3-macosx_11_0_arm64`, SHA-256 `037cbcae…744d`, Apache-2.0 (founder yes, 19 Oct, under AIW-D258): decodes the IRCC barcodes in E11 |

All five come from `requirements.lock`, installed with `--require-hashes --no-deps --only-binary :all:`. The venv has `include-system-site-packages = false`. **The P0 limitation is resolved:** until AIW-D259 the venv borrowed the system cryptography through `--system-site-packages`, unpinned by our lock. After the change the inventory output was byte-identical, E5 results were identical (apart from random AES initialisation vectors), the independent read-back passed, and the P0 citation check stayed 23/23. The previous venv is set aside as `.tools/solution-1-prototype/.venv-system-crypto-2026-10-19` and can be removed.

```bash
uv venv .tools/solution-1-prototype/.venv --python /opt/homebrew/bin/python3
VIRTUAL_ENV=$PWD/.tools/solution-1-prototype/.venv uv pip install --require-hashes --no-deps --only-binary :all: -r ai-workers/problem-1-pathway-setup-and-form-filling/prototype/env/requirements.lock
```

## Node and TypeScript (drafting skill, contracts, tests)

| Item | Version | Source and check |
|---|---|---|
| Node | 24.21.0 (LTS "Krypton", 7 Sep 2026) | nodejs.org `node-v24.21.0-darwin-arm64.tar.xz`, SHA-256 `6239d4cf…65fe` matched `SHASUMS256.txt`; that file's GPG signature verified good against the Node.js release keyring (`nodejs/release-keys`). Unpacked at `.tools/node-v24.21.0`; **not** on the system PATH. The verified tarball, checksum file, signature and keyring are kept in `.tools/installers/node-v24.21.0/`. Meets the team repository's `node >=24` |
| npm | 11.19.0 | bundled with Node 24.21.0 |
| `@anthropic-ai/sdk` | 0.131.0 | npm, MIT; integrity `sha512-9+PepoU7…` in the lockfile |
| `zod` | 4.4.3 | npm, MIT; same version as the team repository |
| `typescript` | 6.0.3 | npm, Apache-2.0; same version as the team repository |
| `tsx` | 4.23.15 | npm, MIT |
| `ajv` | 8.20.0 | npm, MIT (validates the portable JSON Schema contracts) |
| `@types/node` | 24.19.1 | npm, MIT; Node type definitions for `tsc` (founder yes, 19 Oct, under AIW-D258) |

Location: `.tools/solution-1-prototype/node/` (`package.json`, `package-lock.json` with integrity for every entry). The prototype folder links to it through a `node_modules` symlink (the backup hook copies regular files only and skips `node_modules`), and `prototype/package.json` marks the TypeScript as ES modules; `prototype/tsconfig.json` sets strict checking. Installed with `npm install --ignore-scripts --save-exact`. Smoke test executed (no API call): the SDK client loads, `zodOutputFormat` produces a `json_schema` format, ajv validates, Node reports v24.21.0.

Use, from the project root:

```bash
export PATH=$PWD/.tools/node-v24.21.0/bin:$PATH
ai-workers/problem-1-pathway-setup-and-form-filling/prototype/node_modules/.bin/tsc -p ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tsconfig.json
ai-workers/problem-1-pathway-setup-and-form-filling/prototype/node_modules/.bin/tsx ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tests/check_contracts.ts
```

**P2 route (decided after this table was written):** AIW-D260 records a prototype-only exception (public official forms and their inventories only; no family data or answer keys in any prompt) and AIW-D261 the route: the Anthropic API with a key the founder creates and saves in `.tools/solution-1-prototype/secrets/anthropic.env` (mode 600; never in chat or project files). Every call goes through one launch path (P1 revision 4): `node p2/launch.ts --job <id> --stub|--live`, or `node p2/pipeline.ts --stub|--live [--through field_maps]` for the whole combination; the launcher screens the template and starts `p2/draft.ts` under Node's permission model, which uses the one ledger (`p2/guard.ts`, `p2/isolation.ts`, `p2/ledger.ts`; US$5 per run, US$40 for the whole experiment, retries included). A live call needs a stub pass of the same launch-path code. AIW-D263 lets a later step read an earlier guarded draft; AIW-D264 sets the condition language. Production stays on a commercial AIW-D147 route.

**Not installed and not approved:** the key file (the founder's step; still absent on 20 Oct: run `zsh .tools/solution-1-prototype/secrets/save_key.sh`); any AI call so far; challenger framework packages and the shared PostgreSQL database for the comparison (asked when the comparison runs).

## Other tools

| Item | Version | Note |
|---|---|---|
| poppler (`pdfinfo`, `pdftotext`) | Homebrew | already installed; used as an independent PDF reader in E5 |
| OpenSSL | 3.6.0 (Homebrew) | already installed; verifies the forms' signatures over their signed byte ranges in E5 |
| Playwright / Chrome | 1.62.1 (Codex runtime cache) / Google Chrome 155 | already installed; browser checks |
| Adobe Acrobat | 26.002.22031 (free Reader mode) | Installed 19 Oct as Adobe Acrobat Reader 26.001.21662 through Homebrew (Adobe-signed, notarized, checksum matched; the founder typed the administrator password; licence accepted on the founder's instruction). Adobe's own updater then replaced it with the single Adobe Acrobat app at `/Applications/Adobe Acrobat DC/Adobe Acrobat.app`. Only this one Adobe app is installed; Homebrew still lists the old cask name (stale record, left in place) |

## Product Studio stack (founder yes, 21 Oct 2026, under AIW-D258/D276; recorded as AIW-D281)

| Item | Version | Source and check | Location |
|---|---|---|---|
| PostgreSQL | 18.6 (Homebrew bottle `postgresql@18`, arm64_tahoe) | ghcr.io homebrew/core, bottle SHA-256 `3705effacf678f48b2667b323959d267b705e01da51ef832f10d861eba3a11a6` (matched) | `/opt/homebrew/opt/postgresql@18`; demo cluster `.tools/solution-1-prototype/pg18-data`, 127.0.0.1:54329 only, trust auth (local demo), no background service: started by `studio/start.sh`, stopped by `studio/stop.sh`. Homebrew also created an unused default cluster at `/opt/homebrew/var/postgresql@18` (not started) |
| npm packages | exact team pins: NestJS 11.1.29 (common/core/platform-express), reflect-metadata 0.2.2, rxjs 7.8.2, Prisma/@prisma/client/@prisma/adapter-pg 7.8.0, pg 8.22.0, zod 4.4.3, React/react-dom 19.2.7, Vite 8.1.0, @vitejs/plugin-react 6.0.3, Tailwind/@tailwindcss/vite 4.3.1, Radix (dialog 1.1.19, tabs 1.1.17, select 2.3.3, slot 1.3.0, tooltip 1.2.16, checkbox 1.3.7, label 2.1.11, toast 1.2.19, dropdown-menu 2.1.20, switch 1.4.1), @tanstack/react-query 5.101.1, react-router-dom 7.18.2, react-hook-form 7.80.0, @hookform/resolvers 5.4.0, lucide-react 1.60.0, clsx 2.1.1, tailwind-merge 3.6.0, class-variance-authority 0.7.1, typescript 6.0.3, tsx 4.23.15, @types (node 24.19.1, react/react-dom 19.3.0, express 5.0.6, pg 8.20.0) | npm registry; integrity in `package-lock.json`; `npm install --ignore-scripts --save-exact` | `.tools/solution-1-prototype/studio-node/` (linked as `prototype/studio/node_modules`) |
| Prisma schema engine | 7.8.0 (`3c6e1927…`) | binaries.prisma.sh published SHA-256 `59cb8708e6871db327b4b2e231846a9f6af3fdc44a5a8f2d251f79b87e4506db` (matched) | inside `studio-node/node_modules/@prisma/engines` |

Playwright 1.62.1 and Chrome for the browser check are the existing installations listed above.
