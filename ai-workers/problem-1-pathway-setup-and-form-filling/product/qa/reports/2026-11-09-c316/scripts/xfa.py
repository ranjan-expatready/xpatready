# Prints the named elements of a generated PDF's XFA data (qa's independent read of a copy). python3 -I xfa.py <pdf> <tag>...
import re, sys, warnings, logging
logging.disable(logging.WARNING); warnings.filterwarnings("ignore")
import pypdf
x = list(pypdf.PdfReader(sys.argv[1]).trailer["/Root"]["/AcroForm"]["/XFA"])
s = next(x[i + 1].get_object().get_data().decode("utf8", "replace") for i in range(0, len(x), 2) if str(x[i]) == "datasets")
for t in sys.argv[2:]:
    print(" ".join(m.group(0) for m in re.finditer(rf"<{t}\b[^>]*?(/>|>.*?</{t}>)", s, re.S)) or f"<{t}> not found")
