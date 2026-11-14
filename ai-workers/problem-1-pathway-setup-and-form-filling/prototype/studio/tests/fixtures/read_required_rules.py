"""BK-24 (P-533): what a form's own file says is required, read from its XFA template (never typed by hand).

Usage: python -I read_required_rules.py <official blank PDF>
Prints one JSON line:
  null_test       how many fields the template marks required (<validate nullTest="error">): the flag the project's
                  reading of the form (prototype/p1/xfa_inventory.py) records as each field's `required`
  script_marks    how many places the form's scripts make a field required by other answers (color.markRequired or
                  .mandatory = "error"): a form with any is only partly checked by its flags
  validate_button whether the form has its own Validate button (a field named ValidateButton…)
  sections, rows  a Validate script that checks rows of people (IMM 5707's validEntry.validateFields): its own
                  `var sections = [...]` and `var personalInfo = [...]` lists, as the script holds them; null when none
"""
import json
import re
import sys

import pypdf


def template_of(path):
    r = pypdf.PdfReader(path)
    if r.is_encrypted:
        r.decrypt("")
    x = r.trailer["/Root"]["/AcroForm"]["/XFA"]
    for i in range(0, len(x) - 1, 2):
        if str(x[i]) == "template":
            return x[i + 1].get_object().get_data().decode("utf-8", "replace")
    raise SystemExit(f"{path}: no XFA template")


def js_list(text, name):
    """The literal array a script assigns to `var <name> = [...]`, comments removed; null when the script has none."""
    m = re.search(r"var\s+" + name + r"\s*=\s*(\[.*?\]);", text, re.S)
    if not m:
        return None
    body = re.sub(r"//[^\n]*", "", m.group(1))
    return json.loads(re.sub(r",\s*([\]}])", r"\1", body))


def main():
    t = template_of(sys.argv[1])
    plain = t.replace("&quot;", '"').replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
    print(json.dumps({
        "null_test": len(re.findall(r'<validate\b[^>]*\bnullTest="error"', t)),
        "script_marks": len(re.findall(r"markRequired\s*\(|\.mandatory\s*=\s*\"error\"", plain)),
        "validate_button": bool(re.search(r'name="ValidateButton\w*"', t)),
        "sections": js_list(plain, "sections"),
        "rows": js_list(plain, "personalInfo"),
    }))


if __name__ == "__main__":
    main()
