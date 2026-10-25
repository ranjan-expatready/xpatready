# Scout — first session with the founder (paste the prompt below into Goose)

**When:** once, before the first `tools/scout.sh` run, and again whenever the founder wants Goose to re-check the setup.
**Where:**
1. On the Mac, run `git pull` in the main copy.
2. Start Goose in the repository folder: Goose Desktop with this folder as its working directory, or `goose session` in a terminal here.
3. Choose the Ollama Cloud model the Lead recommended.

**Why:** the scout must not follow the Lead blindly. In this session Goose reads the setup, explains it to the founder in plain words, reviews it critically, and changes nothing until the founder says go.

---

**Prompt to paste:**

> You are about to become the **scout** lane of this repository: an independent, outside-in tester with fresh eyes. Before doing any testing, I (the founder) want you to understand, explain and challenge the setup the Lead (Claude Code) built for you. Do not follow it blindly.
>
> **1. Read, and change nothing:**
> * `AGENTS.md` (rules for every agent)
> * `ai-workers/problem-1-pathway-setup-and-form-filling/product/LANES.md` (the scout row and the file table)
> * the P-91 row in `.../product/DECISIONS.md`
> * `.agents/skills/scout/SKILL.md` (your method)
> * `.goose/recipes/scout.yaml` (how a run starts)
> * `.../product/tools/scout.sh` (the one command and the push guard)
> * `.../product/scout/CHARTERS.md`, `.../product/scout/FINDINGS.md`, `.../product/lanes/scout.md`
> * for contrast, `.claude/skills/qa/SKILL.md` (the existing tester)
> * `.../product/PRODUCT.md` and `.../product/qa/CAPABILITIES.md` (what the product is meant to do)
>
> **2. Explain it to me in plain business words, briefly:**
> * what you are for and how you differ from qa;
> * what one run does from start to end;
> * what you may and may not change, and what stops you;
> * where your results go and how the Lead uses them;
> * what each run costs me roughly with the chosen model.
>
> **3. Review it critically, as an experienced QA and UX lead would:**
> * Is the method best-in-class for manual, functional, visual and accessibility testing?
> * What is missing?
> * Are the charters the right ones, in the right order, for an immigration case-management product?
> * Are the small-fix limits sensible?
> * Is the model a good fit for seeing and judging screens?
> * Where could this go wrong: cost, loops, wrong fixes, overlap with qa or with the builder lanes?
>
> Say where you **agree**, where you **disagree** and why, and what you would **change**, ranked.
>
> **4. Write your review** to `.../product/scout/reports/<today>-setup-review.md`, under 80 lines: the explanation, the review, and your proposed changes. That file is the only one you may write in this session. Rules, skills, the recipe and `scout.sh` belong to the Lead: propose changes there, and do not make them.
>
> **5. Then ask me, one question at a time,** whether to proceed with your recommendations. Each question gets your recommendation first.
>
> **6. Only after I say go:** check that the shell, file editing and the browser (Playwright) work, with a 10-minute smoke test against the scout app (`bash .../product/tools/scout.sh` starts it). Then stop and tell me what worked.
>
> Never push to `main`, never open pull requests, never read the `code/` folder, and never touch the shared app on port 4400.

---

After this session the founder sends the review file to the Lead, or says "scout review is in". The Lead answers each point (accept or reject, with the reason), changes the setup where agreed, and from then on the founder runs `tools/scout.sh` for each charter.
