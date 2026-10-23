"""Tests for p1/barcode_positions.py: the real Adobe evidence passes, and swapped, dropped, shifted or
borrowed positions fail even when the same value occurs elsewhere in a barcode (the flaw of the earlier
value-membership count). Reads the evidence; writes nothing.
  .tools/solution-1-prototype/.venv/bin/python -I \
    ai-workers/problem-1-pathway-setup-and-form-filling/prototype/tests/check_barcode_positions.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "p1"))
import barcode_positions as B  # noqa: E402

official, tpl, slots, unknown, payloads, labels, written = B.load_inputs()
saved = B.data_values(B.SAVED_PDF)
results = []


def t(name, ok):
    results.append((name, bool(ok)))


def with_tokens(bc, change):
    """Copy of the payloads with barcode `bc`'s value list changed by `change(list)`."""
    parts = payloads[bc].split("|")
    vals = parts[1:-1]
    change(vals)
    p = dict(payloads)
    p[bc] = "|".join([parts[0], *vals, ""])
    return p


def problems(p):
    return B.compare(slots, p, labels, saved)[1]


def pos(bc, box_suffix):
    return next(i for i, (som, _) in enumerate(slots[bc]) if som.endswith(box_suffix))


base_rows, base_problems = B.compare(slots, payloads, labels, saved)
t("every manifest box has a known data binding", not unknown and all(dp for bc in B.BARCODES for _, dp in slots[bc]))
t("manifest slots are 61/46/37/13/29 = 186", [len(slots[bc]) for bc in B.BARCODES] == [61, 46, 37, 13, 29])
t("real Adobe barcodes: 186 slots, 180 exact, 6 month-box normalisations, 0 problems",
  len(base_rows) == 186 and not base_problems
  and sum(r["match"] == "exact" for r in base_rows) == 180 and sum(r["match"] == "month_leading_zero" for r in base_rows) == 6
  and all(r["box"].endswith(B.MONTH_BOXES) for r in base_rows if r["match"] == "month_leading_zero"))

# R3-m1 (reviewer's executed case): zero padding is not accepted outside the demonstrated month boxes.
pc = 29  # barcode2 position 30 (1-based): the postal code slot the reviewer changed
t("the reviewer's slot is the postal code", "PostalCode" in slots["barcode2"][pc][0] and payloads["barcode2"].split("|")[1:-1][pc] == "110001")
def pad_postal(v):
    v[pc] = "0" + v[pc]
t("postal code 110001 encoded as 0110001 fails (literal comparison for codes and identifiers)",
  any(x.get("position") == pc + 1 for x in problems(with_tokens("barcode2", pad_postal))))
mm = pos("barcode1", "DOBMonth[0]")
def month_00(v):
    v[mm] = "004"
t("a month with extra padding (004 for 04) fails; only the demonstrated single-zero rule applies",
  any(x.get("position") == mm + 1 for x in problems(with_tokens("barcode1", month_00))))
t("the month rule applies only to the named month boxes", B.same("4", "04", "form1[0].Page2[0].Foo[0].PostalCode[0]") is None and B.same("4", "04", "x.DOBMonth[0]") == "month_leading_zero")

m, d = pos("barcode1", "DOBMonth[0]"), pos("barcode1", "DOBDay[0]")
def swap(v, i=m, j=d):
    v[i], v[j] = v[j], v[i]
t("swapping date-of-birth month and day fails at both positions", len(problems(with_tokens("barcode1", swap))) == 2)

t("dropping one value fails (count no longer matches the manifest)",
  any("manifest slots" in x["problem"] for x in problems(with_tokens("barcode2", lambda v: v.pop(4)))))
t("dropping one value and padding the end fails (every later slot shifts)",
  len(problems(with_tokens("barcode2", lambda v: (v.pop(4), v.append(""))))) >= 2)

f8 = pos("barcode3", "OccupationRow2[0].FromMonth[0]")
def borrow(v):
    v[f8] = "5"  # "5" occurs elsewhere in barcode3 (OccupationRow2 ToMonth)
t("a value that occurs elsewhere in the barcode is not accepted at the wrong position",
  any(x.get("position") == f8 + 1 for x in problems(with_tokens("barcode3", borrow))))

lov = pos("barcode5", "languages[0].lov[0]")
def lov_from_service(v):
    v[lov] = "01"  # the reviewer's case: "01" exists in barcode1 (ServiceIn); membership credited it to lov
t("cleared 'language most at ease' is not credited from another slot's '01'",
  any(x.get("position") == lov + 1 for x in problems(with_tokens("barcode5", lov_from_service))))
rows_bad, _ = B.compare(slots, with_tokens("barcode5", lov_from_service), labels, saved)
som_written = {next((s for bc in B.BARCODES for s, dp in slots[bc] if dp == k), k): v for k, v in written.items()}
saved_som = lambda som: saved(next((dp for bc in B.BARCODES for s, dp in slots[bc] if s == som), som))  # noqa: E731
_, acct_bad = B.account(som_written, rows_bad, saved_som)
t("accounting refuses a 'cleared' box that is encoded after all", any("declared cleared" in x["problem"] for x in acct_bad))

t("wrong barcode label fails", any("label" in x["problem"] for x in problems({**payloads, "barcode4": payloads["barcode4"].replace("IMM1295_06-2018_4", "IMM1295_06-2018_3", 1)})))

for n, ok in results:
    print(("PASS  " if ok else "FAIL  ") + n)
failed = sum(not ok for _, ok in results)
print(f"{len(results) - failed}/{len(results)} passed")
sys.exit(1 if failed else 0)
