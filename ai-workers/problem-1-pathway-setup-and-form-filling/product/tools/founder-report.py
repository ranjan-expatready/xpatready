#!/usr/bin/env python3
"""Founder report: one fixed template (founder A260, 21 Nov 14:1x IST; ENF-783c, built on ENF-783b's cycle-timeline.py).

"One consistent look ... my key figures highlighted ... the order keeps changing." Every report the Lead sends the
founder is this script's output, in this order, every time:
  1 🔴 Needs you            --needs (the Lead passes "nothing" when empty)
  2 ━━ Cycle ━━ header       Proven this cycle X / 15 · Total N / 101 · Forecast by 07:00 Y / 15 · On track
    (full report only, A262) the pipeline stage table, 7 fixed rows (--stage), then "Constraint today: <stage> because"
  3 Capability board (A263; it carries A262's timeline: target, order, stage, waits on, so one list, not two):
                             "By 19:00 (8)", "By 07:00 (7)", "Reserve / out of cycle", the plan's order every time:
                             - ~HH:MM|done · R1.n · plain name · #PR part + #PR part (lane) · ✅✅🟡⬜⬜ · waits on ...
                             then "Outside the 15": the plan's "outside" list (kind · what · #PR state).
                             Plan keys it reads beside cycle-timeline's: lane, parts {"PR": "name"}, aws, owner (qa lane), reserve, outside.
  4 Constraint               --constraint
  5 Since last report        --since, up to 4 lines
  6 Money and resources      --aws, --weekly (+ --rate for the 96% time), --context
--short prints blocks 1, 2, 3 and 5 (the checks between minutes 03 and 33); the default is all 6.

Inputs (read-only; never writes, never posts):
  * product/cycle-plan.json (the Lead's) and GitHub PR states, both read through cycle-timeline.py's own code.
  * qa/CAPABILITIES.md on origin/main: Proven = R1 rows at Works. "This cycle" = now minus the count in main's last
    commit before the cycle's 07:00 IST (net: a row that left Works subtracts).
  * Flags for what no file holds. A missing input prints "unknown", never a guess. Times in IST from the clock (P-302).
Forecast by 07:00 = proven this cycle + plan rows (19:00 and 07:00 groups) not yet Works whose ETA lands before the
cycle's 07:00 and has not passed (a 19:00 row due 20:00 is late on its line but counts here), plus merged rows whose
proof a qa lane owns (`owner` in the plan; not AWS rows; an ETA only adds lateness). Otherwise no ETA does not count.
On track: ✅ forecast >= 15 · ⚠️ 12-14 · ❌ under 12.

  python3 -I product/tools/founder-report.py --needs nothing --constraint "..." --since "✅ R1.49 proven" \
      --aws 0 --weekly 71 --rate 2.5 --context 38 --stage "Building: 4 · 2.5 h · 3/1 · ⚠️ two drafts quiet" [--short]
Tests: --now ISO, --fixture (GitHub from a file), --plan, --capabilities, --capabilities-at-start.
"""
import argparse
import importlib.util
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.dirname(HERE)
TARGET = 15                    # the founder's 07:00 -> 07:00 IST target (A243)
SINCE_MAX = 4
LEGEND = ("Each capability: build → review → queue/merge → walk on main → qa proof (Works). Boxes: build · review · "
          "queue · walk-or-AWS · qa proof — ✅ done 🟡 now 🔴 blocked ⬜ not yet")
STAGES = ["build", "review", "queue/merge", "walk on main", "qa proof"]
STAGE_ROWS = ["Shaped-ready", "Building", "Review/Approve", "Waiting on the Lead", "Red after approval",
              "Merge queue + machines", "qa proof"]
U = "unknown"


def load_timeline():
    spec = importlib.util.spec_from_file_location("cycle_timeline", os.path.join(HERE, "cycle-timeline.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


CT = load_timeline()
IST = CT.IST


def works(caps):
    return sum(1 for c in caps.values() if c.get("status") == "Works")


def caps_at(when_utc):
    """CAPABILITIES.md in origin/main's last first-parent commit before `when_utc`; None when git cannot say."""
    root = subprocess.run(["git", "-C", HERE, "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip()
    sha = subprocess.run(["git", "-C", root or HERE, "rev-list", "-1", "--first-parent",
                          "--before=" + when_utc.strftime("%Y-%m-%dT%H:%M:%SZ"), "origin/main"],
                         capture_output=True, text=True).stdout.strip()
    if not sha:
        return None
    r = subprocess.run(["git", "-C", root or HERE, "show", sha + ":" + CT.CAPS_REL], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def position(step):
    """cycle-timeline's step text -> index of the current stage (0-4), -1 not started, None when it cannot say."""
    s = step.lower().strip()
    if "unreadable" in s:
        return None
    # its own step texts, by prefix (substrings mislead: "approved" holds "prove", "unmerged" holds "merged")
    for idx, prefixes in ((4, ("qa proof", "prove")), (2, ("merge queue", "approved, not queued", "labelled")),
                          (1, ("review ",)), (0, ("building",))):
        if s.startswith(prefixes) or s in prefixes:
            return idx
    if s.startswith("no open pr") or s.endswith(("not started", "no lane")):
        return -1
    return None


DONE, NOW, BLOCKED, NOT_YET = "✅", "🟡", "🔴", "⬜"


class LiveGitHub(CT.GitHub):
    """cycle-timeline's reader plus the PR title (its lane) and Mergify's queued / dequeued labels, cached per PR."""
    def __init__(self):
        super().__init__()
        self.cache = {}

    def pull(self, n):
        if n not in self.cache:
            d = self.get("pulls/%d" % n)
            if "state" not in d:
                raise OSError(d.get("message", "no PR"))
            pr = {"state": d["state"], "draft": d.get("draft", False), "merged": d.get("merged", False),
                  "labels": [l["name"] for l in d.get("labels", [])], "title": d.get("title") or "",
                  "queue_title": "", "queue_summary": ""}
            if pr["state"] == "open" and "review: approved" in pr["labels"]:
                for c in self.get("commits/%s/check-runs?per_page=100" % d["head"]["sha"]).get("check_runs", []):
                    if c.get("name") == "Mergify Merge Queue":
                        pr["queue_title"] = c["output"].get("title") or ""
                        pr["queue_summary"] = c["output"].get("summary") or ""
            self.cache[n] = pr
        return self.cache[n]


def read_prs(gh, nums):
    """-> list of PR dicts in plan order, or None when GitHub cannot say (never a guessed box)."""
    try:
        return [gh.pull(int(n)) for n in nums]
    except (OSError, ValueError):
        return None


def is_aws(row):
    """The founder's AWS stops it: the plan's flag, or the word AWS in its waits_on."""
    return bool(row.get("aws") or re.search(r"\baws\b", row.get("waits_on") or "", re.I))


def boxes(row, prs, proven):
    """Five stage boxes build / review / queue / walk-or-AWS / qa proof (A263): ✅ done · 🟡 now · 🔴 blocked · ⬜ not yet.
    The first open PR leads (as in cycle-timeline); with none open, merged parts mean built; a Lead's `step` places a
    row that has no PR. 🔴 where something stops it: Mergify's dequeued label, the founder's AWS, a `waits_on` with no PR."""
    if proven:
        return DONE * 5
    aws = is_aws(row)
    lead = [p for p in prs if p["state"] == "open" and not p.get("merged")]
    if lead:
        p = lead[0]
        if "dequeued" in p.get("labels", []):            # Mergify may drop the approval label as it dequeues
            return DONE * 2 + BLOCKED + NOT_YET * 2
        if p.get("draft"):
            return NOW + NOT_YET * 4
        if "review: approved" not in p.get("labels", []):
            return DONE + NOW + NOT_YET * 3
        return DONE * 2 + NOW + NOT_YET * 2
    if any(p.get("merged") for p in prs):              # merged: the qa lane walks it on main and proves it
        return DONE * 3 + BLOCKED + NOT_YET if aws else DONE * 4 + NOW
    idx = position(row.get("step") or "") if row.get("step") else -1
    if idx is None or idx < 0:
        return (BLOCKED if row.get("waits_on") else NOT_YET) + NOT_YET * 4
    if aws and idx >= 3:
        return DONE * 3 + BLOCKED + NOT_YET
    return DONE * idx + (BLOCKED if row.get("waits_on") or aws else NOW) + NOT_YET * (4 - idx)


def blocked_waits(row, prs):
    """What stops a 🔴 row, where cycle-timeline's text cannot know it (it reads no dequeued label and no AWS flag)."""
    if not prs or row.get("waits_on"):
        return None
    lead = [p for p in prs if p["state"] == "open" and not p.get("merged")]
    if lead and "dequeued" in lead[0].get("labels", []):
        return "a fix: dequeued by Mergify (read its summary, P-502)"
    if not lead and any(p.get("merged") for p in prs) and row.get("aws"):
        return "the founder's AWS, then walk and qa proof"
    return None


def work_items(row, prs):
    """'#2613 FO-3st3a + #2710 FO-3st3b (screens)': PRs with the plan's part names, and the lane (plan, else the
    first PR title's prefix, e.g. 'runtime: ...')."""
    nums = row.get("prs", [])
    if not nums:
        items = "no PR yet"
    else:
        parts = row.get("parts") or {}
        items = " + ".join(("#%s %s" % (n, parts[str(n)])) if str(n) in parts else "#%s" % n for n in nums)
    lane = row.get("lane")
    if not lane and prs:
        t = next((p.get("title", "") for p in prs if ":" in p.get("title", "")), "")
        head = t.split(":")[0].split("—")[-1].strip()          # "migration — runtime: ..." -> runtime
        lane = head if head and len(head) <= 20 else None
    return items + (" (%s)" % lane if lane else "")


def pr_state(p):
    if p.get("merged"):
        return DONE + " merged"
    if p["state"] != "open":
        return NOT_YET + " closed"
    if p.get("draft"):
        return NOW + " building"
    if "review: approved" not in p.get("labels", []):
        return NOW + " review"
    if "dequeued" in p.get("labels", []):
        return BLOCKED + " dequeued"
    return NOW + (" queue" if "queued" in p.get("labels", []) else " approved, not queued")


def board(plan, caps, gh, now):
    """-> (lines of block 3: the capability board and "Outside the 15", A263; rows forecast on time, not yet proven).
    Rows keep the plan's order every time; plain lines ("- " items) read the same in a terminal and on a phone."""
    start, end = CT.cycle_bounds(now)
    proof = int(plan.get("proof_minutes") or 60)
    out, coming = ["", LEGEND, ""], 0
    if plan.get("cycle_start") and plan["cycle_start"] != start.strftime("%Y-%m-%d"):
        out += ["(plan written for the %s cycle: the Lead rewrites it)" % plan["cycle_start"], ""]
    rows = [r for r in (plan.get("rows") or []) if isinstance(r, dict)]
    reserve = [r for r in (plan.get("reserve") or []) if isinstance(r, dict)]
    groups = [("By 19:00", [r for r in rows if r.get("by") == "19:00"], "19:00"),
              ("By 07:00", [r for r in rows if r.get("by") == "07:00"], "07:00"),
              ("Reserve / out of cycle", reserve + [r for r in rows if r.get("by") not in ("19:00", "07:00")],
               None)]
    for title, g, by in groups:
        out.append("%s (%d):" % (title, len(g)))
        out.append("")
        deadline = CT.at_cycle_time(start, by) if by else None
        for r in g:
            try:
                coming += row_line(r, caps, gh, now, proof, start, end, by, deadline, out)
            except (KeyError, TypeError, AttributeError, ValueError) as e:
                out.append("- unknown · %s · plan entry unreadable (%s)" % (r.get("r1", "no r1"), type(e).__name__))
        if not g:
            out.append("- none")
        out.append("")
    out.append("Outside the 15 (supporting work):")
    out.append("")
    outside = plan.get("outside")
    if outside is not None and not isinstance(outside, list):
        outside = None
    if outside is None:
        out.append("- unknown (no \"outside\" list in cycle-plan.json)")
    for o in [o for o in outside or [] if isinstance(o, dict)]:
        prs = read_prs(gh, o.get("prs", []))
        states = U if prs is None else " · ".join("#%s %s" % (n, pr_state(p)) for n, p in zip(o.get("prs", []), prs))
        out.append("- %s · %s · %s" % (o.get("kind", "other"), o.get("what", "?"), states or "no PR yet"))
    if outside == []:
        out.append("- none")
    out.append("")
    return out, coming


def row_line(r, caps, gh, now, proof, start, end, by, deadline, out):
    """One board line for a plan row; returns 1 when it counts in the forecast: not proven, and its ETA lands on time
    before the cycle's 07:00 (a "By 19:00" row due at 20:00 is late for 19:00 but still counts for 07:00)."""
    name = r.get("name") or caps.get(r.get("r1"), {}).get("name") or "(not in CAPABILITIES.md)"
    prs = read_prs(gh, r.get("prs") or [])
    if caps.get(r.get("r1"), {}).get("status") == "Works":
        out.append("- done · %s · %s · %s · %s" % (r["r1"], name, work_items(r, prs or []), DONE * 5))
        return 0
    eta, _txt, _step, waits, _ = CT.row_view(r, caps, gh, now, proof)
    verdict = CT.lateness(eta, deadline, now, False) if deadline else ""
    merged = bool(prs) and any(p.get("merged") for p in prs) and not any(
        p["state"] == "open" and not p.get("merged") for p in prs)
    owned = merged and r.get("owner") and not is_aws(r) and (not eta or eta <= end)   # Lead 15 on #2809 (1)
    counts = 1 if by and (owned or (eta and CT.lateness(eta, end, now, False) == "on time")) else 0
    target = eta.strftime("~%H:%M") if eta else ("≤" + by if by else "—")
    bx = "unknown (GitHub not answering)" if prs is None else boxes(r, prs, False)
    waits = blocked_waits(r, prs) or waits
    tail = "" if verdict in ("on time", "") else " · " + verdict
    out.append("- %s · %s · %s · %s · %s · waits on %s%s" % (target, r["r1"], name, work_items(r, prs or []), bx, waits,
                                                          tail))
    return counts


def hours(age):
    """'2.5 h' / '40 min' / '1 d' -> hours, else None."""
    m = re.match(r"^\s*(\d+(?:\.\d+)?)\s*(min|m|h|d)\b", age or "")
    if not m:
        return None
    return float(m.group(1)) * {"min": 1 / 60, "m": 1 / 60, "h": 1, "d": 24}[m.group(2)]


def stage_table(flags):
    """Block 2b (full report, A262): one row per stage in a fixed order, then the constraint by the skill's rule
    (out below in over the last 3 h, highest median age; on a tie the later stage, which feeds more proofs)."""
    given, rows = {}, []
    for f in flags or []:
        name, _, rest = f.partition(":")
        given[name.strip().lower()] = [x.strip() for x in rest.split("·")]
    out = ["", "```", "%-23s %-7s  %-10s %-10s  %s" % ("Stage", "Items", "Median age", "In/out 3 h", "Verdict")]
    for st in STAGE_ROWS:
        v = given.get(st.lower(), [])
        if not v:                                    # Lead 15 on #2809 (2): no tool measures it yet
            v = ["—", "—", "—", "not measured yet"]
        v += [U] * (4 - len(v))
        items, age, io, verdict = v[0] or U, v[1] or U, v[2] or U, " · ".join(x for x in v[3:] if x) or U
        out.append("%-23s %-7s  %-10s %-10s  %s" % (st, items, age, io, verdict))
        m = re.match(r"^\s*(\d+)\s*/\s*(\d+)\s*$", io)
        if m and hours(age) is not None and int(m.group(2)) < int(m.group(1)) and st != "Shaped-ready":   # a buffer
            rows.append((hours(age), STAGE_ROWS.index(st), st, age, m.group(1), m.group(2)))
    out.append("```")
    odd = [n for n in given if n not in [x.lower() for x in STAGE_ROWS]]
    if odd:
        out.append("(--stage name not recognised, so not shown: %s)" % ", ".join(odd))
    if rows:
        _, _, st, age, i, o = max(rows)
        out.append("Constraint today: %s because median age %s and %s in / %s out in 3 h" % (st, age, i, o))
    else:
        out.append("Constraint today: unknown (no stage with in, out and age measured and out below in)")
    return out


def money(a, now):
    aws = U if a.aws is None else "US$%s (credit)" % a.aws
    if a.weekly is None:
        weekly = U + " (96% at unknown)"
    else:
        if a.weekly >= 96:
            at = "reached"
        elif a.rate and a.rate > 0:
            at = "at " + (now + timedelta(hours=(96 - a.weekly) / a.rate)).astimezone(IST).strftime("%H:%M")
        else:
            at = "at unknown"
        burn = "+%g%%/h, " % a.rate if a.rate else ""
        weekly = "%g%% (%s96%% %s)" % (a.weekly, burn, at)
    ctx = U if a.context is None else "%g%%" % a.context
    return "Money and resources: AWS %s · weekly plan %s · Lead context %s" % (aws, weekly, ctx)


def report(a):
    now = datetime.fromisoformat(a.now) if a.now else datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=IST)
    start, _ = CT.cycle_bounds(now)
    needs = a.needs or []
    if len(needs) == 1 and needs[0].strip().lower() == "nothing":
        out = ["🔴 Needs you: nothing", ""]
    elif needs:
        out = ["🔴 Needs you:", ""] + ["- " + n for n in needs] + [""]
    else:
        out = ["🔴 Needs you: " + U, ""]

    try:
        text, _src = CT.read_capabilities(a.capabilities)
        caps = CT.parse_capabilities(text)
    except OSError:
        caps = None
    if a.capabilities_at_start:
        try:
            with open(a.capabilities_at_start, encoding="utf-8") as f:
                at_start = f.read()
        except OSError:
            at_start = None
    else:
        at_start = caps_at(start.astimezone(timezone.utc))
    try:
        with open(a.plan, encoding="utf-8") as f:
            plan = json.load(f)
    except (OSError, ValueError):
        plan = None
    if not isinstance(plan, dict):
        plan = None

    proven = None if caps is None or at_start is None else works(caps) - works(CT.parse_capabilities(at_start))
    total = U if caps is None else "%d / %d" % (works(caps), len(caps))
    lines, coming, plan_bad = None, None, False
    if plan is not None and caps is not None:
        try:
            lines, coming = board(plan, caps, CT.Fixture(a.fixture) if a.fixture else LiveGitHub(), now)
        except (KeyError, TypeError, AttributeError, ValueError):
            lines, coming, plan_bad = None, None, True
    forecast = None if proven is None or coming is None else proven + coming
    if forecast is None:
        track = U
    else:
        track = "✅" if forecast >= TARGET else "⚠️" if forecast >= TARGET - 3 else "❌"
    out.extend(["━━ Cycle 07:00 → 07:00 IST ━━  (now %s IST)" % now.astimezone(IST).strftime("%d %b %H:%M"), ""])
    out.append("Proven this cycle  %s   ·   Total  %s   ·   Forecast by 07:00  %s   ·   On track %s" % (
        U if proven is None else "%d / %d" % (proven, TARGET), total,
        U if forecast is None else "%d / %d" % (forecast, TARGET), track))
    if not a.short:
        out.extend(stage_table(a.stage))
    out.extend(lines if lines else ["", LEGEND, "", "Capability board: unknown (%s unreadable)" % (
        "cycle plan" if plan is None else "a cycle plan entry" if plan_bad else "CAPABILITIES.md"), ""])
    if not a.short:
        out.extend(["Constraint: " + (a.constraint or U), ""])   # blank lines keep blocks apart on a phone
    since = a.since or []
    out.append("Since last report:" + ("" if since else " " + U))
    if since:
        out.append("")
    out.extend("- " + s for s in since[:SINCE_MAX])
    if len(since) > SINCE_MAX:
        out.append("- (+%d more in the Lead's check)" % (len(since) - SINCE_MAX))
    out.append("")
    if not a.short:
        out.append(money(a, now))
    return "\n".join(out)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--needs", action="append", help='one 🔴 item: what · where · what stops (repeatable), or "nothing"')
    ap.add_argument("--constraint", help="<one stage> because <measured number> → doing: <action> → expect by HH:MM")
    ap.add_argument("--since", action="append", help="one line (✅ proven · 🔀 merged · ⚠️ new risk); repeatable, 4 shown")
    ap.add_argument("--aws", help="AWS spend in US$ (credit)")
    ap.add_argument("--weekly", type=float, help="weekly plan %%")
    ap.add_argument("--rate", type=float, help="weekly plan burn %% per hour, for the 96%% time")
    ap.add_argument("--context", type=float, help="the Lead's context %%")
    ap.add_argument("--stage", action="append", help='full report: "<stage>: items · median age · in/out 3 h · '
                    '✅|⚠️|❌ reason", from lead-watch.sh / flow-measure.py output; repeatable; a stage left out is unknown')
    ap.add_argument("--short", action="store_true", help="blocks 1, 2, 3 and 5 only")
    ap.add_argument("--plan", default=os.path.join(P, "cycle-plan.json"))
    ap.add_argument("--now", help="ISO time (tests); default the clock")
    ap.add_argument("--fixture", help="answer GitHub from this JSON file (tests)")
    ap.add_argument("--capabilities", help="CAPABILITIES.md now, instead of origin/main (tests)")
    ap.add_argument("--capabilities-at-start", help="CAPABILITIES.md at the cycle's 07:00, instead of git (tests)")
    print(report(ap.parse_args(argv)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
