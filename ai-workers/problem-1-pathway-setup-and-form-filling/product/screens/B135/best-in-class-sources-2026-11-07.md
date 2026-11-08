# Best-in-class evidence: C6.13, C8.3, C7.8 (all read 2026-11-07)

**Method.** The network blocked the doc sites and vendor help centres, so each page was read from its source repository, which holds the same published text.
**Not opened, so no evidence from them:** Docketwise, INSZoom, LawLogix, eImmigration, Clio/Lawyaw, Salesforce, TurboTax, FreeTaxUSA, Healthcare.gov, Jira/Atlassian, NN/g, USWDS, Material, DocuSign, Adobe, Google Docs, Figma, Ironclad, Drake/UltraTax/Thomson Reuters, CaseWare, Formstack/Documate.

## Screen 1 (C6.13): change the family application

| Name | Best at | URL | Quote | Read on |
|---|---|---|---|---|
| OpenSPP (registry) | Change of head asks what the old head becomes | https://github.com/OpenSPP/OpenSPP2/blob/19.0/spp_change_request_v2/details/change_hoh.py | "Previous Head's New Role" … "The new role for the previous head (e.g., Spouse, Other Adult)" | 2026-11-07 |
| OpenSPP | Refuses in words | https://github.com/OpenSPP/OpenSPP2/blob/19.0/spp_change_request_v2/strategies/change_hoh.py | "No new head of household selected." | 2026-11-07 |
| GitHub Docs | Names what else is deleted; you type the name to confirm | https://github.com/github/docs/blob/main/content/repositories/creating-and-managing-repositories/deleting-a-repository.md | "will delete all forks of the repository" … "type the name of the repository you want to delete" | 2026-11-07 |
| GOV.UK Design System | Avoids disabled buttons | https://github.com/alphagov/govuk-design-system/blob/main/src/components/button/index.md | "Disabled buttons have poor contrast and can confuse some users, so avoid them if possible." | 2026-11-07 |
| Polaris | A disabled button comes with an explanation | https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/actions/button.mdx | "The surrounding interface should make it clear why the button is disabled and what needs to be done to enable it." | 2026-11-07 |
| Polaris | Plain wording for destructive actions | https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/components/deprecated/modal.mdx | Do: "Delete customer?" "This can't be undone." Don't: "Are you sure you want to delete customer?" | 2026-11-07 |

**Lessons to copy**
- Make principal is one change that also asks for the old principal's new role; candidates are case members only.
- Before removal, name each dependent filing or form.
- Keep refused actions visible; say why and what would allow them.
- Confirm in two steps, red button last; title "Remove Client B?" plus "This can't be undone."

## Screen 2 (C8.3): representative review

| Name | Best at | URL | Quote | Read on |
|---|---|---|---|---|
| GitHub: protected branches | Records the approved state; approval goes stale when that state changes | https://github.com/github/docs/blob/main/content/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches.md | "the approving review is dismissed as stale, and the pull request cannot be merged until someone approves the work again" | 2026-11-07 |
| GitHub: giving reviews | Three verdicts | https://github.com/github/docs/blob/main/content/pull-requests/concepts/giving-reviews.md | "Request changes flags feedback that the author should address before the pull request merges." | 2026-11-07 |
| GitHub: reviewing changes | Per-item "Viewed" mark that clears when the item changes | https://github.com/github/docs/blob/main/content/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request.md | "If the file changes after you view the file, it will be unmarked as viewed." | 2026-11-07 |
| GitLab: approval settings | Reset on change is the default; the author cannot approve their own work | https://gitlab.com/gitlab-org/gitlab/-/blob/master/doc/user/project/merge_requests/approvals/settings.md | "By default, an approval on a merge request is removed when you add more changes after the approval." | 2026-11-07 |
| GitLab: diff versions | Rounds can be compared | https://gitlab.com/gitlab-org/gitlab/-/blob/master/doc/user/project/merge_requests/versions.md | "the diff version from each previous push is available for comparison" | 2026-11-07 |
| Gerrit | Named "outdated" votes; votes carry over only under written rules | https://github.com/GerritCodeReview/gerrit/blob/master/Documentation/config-labels.txt | "Votes that are not copied to the new patch set, are called `outdated`." | 2026-11-07 |

**Lessons to copy**
- Stamp each approval with a content fingerprint; any change marks it "Outdated" and blocks filing.
- Three verdicts: Approve, Send back (reason required), Comment.
- A per-form "Reviewed" tick that clears on change gives "Changed since review".
- Number rounds, snapshot each, compare N with N−1.
- No self-approval; approval survives only a written no-content-change rule.

## Screen 3 (C7.8): add one library form

| Name | Best at | URL | Quote | Read on |
|---|---|---|---|---|
| Assembly Line (Suffolk LIT Lab): ALDocument | A template that fills from answers | https://github.com/SuffolkLITLab/docassemble-AssemblyLine-documentation/blob/main/docs/components/AssemblyLine/al_document_overview.md | "represents a template that is filled in with the user's answers during the course of the interview" | 2026-11-07 |
| Assembly Line: ALStaticDocument | The unfilled file is its own item type | same URL as above | "include plain PDF or Word instructions that do not have any variables included in them" | 2026-11-07 |
| Assembly Line: Weaver | Tests the mapping with dummy data | https://github.com/SuffolkLITLab/docassemble-AssemblyLine-documentation/blob/main/docs/authoring/pdf_templates.md | "it will try filling in all of the PDF's fields with dummy data, allowing for a quick visual inspection" | 2026-11-07 |
| GOV.UK Design System: Tag | Status words, not colour | https://github.com/alphagov/govuk-design-system/blob/main/src/components/tag/index.md | "Use adjectives (descriptive words) and not verbs (action words) for the names of your tags." | 2026-11-07 |
| GOV.UK Design System: Complete multiple tasks | A worded status for an item that is blocked | https://github.com/alphagov/govuk-design-system/blob/main/src/patterns/complete-multiple-tasks/index.md | "If the user cannot start the task yet, for example because another task must be completed first, use the ‘Cannot start yet’ status." | 2026-11-07 |

**Lessons to copy**
- Two library kinds: "Auto-filled" and "Blank official PDF". Tag each with an adjective, in text, not colour alone.
- Add the form to one filing only, with an explicit on/off per filing (Assembly Line's `enabled`).
- Test each mapped form with sample data; show coverage ("18 of 24 fields filled").
- For a blank PDF, say it will not fill in and what to do next.
