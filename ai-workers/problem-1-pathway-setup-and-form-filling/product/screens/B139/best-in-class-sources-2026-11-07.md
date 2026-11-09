# B139 · C6.17 multi-stage case: best-in-class sources (7 Nov 2026)

Step 4b of the screen-concept skill (P-392: primary sources only). Each source was read on **7 Nov 2026** as a raw file from the project's own GitHub repository (`raw.githubusercontent.com`, branch `main` as served that day). Vendor help centres, product sites and canada.ca do not resolve from this session, so no vendor screenshot or IRCC page is cited; nothing here is an immigration value. Quotes are exact.

## 1. GOV.UK Design System: "Complete multiple tasks" pattern and "Task list" component
* Files: `https://raw.githubusercontent.com/alphagov/govuk-design-system/main/src/patterns/complete-multiple-tasks/index.md`; `https://raw.githubusercontent.com/alphagov/govuk-design-system/main/src/components/task-list/index.md`.
* Quotes:
  * "Statuses should be helpful to users. The more you add, the harder it is for users to remember them. Start with the smallest number of different statuses you think might work"
  * "If the user cannot start the task yet, for example because another task must be completed first, use the ‘Cannot start yet’ status. This should be grey text with no background colour, and the ‘task row’ should not be linked."
  * "If your transaction involves lots of tasks, make it manageable by splitting it up into steps that represent stages in the process."
  * "If you are creating your own statuses, use adjectives rather than verbs. Use sentence case, and keep it short"
  * "Once the user has completed the task, the status should show as ‘Completed’ and be black text with no background colour. This will draw more attention to tasks that require action."
* **Best at:** few, plain statuses that say what can be done now; stages that cannot start yet are visibly not actionable.
* **We copy:** the stage strip's four statuses in sentence case (Done before we started · Current · Ended — next stage started · Not started), "Cannot start yet" grey and not linked; finished stages quiet, the current one marked.
* **We beat it:** the strip is not a to-do list the client works through in any order; each stage is a whole application with its own release, and the strip says why a stage cannot start (its release is not ready for cases), not only that it cannot.

## 2. GOV.UK Publishing Components: "Step by step navigation"
* File: `https://raw.githubusercontent.com/alphagov/govuk_publishing_components/main/app/views/govuk_publishing_components/components/docs/step_by_step_nav.yml`.
* Quotes:
  * "Step by step navigations show a sequence of steps towards a specific goal, such as 'learning to drive'."
  * Accessibility criteria: the component must "inform the user which step the current page is in".
* **Best at:** one view of a journey made of several separate government transactions, with "you are here".
* **We copy:** one strip in route order on the case header, the current stage marked, so an officer sees where the client's journey stands without opening anything (SA-1B-68 rule 1).
* **We beat it:** GOV.UK's steps are links to read; ours carry the work: an ended stage opens its filings and records, the next one starts with one button and brings the client's answers.

## 3. Camunda 8: call activities (how a called process picks its version)
* File: `https://raw.githubusercontent.com/camunda/camunda-docs/main/docs/components/modeler/bpmn/call-activities/call-activities.md`.
* Quotes:
  * "The `bindingType` attribute determines which version of the called process is instantiated:"
  * "`latest`: The latest deployed version at the moment the call activity is activated."
  * "If the `bindingType` attribute is not specified, `latest` is used as the default."
  * "By default, all variables of the call activity scope are copied to the created process instance."
* **Best at:** an explicit, documented rule for which version a follow-on piece of work runs on.
* **We copy:** the next stage pins the newest release of its combination at the moment the officer presses Start next stage (the team's SA1B-D85, SA-1B-67 rule 5), after the same startable check as opening a case.
* **We beat it:** Camunda copies variables into the new instance, so the two can drift; we copy nothing: the next stage reads the same person's answers where they are stored, so a correction made later is seen by every stage.

## 4. Flowable CMMN: stages and the manual activation rule
* File: `https://raw.githubusercontent.com/flowable/flowable-engine/main/docs/docusaurus/docs/cmmn/ch06-cmmn.md`.
* Quotes:
  * "A stage is used to group plan items together. It is typically used to define "phases" in a case instance."
  * "Plan items on the case model can have a *manual activation rule*: an expression that can be used to indicate a certain plan item needs to be *manually activated by an end-user*."
  * "Stages and all task types can be marked for manual activation."
  * "As the name implies, the idea behind this is that end-users manually have to activate the plan item instance. A typical use case is showing a list of buttons of potential plan item instances that can currently be started by the end user."
* **Best at:** a case model where phases exist from the start and a person, not the engine, starts the next one.
* **We copy:** the route's stages are on the case from opening (frozen as its stage rows); the next stage is "enabled" as one button and only a person starts it (the team's SA1B-D63: ExpatReady never starts a stage by itself).
* **We beat it:** before the click the officer sees what the start brings and adds (answers carried, new questions, forms, documents, deadline, who files nothing, what is not yet recorded); the engine's button says none of that.

## 5. Temporal: Continue-As-New
* File: `https://raw.githubusercontent.com/temporalio/documentation/main/docs/encyclopedia/workflow/workflow-execution/continue-as-new.mdx`.
* Quotes:
  * "Continue-As-New allows you to checkpoint your Workflow's state and start a fresh Workflow."
  * "First, pass your latest relevant state into Continue-As-New."
  * "The new Workflow Execution has the same Workflow Id, but a different Run Id, and starts its own Event History."
* **Best at:** one identity across runs; each run keeps its own history; the chain is explicit.
* **We copy:** the case keeps its identity and reference across stages; each stage has its own filings, items and records; the ended stage stays visible and read only ("Ended — next stage started").
* **We beat it:** no state is passed by hand: the facts belong to the person, so nothing is checkpointed or lost; the earlier stage's work is shown on the same page, not in a separate run's history.

## What the team's spec already gives (not a benchmark, the requirement)
SA-1B-66 (a route, stages in order), SA-1B-67 ("Start next stage", the newest version at the click, answers read not copied), SA-1B-212 (start at any stage; "done before we started" with key details), AG-7-45 rule 2 (filings in sequence in one case), in `domain/requirements-2026-11-02/` (team-source freshness Unverified: `ai-workers/tools/freshness.sh` cannot run without `code/` in this copy).
