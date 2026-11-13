import sys, re, pypdf
for f in sys.argv[1:]:
    r = pypdf.PdfReader(f)
    x = r.trailer["/Root"]["/AcroForm"].get("/XFA")
    data = ""
    if x:
        arr = x.get_object() if hasattr(x, "get_object") else x
        for i in range(0, len(arr), 2):
            if str(arr[i]) == "datasets": data = arr[i+1].get_object().get_data().decode("utf-8", "replace")
    name = f.split("/")[-1]
    keys = sys.stdin_keys if False else None
    pat = re.compile(r"<(PrincipalApplicant|Principal|Spouse|SpouseCommonLaw|Dependant|DependentChild|Visitor|Worker|Student|Other|ApplicationType|application|FamilyName|GivenName|LastName|FirstName|Role|ApplicantRole|TypeOfApplication|ApplyingAs)\b[^>]*>([^<]*)</", re.I)
    hits = pat.findall(data)
    print(name, "|", len(data), "chars |", "; ".join(f"{k}={v}" for k, v in hits[:30]))
