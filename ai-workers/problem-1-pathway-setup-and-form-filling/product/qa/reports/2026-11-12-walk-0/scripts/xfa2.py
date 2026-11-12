import sys, re, pypdf, collections
r = pypdf.PdfReader(sys.argv[1]); x = r.trailer["/Root"]["/AcroForm"]["/XFA"].get_object()
data = [x[i+1].get_object().get_data().decode("utf8","replace") for i in range(0,len(x),2) if str(x[i])=="datasets"][0]
data = re.sub(r"<xfa:data>", "", data)
d = data.split("<xfa:data")[-1] if "<xfa:data" in data else data
pairs = re.findall(r"<([A-Za-z0-9_.]+)(?: [^>]*)?>([^<]+)</\1>", d)
cnt = collections.Counter(k for k,_ in pairs)
for k,v in pairs:
    if cnt[k] <= 3 and v.strip(): print(k, "=", v.strip()[:70])
