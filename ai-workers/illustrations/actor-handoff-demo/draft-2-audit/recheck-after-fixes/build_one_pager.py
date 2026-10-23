#!/usr/bin/env python3
"""Build the Solution 1 one-pager, draft 2, from s3_data.py (content) and s3_views.py (BPMN layout).
Usage: python3 tools/s3/build_one_pager.py   (paths are absolute; run from anywhere).
Writes problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html and runs the structural checks; exits 1 on any failure.
Draft 1 (page, builder, data) is archived whole in archive/ai-workers/*-v3-draft1-2026-10-17.*"""
import html, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import s3_data as D
import s3_views as V

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "problem-1-pathway-setup-and-form-filling", "solution-1-one-pager.html")
VIEWER_JS = os.path.join(ROOT, "illustrations", "actor-handoff-demo", "bpmn-viewer-18.16.0.min.js")
E = html.escape
ACTOR = {a[0]: a for a in D.ACTORS}
ACT = D.ACT
VIEW = {v["id"]: v for v in V.VIEWS}
ERR = []

# ------------------------------------------------------------------ geometry
ROW_H, POOL_HDR, LANE_HDR, PAD_L, BAND_H, GAP = 128, 30, 30, 14, 54, 46
TASK_W, TASK_H, GW, EV, ST_W, ST_H, SUB_W, SUB_H = 100, 80, 42, 34, 46, 40, 112, 70
PITCH_G, PITCH_GW = 70, 100

def tint(hexc, f=0.90):
    h = hexc.lstrip("#"); r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return "#%02x%02x%02x" % tuple(int(c + (255 - c) * f) for c in (r, g, b))

class Box:
    def __init__(s, x, y, w, h): s.x, s.y, s.w, s.h = x, y, w, h
    l = property(lambda s: s.x); r = property(lambda s: s.x + s.w); t = property(lambda s: s.y); b = property(lambda s: s.y + s.h)
    cx = property(lambda s: s.x + s.w / 2); cy = property(lambda s: s.y + s.h / 2)

def size_of(typ):
    if typ in ("task", "call"): return TASK_W, TASK_H
    if typ in ("sub", "sub-ev"): return SUB_W, SUB_H
    if typ in ("xor", "and", "or", "evg"): return GW, GW
    if typ == "store": return ST_W, ST_H
    return EV, EV

def layout(view):
    pitchT = view.get("pitchT", 120)
    pitches = [pitchT if c == "T" else PITCH_GW if c == "G" else PITCH_G for c in view["cols"]]
    x0 = 6 + POOL_HDR + LANE_HDR + PAD_L
    centers, colb, x = [], [], x0
    for p in pitches: centers.append(x + p / 2); x += p; colb.append(x)
    W = int(x + 12)
    y = 8
    bands, pools, lanes = {}, {}, {}
    for pool, pos in view["bands"]:
        if pos == "top": bands[pool] = Box(6, y, W - 12, BAND_H); y += BAND_H + GAP
    for pool, lanelist in view["pools"]:
        py = y
        for actor, rows in lanelist:
            lanes[f"{pool}.{actor}"] = Box(6 + POOL_HDR, y, W - 12 - POOL_HDR, rows * ROW_H); y += rows * ROW_H
        pools[pool] = Box(6, py, W - 12, y - py); y += GAP
    for pool, pos in view["bands"]:
        if pos == "bottom": bands[pool] = Box(6, y, W - 12, BAND_H); y += BAND_H + GAP
    H = int(y - GAP + 10)
    nodes = {}
    for nid, typ, lane, col, row, label, opts in view["nodes"]:
        if typ == "evsub":
            L = lanes[lane]; c2 = opts["to_col"]
            x1 = centers[col] - pitches[col] / 2 + 4; x2 = centers[c2] + pitches[c2] / 2 - 4
            nodes[nid] = Box(x1, L.t + row * ROW_H + 10, x2 - x1, opts["rows"] * ROW_H - 20)
            continue
        w, h = size_of(typ)
        L = lanes[lane]; cy = L.t + row * ROW_H + ROW_H / 2
        nodes[nid] = Box(centers[col] - w / 2, cy - h / 2, w, h)
    return dict(W=W, H=H, bands=bands, pools=pools, lanes=lanes, nodes=nodes, colb=colb)

def wp_points(geo, wp):
    def v(sp):
        if isinstance(sp, (int, float)): return sp
        k = sp[0]
        if k == "cb": return geo["colb"][sp[1]]
        if k == "n": return getattr(geo["nodes"][sp[1]], sp[2]) + sp[3]
        if k in ("pool", "band", "lane"):
            b = geo[k + "s"][sp[1]]; return (b.t if sp[2] == "t" else b.b) + sp[3]
        raise ValueError(sp)
    return [(v(a), v(b)) for a, b in wp]

def ref_y(geo, spec):
    ref, side, off = spec
    b = geo["lanes"][ref[5:]] if ref.startswith("lane:") else geo["nodes"][ref]
    return (b.t if side == "top" else b.b) + off

def route(geo, S, Tn, styp, ttyp, opts):
    gw = ("xor", "and", "or", "evg")
    same_y = abs(S.cy - Tn.cy) < 1; same_x = abs(S.cx - Tn.cx) < 1
    ex = opts.get("exit"); en = opts.get("enter")
    if ex is None:
        if same_y: ex = "right" if Tn.cx > S.cx else "bottom"
        elif same_x: ex = "bottom" if Tn.cy > S.cy else "top"
        elif styp in gw and Tn.cx > S.cx: ex = "bottom" if Tn.cy > S.cy else "top"
        elif Tn.cx > S.cx: ex = "right"
        else: ex = "bottom"
    if en is None:
        if same_y and Tn.cx > S.cx: en = "left"
        elif same_x: en = "top" if Tn.cy > S.cy else "bottom"
        elif ttyp in gw and styp not in gw and ex == "right": en = "bottom" if Tn.cy > S.cy else "top"
        elif Tn.cx > S.cx: en = "left"
        else: en = "bottom"
    P = {"right": (S.r, S.cy), "left": (S.l, S.cy), "top": (S.cx, S.t), "bottom": (S.cx, S.b)}[ex]
    Q = {"left": (Tn.l, Tn.cy), "top": (Tn.cx, Tn.t), "bottom": (Tn.cx, Tn.b), "right": (Tn.r, Tn.cy)}[en]
    yv = ref_y(geo, opts["yv"]) if "yv" in opts else None
    if ex == "right" and en == "left":
        if abs(P[1] - Q[1]) < 1: return [P, Q]
        xm = Q[0] - 12; return [P, (xm, P[1]), (xm, Q[1]), Q]
    if ex in ("top", "bottom") and en in ("left", "right"): return [P, (P[0], Q[1]), Q]
    if ex == "right" and en in ("top", "bottom"):
        if yv is None: return [P, (Q[0], P[1]), Q]
        return [P, (P[0] + 14, P[1]), (P[0] + 14, yv), (Q[0], yv), Q]
    if ex in ("top", "bottom") and en in ("top", "bottom"):
        if abs(P[0] - Q[0]) < 1: return [P, Q]
        if yv is None: yv = (P[1] + Q[1]) / 2
        return [P, (P[0], yv), (Q[0], yv), Q]
    return [P, Q]

# ------------------------------------------------------------------ BPMN XML
EVDEF = {"start-msg": "message", "start-msg-ni": "message", "start-timer": "timer", "end-msg": "message", "throw-msg": "message",
         "catch-msg": "message", "catch-cond": "conditional", "link-catch": "link", "link-throw": "link"}
TAG = {"start": "startEvent", "start-msg": "startEvent", "start-msg-ni": "startEvent", "start-timer": "startEvent", "end": "endEvent",
       "end-msg": "endEvent", "throw-msg": "intermediateThrowEvent", "catch-msg": "intermediateCatchEvent", "catch-cond": "intermediateCatchEvent",
       "link-catch": "intermediateCatchEvent", "link-throw": "intermediateThrowEvent", "xor": "exclusiveGateway", "and": "parallelGateway",
       "or": "inclusiveGateway", "evg": "eventBasedGateway", "store": "dataStoreReference", "sub": "subProcess", "sub-ev": "subProcess",
       "evsub": "subProcess", "call": "callActivity"}
KIND_TAG = {"user": "userTask", "service": "serviceTask", "manual": "manualTask", "call": "callActivity", "send": "sendTask", "receive": "receiveTask"}

def act_of(nid):
    m = re.fullmatch(r"A_(\d+)_(\d+)", nid)
    return f"{m.group(1)}.{m.group(2)}" if m else None

def node_label(nid, typ, label):
    a = act_of(nid)
    return f"{a}\n{V.SHORT[a]}" if a else label

def bpmn_xml(view):
    vid = view["id"]; geo = layout(view)
    nodes = {n[0]: n for n in view["nodes"]}
    def pool_of(ref):
        if ref.startswith("band:"): return ref[5:]
        return nodes[ref][2].split(".")[0]
    seq = [f for f in view["flows"] if f[2] == "seq"]
    fid = {id(f): f"F_{vid}_{i}" for i, f in enumerate(view["flows"])}
    inc, out, default = {}, {}, {}
    for f in seq:
        out.setdefault(f[0], []).append(fid[id(f)]); inc.setdefault(f[1], []).append(fid[id(f)])
        if f[4].get("default"): default[f[0]] = fid[id(f)]
    data_in, data_out = {}, {}
    for f in view["flows"]:
        if f[2] == "data":
            if nodes[f[0]][1] == "store": data_in.setdefault(f[1], []).append((fid[id(f)], f[0]))
            else: data_out.setdefault(f[0], []).append((fid[id(f)], f[1]))
    x = ['<?xml version="1.0" encoding="UTF-8"?>',
         f'<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" '
         f'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" '
         f'xmlns:color="http://www.omg.org/spec/BPMN/non-normative/color/1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
         f'id="Defs_{vid}" targetNamespace="urn:expatready:solution1:onepager">',
         f'<bpmn:collaboration id="Collab_{vid}">']
    for pool, _ in view["pools"]:
        p = D.POOLS[pool]
        x.append(f'<bpmn:participant id="P_{vid}_{pool}" name="{E(p["name"])}" processRef="Proc_{vid}_{pool}">' +
                 ('<bpmn:participantMultiplicity minimum="1" />' if p.get("multi") else "") + '</bpmn:participant>')
    for pool, _ in view["bands"]:
        x.append(f'<bpmn:participant id="B_{vid}_{pool}" name="{E(D.POOLS[pool]["name"] + band_suffix(view, pool))}" />')
    for f in view["flows"]:
        if f[2] != "msg": continue
        s = f"B_{vid}_{f[0][5:]}" if f[0].startswith("band:") else f[0]
        t = f"B_{vid}_{f[1][5:]}" if f[1].startswith("band:") else f[1]
        x.append(f'<bpmn:messageFlow id="{fid[id(f)]}" name="{"" if f[4].get("hide_label") else E(f[3])}" sourceRef="{s}" targetRef="{t}" />')
    x.append('</bpmn:collaboration>')

    def emit_node(nid):
        _, typ, lane, col, row, label, opts = nodes[nid]
        a = act_of(nid)
        tag = KIND_TAG[ACT[a]["kind"]] if typ == "task" else TAG[typ]
        attrs = f'id="{nid}" name="{E(node_label(nid, typ, label)).replace(chr(10), "&#10;")}"'
        if typ in ("sub-ev", "evsub"): attrs += ' triggeredByEvent="true"'
        if typ == "start-msg-ni": attrs += ' isInterrupting="false"'
        if nid in default: attrs += f' default="{default[nid]}"'
        body = "".join(f"<bpmn:incoming>{i}</bpmn:incoming>" for i in inc.get(nid, [])) + "".join(f"<bpmn:outgoing>{o}</bpmn:outgoing>" for o in out.get(nid, []))
        for k, (did, st) in enumerate(data_in.get(nid, [])):
            body += f'<bpmn:property id="Prop_{did}" name="__targetRef_placeholder" />'
            body += f'<bpmn:dataInputAssociation id="{did}"><bpmn:sourceRef>{st}</bpmn:sourceRef><bpmn:targetRef>Prop_{did}</bpmn:targetRef></bpmn:dataInputAssociation>'
        for did, st in data_out.get(nid, []):
            body += f'<bpmn:dataOutputAssociation id="{did}"><bpmn:targetRef>{st}</bpmn:targetRef></bpmn:dataOutputAssociation>'
        if a and ACT[a]["mi"]: body += '<bpmn:multiInstanceLoopCharacteristics />'
        if typ in EVDEF:
            d = EVDEF[typ]
            if d == "link": body += f'<bpmn:linkEventDefinition id="LD_{nid}" name="{opts["link"]}" />'
            elif d == "conditional": body += f'<bpmn:conditionalEventDefinition id="CD_{nid}"><bpmn:condition xsi:type="bpmn:tFormalExpression">{E(label)}</bpmn:condition></bpmn:conditionalEventDefinition>'
            else: body += f'<bpmn:{d}EventDefinition id="ED_{nid}" />'
        if typ == "evsub":
            for cid, c in nodes.items():
                if c[6].get("parent") == nid: body += emit_node(cid)
            for f in seq:
                if nodes[f[0]][6].get("parent") == nid: body += seq_xml(f)
        return f"<bpmn:{tag} {attrs}>{body}</bpmn:{tag}>"

    def seq_xml(f):
        s, t, _, label, opts = f
        cond = ""
        if label and nodes[s][1] in ("xor", "or") and not opts.get("default"):
            cond = f'<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">{E(label)}</bpmn:conditionExpression>'
        return f'<bpmn:sequenceFlow id="{fid[id(f)]}" name="{E(label)}" sourceRef="{s}" targetRef="{t}">{cond}</bpmn:sequenceFlow>'

    for pool, lanelist in view["pools"]:
        x.append(f'<bpmn:process id="Proc_{vid}_{pool}" isExecutable="false">')
        has_lanes = not (len(lanelist) == 1 and lanelist[0][0] is None)
        if has_lanes:
            x.append(f'<bpmn:laneSet id="LS_{vid}_{pool}">')
            for actor, _ in lanelist:
                refs = "".join(f"<bpmn:flowNodeRef>{n[0]}</bpmn:flowNodeRef>" for n in view["nodes"]
                               if n[2] == f"{pool}.{actor}" and not n[6].get("parent") and n[1] != "store")
                x.append(f'<bpmn:lane id="L_{vid}_{pool}_{actor}" name="{E(V.LANE_SHORT[actor])}">{refs}</bpmn:lane>')
            x.append('</bpmn:laneSet>')
        for n in view["nodes"]:
            if n[2].split(".")[0] == pool and not n[6].get("parent"): x.append(emit_node(n[0]))
        for f in seq:
            if pool_of(f[0]) == pool and not nodes[f[0]][6].get("parent"): x.append(seq_xml(f))
        x.append('</bpmn:process>')

    # diagram interchange
    x.append(f'<bpmndi:BPMNDiagram id="Dia_{vid}"><bpmndi:BPMNPlane id="Plane_{vid}" bpmnElement="Collab_{vid}">')
    def bounds(b): return f'<dc:Bounds x="{b.x:.0f}" y="{b.y:.0f}" width="{b.w:.0f}" height="{b.h:.0f}" />'
    for pool, lanelist in view["pools"]:
        x.append(f'<bpmndi:BPMNShape id="P_{vid}_{pool}_di" bpmnElement="P_{vid}_{pool}" isHorizontal="true">{bounds(geo["pools"][pool])}</bpmndi:BPMNShape>')
        for actor, _ in lanelist:
            if actor is None: continue
            c = ACTOR[actor][3]
            x.append(f'<bpmndi:BPMNShape id="L_{vid}_{pool}_{actor}_di" bpmnElement="L_{vid}_{pool}_{actor}" isHorizontal="true" '
                     f'color:background-color="{tint(c, 0.93)}" color:border-color="#b9b9b3">{bounds(geo["lanes"][f"{pool}.{actor}"])}</bpmndi:BPMNShape>')
    for pool, _ in view["bands"]:
        x.append(f'<bpmndi:BPMNShape id="B_{vid}_{pool}_di" bpmnElement="B_{vid}_{pool}" isHorizontal="true" color:background-color="#f1f1ee">{bounds(geo["bands"][pool])}</bpmndi:BPMNShape>')
    for n in view["nodes"]:
        nid, typ, lane = n[0], n[1], n[2]; b = geo["nodes"][nid]
        extra = ""
        if typ == "xor": extra = ' isMarkerVisible="true"'
        if typ in ("sub", "sub-ev"): extra = ' isExpanded="false"'
        if typ == "evsub": extra = ' isExpanded="true"'
        col = ""
        a = act_of(nid)
        if a: c = ACTOR[ACT[a]["lane"]][3]; col = f' color:border-color="{c}" color:background-color="#ffffff"'
        elif typ in ("sub", "sub-ev"): col = ' color:border-color="#1f2937" color:background-color="#ffffff"'
        lab = ""
        if typ not in ("task", "call", "sub", "sub-ev", "evsub") and n[5]:
            if typ in ("xor", "and", "or", "evg") and n[6].get("lab") != "below": lb = Box(b.cx - 62, b.t - 43, 124, 26)
            else: lb = Box(b.cx - 50, b.b + 4, 100, 28)
            lab = f"<bpmndi:BPMNLabel>{bounds(lb)}</bpmndi:BPMNLabel>"
        x.append(f'<bpmndi:BPMNShape id="{nid}_di" bpmnElement="{nid}"{extra}{col}>{bounds(b)}{lab}</bpmndi:BPMNShape>')
    for f in view["flows"]:
        s, t, kind, label, opts = f
        if "wp" in opts:
            pts = wp_points(geo, opts["wp"])
        elif kind == "msg":
            pts = msg_route(geo, view, nodes, s, t, opts)
        else:
            S = geo["nodes"][s]; Tn = geo["nodes"][t]
            if kind == "data":
                pts = data_route(S, Tn, opts)
            else:
                pts = route(geo, S, Tn, nodes[s][1], nodes[t][1], opts)
        f[4]["_pts"] = pts
        wps = "".join(f'<di:waypoint x="{px:.0f}" y="{py:.0f}" />' for px, py in pts)
        lab = ""
        if label and not opts.get("hide_label"):
            lb = flow_label_box(pts, label, kind, opts, geo["W"])
            lab = f"<bpmndi:BPMNLabel>{bounds(lb)}</bpmndi:BPMNLabel>"
        x.append(f'<bpmndi:BPMNEdge id="{fid[id(f)]}_di" bpmnElement="{fid[id(f)]}">{wps}{lab}</bpmndi:BPMNEdge>')
    x.append('</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></bpmn:definitions>')
    return "".join(x), geo

def band_suffix(view, pool):
    where = {"copy": " (view 5)", "setup": " (views 1 to 3)", "case": " (views 4 and 6)", "gov": ""}
    return where.get(pool, "")

def data_route(S, Tn, opts):
    if opts.get("exit") == "bottom" and opts.get("enter") == "right":
        x = S.cx + opts.get("dx", 0); return [(x, S.b), (x, Tn.cy), (Tn.r, Tn.cy)]
    if abs(S.cx - Tn.cx) < 1:
        return [(S.cx, S.b), (Tn.cx, Tn.t)] if Tn.cy > S.cy else [(S.cx, S.t), (Tn.cx, Tn.b)]
    return [(S.r, S.cy), (Tn.cx, S.cy), (Tn.cx, Tn.t if Tn.cy > S.cy else Tn.b)]

def msg_route(geo, view, nodes, s, t, opts):
    dx = opts.get("dx", 0)
    r = opts.get("route")
    N = geo["nodes"]
    if r == "v5-to-s2":
        S, Tn = N[s], N[t]; y = geo["pools"]["setup"].b + GAP / 2
        return [(S.cx - 30, S.t), (S.cx - 30, y), (Tn.cx, y), (Tn.cx, Tn.b)]
    if r == "v6-to-s4":
        S, Tn = N[s], N[t]; y = geo["pools"]["copy"].b + GAP / 2
        return [(S.cx - 30, S.t), (S.cx - 30, y), (Tn.cx, y), (Tn.cx, Tn.b)]
    if s.startswith("band:"):
        B = geo["bands"][s[5:]]; Tn = N[t]; xx = Tn.cx + dx
        return [(xx, B.b), (xx, Tn.t)] if B.cy < Tn.cy else [(xx, B.t), (xx, Tn.b)]
    if t.startswith("band:"):
        B = geo["bands"][t[5:]]; S = N[s]; xx = S.cx + dx
        return [(xx, S.t), (xx, B.b)] if B.cy < S.cy else [(xx, S.b), (xx, B.t)]
    S, Tn = N[s], N[t]
    xs = S.cx + dx
    return [(xs, S.b), (xs, Tn.t)] if Tn.cy > S.cy else [(xs, S.t), (xs, Tn.b)]

def flow_label_box(pts, label, kind, opts=None, W=1240):
    # The viewer wraps a label at about (box width - 34)px; the box is sized so short labels stay on one line
    # and is placed by the visible text, so it never reaches the next shape.
    opts = opts or {}
    tw = 5.9 * len(label)
    bw = min(130, tw + 36); vis = min(tw, bw - 34); lines = 1 if tw <= bw - 34 else 2 if tw <= 2 * (bw - 34) else 3
    h = 14 * lines
    seg = opts.get("lab_seg", 0)
    (x1, y1), (x2, y2) = pts[seg], pts[seg + 1]
    def at(cx, top): return Box(cx - bw / 2, top, bw, h)
    if seg and abs(y1 - y2) < 1:  # label a later horizontal segment, just below it
        return at((x1 + x2) / 2, y1 + 2)
    if kind == "msg":
        ym = (y1 + y2) / 2 if len(pts) == 2 else y2
        left = x1 + 6 + vis > W - 12 or opts.get("lab_left")
        return at(x1 - 6 - vis / 2 if left else x1 + 6 + vis / 2, ym - h / 2)
    if abs(y1 - y2) < 1:
        return at(x1 + 2 + vis / 2, y1 - h - 2)
    if abs(y2 - y1) > 70:
        return at(x1 + 5 + vis / 2, (y1 + y2) / 2 - h / 2)
    if y2 > y1:
        return at(x1 + 5 + vis / 2, y1 + 22)
    return at(x1 + 5 + vis / 2, y1 - 22 - h)

# ------------------------------------------------------------------ HTML pieces
def tagname(rule):
    if rule.startswith("R|"): return "req", "Team requirement", rule[2:]
    if rule.startswith("F|"): return "dec", "Founder decision", rule[2:]
    if rule.startswith("G|"): return "gap", "Build gap", rule[2:]
    return "prop", "Proposal", rule

SCREEN_KIND = {"team": "in the team's design", "proposed": "proposed", "none": "no screen", "outside": "outside the product"}
TEN = [("Trigger", "trigger"), ("Prerequisites", "prereq"), ("Records read · updated", None), ("Authority", "authority"),
       ("Ready state", "ready"), ("Return path", "ret"), ("Acceptance", None), ("Next owner", None),
       ("Record handed over", "transfer"), ("Receiving condition", "receiving")]

def view_of_act(a): return VIEW[ACT[a]["view"]]

def example_html(a):
    act = ACT[a]
    if not act["example"]:
        return f"<p class='ex-none'>No separate example: {E(act['no_example'])}</p>"
    out = []
    for blk in act["example"]:
        k = blk[0]
        if k == "table":
            _, cap, head, rows = blk
            out.append(f"<figure class='ex-tbl'><figcaption>{E(cap)}</figcaption><div class='tw'><table><thead><tr>" + "".join(f"<th>{E(h)}</th>" for h in head) +
                       "</tr></thead><tbody>" + "".join("<tr>" + "".join(f"<td>{E(c)}</td>" for c in r) + "</tr>" for r in rows) + "</tbody></table></div></figure>")
        elif k == "flow":
            _, cap, steps = blk
            out.append(f"<figure class='ex-flow'><figcaption>{E(cap)}</figcaption><ol>" + "".join(f"<li>{E(s)}</li>" for s in steps) + "</ol></figure>")
        elif k == "exception":
            out.append(f"<p class='ex-exc'><b>Exception.</b> {E(blk[1])}</p>")
        elif k == "pending":
            out.append("<p class='ex-pend'>Immigration conditions, forms and values shown are examples, pending the immigration specialist.</p>")
    return "".join(out)

def card_html(a):
    act = ACT[a]; actor = ACTOR[act["lane"]]; v = view_of_act(a)
    io = act["io"]
    meta = (f"<span class='lchip' style='--c:{actor[3]}'>{E(actor[1])}</span> <span class='sep'>·</span> View {v['n']}: {E(v['title'])}"
            f"<br><b>Screen:</b> {E(act['screen'])} <span class='stag'>{SCREEN_KIND[act['screen_kind']]}</span>")
    if act["mi"]: meta += f"<br><b>Runs</b> {E(act['mi'])}"
    human = (f"<p class='human'><b>What the person does.</b> {E(act['human'])}</p>" if act["human"]
             else "<p class='human none'><b>No human action at this step.</b> People see its results later.</p>")
    reads = ", ".join(D.RECORD_NAME[r] for r in act["reads"]) or "none"
    upd = ", ".join(D.RECORD_NAME[r] for r in act["updates"]) or "none"
    vals = {"Records read · updated": f"<b>Reads</b> {E(reads)} · <b>updates</b> {E(upd)}",
            "Acceptance": f"<b>Normal:</b> {E(act['accept'][0])}<br><b>Alternate:</b> {E(act['accept'][1])}",
            "Next owner": E(io[3])}
    dl = "".join(f"<dt>{E(t)}</dt><dd>{vals[t] if k is None else E(act[k])}</dd>" for t, k in TEN)
    rules = "".join(f"<li><span class='rtag {c}'>{lab}</span> {E(txt)}</li>" for c, lab, txt in (tagname(r) for r in act["rules"]))
    exc = act["exceptions"] + [act["ret"]]
    traces = ("<details><summary>Traces to the team's requirements</summary><table class='tr'>" +
              "".join(f"<tr><td>{E(w)}</td><td>{E(i)}</td></tr>" for w, i in act["traces"]) + "</table></details>") if act["traces"] else ""
    return (f"<div class='card' data-act='{a}'>"
            f"<header class='ch'><div class='cid' style='--c:{actor[3]}'>{a}</div><h2 id='insp-h' tabindex='-1'>{E(act['title'])}</h2><div class='cmeta'>{meta}</div></header>"
            f"<ol class='io'><li><span>Input</span>{E(io[0])}</li><li><span>Action</span>{E(io[1])}</li><li><span>Output</span>{E(io[2])}</li><li><span>Receiving owner</span>{E(io[3])}</li></ol>"
            f"{human}"
            f"<button type='button' class='ex-btn' aria-expanded='false' aria-controls='ex-{a.replace('.', '-')}'>Example · Client A</button>"
            f"<div class='example' id='ex-{a.replace('.', '-')}' hidden>{example_html(a)}</div>"
            f"<dl class='ten'>{dl}</dl>"
            f"<details><summary>Actions ({len(act['actions'])})</summary><ul>{''.join(f'<li>{E(x)}</li>' for x in act['actions'])}</ul></details>"
            f"<details><summary>Rules ({len(act['rules'])})</summary><ul class='rules'>{rules}</ul></details>"
            f"<details><summary>Exceptions and return paths ({len(exc)})</summary><ul>{''.join(f'<li>{E(x)}</li>' for x in exc)}</ul></details>"
            f"{traces}</div>")

def describe_target(view, nodes, t, kind):
    if t.startswith("band:"): return "message to " + D.POOLS[t[5:]]["name"]
    a = act_of(t)
    if a: return f"<button type='button' class='fl-link' data-act='{a}'>{a} {E(V.SHORT[a])}</button>"
    n = nodes[t]; typ = n[1]
    if typ in ("xor", "or", "and", "evg"):
        return {"and": "both branches start (parallel)", "or": "every branch that applies", "evg": "wait for whichever happens first"}.get(typ, E(n[5]) or "join")
    if typ == "link-throw": return E(n[5])
    if typ == "store": return "record: " + E(n[5])
    return E(n[5])

def list_html(view):
    nodes = {n[0]: n for n in view["nodes"]}
    outs = {}
    for f in view["flows"]:
        if f[0].startswith("band:"): continue
        outs.setdefault(f[0], []).append(f)
    incoming_msgs = {}
    for f in view["flows"]:
        if f[2] == "msg" and f[0].startswith("band:"): incoming_msgs.setdefault(f[1], []).append(f)
    items = []
    for n in view["nodes"]:
        nid, typ, lane, *_ , label, opts = n
        if typ in ("sub", "sub-ev"):
            vv = VIEW[opts["view"]]
            items.append(f"<li class='fl-ev'><b><a href='#view-{vv['id']}'>{E(label)}</a></b>"
                         + ("<div class='fl-next'>" + " · ".join(((E(f[3]) + " → ") if f[3] else "→ ") + describe_target(view, nodes, f[1], f[2]) for f in outs.get(nid, [])) + "</div>" if outs.get(nid) else "") + "</li>")
            continue
        if typ in ("evsub",):
            items.append(f"<li class='fl-ev'><b>{E(label)}</b> (runs inside the case whenever it happens)</li>"); continue
        if typ == "store": continue
        a = act_of(nid)
        nexts = []
        for f in outs.get(nid, []):
            if f[2] == "data": nexts.append("updates the record " + E(nodes[f[1]][5])); continue
            pre = (E(f[3]) + " → ") if f[3] else "→ "
            if f[2] == "msg": pre = "message" + ((" '" + E(f[3]) + "'") if f[3] else "") + " → "
            nexts.append(pre + describe_target(view, nodes, f[1], f[2]))
        msgs = "".join(f"<div class='fl-msg'>Message in: {E(f[3])}</div>" for f in incoming_msgs.get(nid, []))
        nx = "<div class='fl-next'>" + " · ".join(nexts) + "</div>" if nexts else ""
        if a:
            actor = ACTOR[ACT[a]["lane"]]
            items.append(f"<li class='fl-act' style='--c:{actor[3]}'><span class='fl-who'>{E(actor[1])}</span>"
                         f"<button type='button' class='fl-open' data-act='{a}'>{a} {E(ACT[a]['title'])}</button>{msgs}{nx}</li>")
        elif typ in ("xor", "or", "and", "evg"):
            what = {"xor": "Decision", "or": "Inclusive split or join", "and": "Parallel split or join", "evg": "Wait for the first of"}[typ]
            items.append(f"<li class='fl-gw'><b>{what}{': ' + E(label) if label else ''}</b>{nx}</li>")
        else:
            what = {"start": "Starts", "start-msg": "Starts on a message", "start-msg-ni": "Starts on a message", "start-timer": "Starts on a schedule",
                    "end": "Ends", "end-msg": "Ends and sends a message", "throw-msg": "Sends a message", "catch-msg": "Waits for a message",
                    "catch-cond": "Waits until", "link-catch": "Continues from", "link-throw": "Continues"}[typ]
            items.append(f"<li class='fl-ev'><b>{what}:</b> {E(label)}{msgs}{nx}</li>")
    return "<ol class='flowlist'>" + "".join(items) + "</ol>"

KEY_SVG = {
 "User task": '<rect x="2" y="4" width="30" height="20" rx="4" fill="#fff" stroke="#333"/><circle cx="8" cy="9" r="2" fill="none" stroke="#333"/><path d="M5 14 q3-4 6 0" fill="none" stroke="#333"/>',
 "System or AI task": '<rect x="2" y="4" width="30" height="20" rx="4" fill="#fff" stroke="#333"/><circle cx="8" cy="10" r="3" fill="none" stroke="#333" stroke-dasharray="1.5 1"/>',
 "Runs for each item": '<rect x="2" y="4" width="30" height="20" rx="4" fill="#fff" stroke="#333"/><path d="M14 18v4M17 18v4M20 18v4" stroke="#333"/>',
 "Calls another view": '<rect x="2" y="4" width="30" height="20" rx="4" fill="#fff" stroke="#333" stroke-width="3"/>',
 "Decision (one path)": '<path d="M17 2l12 12-12 12L5 14z" fill="#fff" stroke="#333"/><path d="M13 10l8 8M21 10l-8 8" stroke="#333"/>',
 "Parallel (all paths)": '<path d="M17 2l12 12-12 12L5 14z" fill="#fff" stroke="#333"/><path d="M17 8v12M11 14h12" stroke="#333" stroke-width="2"/>',
 "Inclusive (paths that apply)": '<path d="M17 2l12 12-12 12L5 14z" fill="#fff" stroke="#333"/><circle cx="17" cy="14" r="5" fill="none" stroke="#333" stroke-width="2"/>',
 "Wait for first event": '<path d="M17 2l12 12-12 12L5 14z" fill="#fff" stroke="#333"/><circle cx="17" cy="14" r="6" fill="none" stroke="#333"/><path d="M17 10l3.5 6h-7z" fill="none" stroke="#333"/>',
 "Start · end": '<circle cx="9" cy="14" r="7" fill="#fff" stroke="#333"/><circle cx="25" cy="14" r="7" fill="#fff" stroke="#333" stroke-width="3"/>',
 "Message event": '<circle cx="17" cy="14" r="9" fill="#fff" stroke="#333"/><rect x="11.5" y="10.5" width="11" height="7" fill="none" stroke="#333"/><path d="M11.5 10.5l5.5 4 5.5-4" fill="none" stroke="#333"/>',
 "Link to another view": '<circle cx="17" cy="14" r="9" fill="#fff" stroke="#333"/><circle cx="17" cy="14" r="7" fill="none" stroke="#333"/><path d="M12 12h5v-3l5 5-5 5v-3h-5z" fill="none" stroke="#333"/>',
 "Sequence (same pool)": '<path d="M2 14h26" stroke="#333" stroke-width="1.5"/><path d="M28 10l5 4-5 4z" fill="#333"/>',
 "Message (between pools)": '<circle cx="4" cy="14" r="2.5" fill="#fff" stroke="#333"/><path d="M7 14h20" stroke="#333" stroke-dasharray="4 3"/><path d="M27 10l6 4-6 4z" fill="#fff" stroke="#333"/>',
 "Record (data store)": '<path d="M7 7q10-5 20 0v14q-10 5-20 0z" fill="#fff" stroke="#333"/><path d="M7 7q10 5 20 0" fill="none" stroke="#333"/>',
 "Reads or writes a record": '<path d="M2 14h26" stroke="#333" stroke-dasharray="1.5 2.5"/><path d="M27 10l6 4-6 4" fill="none" stroke="#333"/>',
}

def css():
    av = "\n".join(f"  --a-{k}: {c};" for k, _, _, c in D.ACTORS)
    return """
:root{--bg:#f6f6f3;--panel:#fff;--ink:#1b1b1a;--muted:#5a5a56;--line:#d8d8d2;--accent:#1d4ed8;--soft:#eef2ff;--rule:#f1f1ec;--warn:#92400e;--ok:#166534;
""" + av + """}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#121314;--panel:#1b1c1f;--ink:#ecece9;--muted:#a6a6a1;--line:#35373c;--soft:#1d2541;--rule:#212227;--warn:#fbbf24;--ok:#4ade80;}}
:root[data-theme="dark"]{--bg:#121314;--panel:#1b1c1f;--ink:#ecece9;--muted:#a6a6a1;--line:#35373c;--soft:#1d2541;--rule:#212227;--warn:#fbbf24;--ok:#4ade80;}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif}
main{max-width:1280px;margin:0 auto;padding:0 16px 56px}
h1{font-size:28px;line-height:1.2;margin:26px 0 4px}h2{font-size:20px;margin:0 0 6px}h3{font-size:15.5px;margin:0 0 6px}
p{margin:6px 0}ul,ol{margin:4px 0 0 20px;padding:0}li{margin:2px 0}
.sub{color:var(--muted)}
.nav{position:sticky;top:0;z-index:900;background:var(--bg);border-bottom:1px solid var(--line);padding:8px 0;display:flex;flex-wrap:wrap;gap:6px;font-size:13px}
.nav a{color:var(--ink);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:3px 10px;background:var(--panel)}
.nav a:hover,.nav a:focus-visible{border-color:var(--accent)}
.nav .ph{font-weight:600}
.nav .jump{display:none;width:100%}
.nav select{width:100%;font:inherit;font-size:15px;padding:7px 8px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink)}
.answer{background:var(--soft);border-left:4px solid var(--accent);padding:12px 16px;margin:14px 0;border-radius:6px}
.answer strong{font-size:17px}
.grid{display:grid;gap:10px}
.cards{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.box{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:10px 12px}
.family{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13.5px}
.family b{font-weight:600}
.key{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;margin-top:8px}
.key span{display:inline-flex;align-items:center;gap:6px}
.key svg{width:34px;height:28px;flex:none;background:#fff;border-radius:4px}
.lanes{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;margin-top:8px}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:middle}
section.view,section.blk{margin:30px 0 0;padding-top:10px;border-top:3px solid var(--line)}
.vhead{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px}
.vhead .pl{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.cont{font-size:13.5px;color:var(--muted);margin:2px 0 8px}
.cont b{color:var(--ink);font-weight:600}
.tools{display:flex;gap:6px;margin:6px 0}
.tools button,.ex-btn,.closeb{font:inherit;font-size:13px;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:6px;padding:4px 10px;cursor:pointer}
.tools button[aria-pressed="true"]{border-color:var(--accent);background:var(--soft)}
.dg-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:8px;background:#fff;color:#111}
.dg{position:relative}
.dg .bjs-powered-by{opacity:.7;z-index:1!important}
.dg .bjs-drilldown{display:none}
.djs-element.sel .djs-visual>rect{stroke-width:3.5px!important;stroke:#111!important}
.djs-element.view-link{cursor:pointer}
.eye{all:unset;box-sizing:border-box;width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid var(--c,#333);display:grid;place-items:center;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.2)}
.eye svg{width:14px;height:14px}
.eye:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.eye.on{background:var(--c,#333)}.eye.on svg path,.eye.on svg circle{stroke:#fff}
.flowlist{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px}
.flowlist li{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:14px}
.flowlist .fl-act{border-left:5px solid var(--c)}
.fl-who{display:block;font-size:12px;color:var(--muted)}
.fl-open,.fl-link{all:unset;cursor:pointer;font-weight:600;color:var(--ink);text-decoration:underline;text-decoration-color:var(--line);text-underline-offset:3px}
.fl-link{font-weight:500}
.fl-open:focus-visible,.fl-link:focus-visible,.mx button:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.fl-next,.fl-msg{font-size:13px;color:var(--muted);margin-top:2px}
.fl-gw,.fl-ev{background:var(--rule)!important}
.matrix{overflow-x:auto}
.mx{border-collapse:collapse;width:100%;font-size:12.5px;background:var(--panel);min-width:900px}
.mx th,.mx td{border:1px solid var(--line);padding:5px 6px;vertical-align:top;text-align:left}
.mx th{background:var(--rule);font-weight:600}
.mx th.act{border-left:5px solid var(--c)}
.mx button{all:unset;display:block;cursor:pointer;padding:2px 0;line-height:1.3}
.mx button b{color:var(--c)}
table{border-collapse:collapse;width:100%;font-size:13.5px;background:var(--panel)}
th,td{border:1px solid var(--line);padding:6px 8px;vertical-align:top;text-align:left}
th{background:var(--rule)}
.tw{overflow-x:auto}
.strip{display:grid;grid-template-columns:170px 1fr;gap:0;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)}
.strip>div{padding:7px 10px;border-bottom:1px solid var(--line);font-size:14px}
.strip>div:nth-child(odd){background:var(--rule);font-weight:600}
.strip>div:nth-last-child(-n+2){border-bottom:0}
.seq{display:flex;flex-wrap:wrap;gap:4px;align-items:center;font-size:13.5px;margin:4px 0}
.seq span{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:3px 8px}
.seq i{color:var(--muted);font-style:normal}
footer{color:var(--muted);font-size:12.5px;margin-top:30px;border-top:1px solid var(--line);padding-top:10px}
/* inspector */
#insp{position:fixed;top:0;right:0;bottom:0;width:min(460px,92vw);background:var(--panel);color:var(--ink);border-left:1px solid var(--line);box-shadow:-6px 0 18px rgba(0,0,0,.14);z-index:1000;display:flex;flex-direction:column}
#insp[hidden]{display:none}
#insp .bar{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--muted)}
#insp .body{overflow:auto;padding:12px 16px 30px;flex:1}
body.docked main{margin-right:476px}
#insp.left{right:auto;left:0;border-left:0;border-right:1px solid var(--line);box-shadow:6px 0 18px rgba(0,0,0,.14)}
.card .ch{margin-bottom:8px}
.cid{display:inline-block;font-weight:700;color:#fff;background:var(--c);border-radius:5px;padding:1px 8px;font-size:13px}
.card h2{font-size:18px;margin:6px 0 4px;outline:none}
.cmeta{font-size:13px;color:var(--muted)}
.cmeta b{color:var(--ink);font-weight:600}
.lchip{display:inline-block;border-left:4px solid var(--c);padding-left:6px;color:var(--ink);font-weight:600}
.stag{display:inline-block;font-size:11px;border:1px solid var(--line);border-radius:4px;padding:0 5px;margin-left:2px}
.io{list-style:none;margin:8px 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:6px}
.io li{border:1px solid var(--line);border-radius:6px;padding:6px 8px;font-size:13.5px;margin:0;position:relative;background:var(--bg)}
.io li span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.human{font-size:14px;background:var(--soft);border-radius:6px;padding:6px 9px}
.human.none{background:var(--rule)}
.ex-btn{margin:8px 0 4px;font-weight:600}
.ex-btn[aria-expanded="true"]{border-color:var(--accent);background:var(--soft)}
.ex-btn:focus-visible,.closeb:focus-visible,.tools button:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.example{border:1px dashed var(--accent);border-radius:8px;padding:8px 10px;margin:4px 0 10px}
.example figure{margin:0 0 8px}
.example figcaption{font-size:12.5px;font-weight:600;margin-bottom:4px}
.example table{font-size:12.5px}
.example th,.example td{padding:4px 6px}
.ex-flow ol{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.ex-flow li{background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:4px 8px;font-size:13px;margin:0}
.ex-flow li+li::before{content:"→ ";color:var(--muted)}
.ex-exc{font-size:13px;border-left:3px solid var(--warn);padding-left:8px}
.ex-pend{font-size:12px;color:var(--warn)}
.ex-none{font-size:13px;color:var(--muted)}
.ten{display:grid;grid-template-columns:132px 1fr;gap:0;margin:8px 0;font-size:13.5px;border-top:1px solid var(--line)}
.ten dt{font-weight:600;padding:5px 6px 5px 0;border-bottom:1px solid var(--line);color:var(--muted);font-size:12.5px}
.ten dd{margin:0;padding:5px 0;border-bottom:1px solid var(--line)}
.card details{margin:6px 0;font-size:13.5px}
.card summary{cursor:pointer;font-weight:600}
.rtag{display:inline-block;font-size:10.5px;border-radius:3px;padding:0 4px;margin-right:3px;border:1px solid currentColor}
.rtag.req{color:#0e7490}.rtag.dec{color:#7c3aed}.rtag.gap{color:#b91c1c}.rtag.prop{color:var(--muted)}
.tr td{font-size:12.5px}
#tip{position:fixed;z-index:1001;max-width:320px;background:#111;color:#fff;font-size:12.5px;line-height:1.35;padding:6px 8px;border-radius:6px}
#tip[hidden]{display:none}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (max-width:999px){
  .nav{flex-wrap:nowrap;padding:6px 0}
  .nav a{display:none}
  .nav .jump{display:block}
  .dg-scroll.auto-hide{display:none}
  #insp{top:auto;left:0;right:0;width:auto;height:92vh;border-left:0;border-top:1px solid var(--line);border-radius:12px 12px 0 0}
  .io{grid-template-columns:1fr}
  .strip{grid-template-columns:1fr}
  .strip>div:nth-child(odd){border-bottom:0}
}
@media (max-width:600px){h1{font-size:22px}.ten{grid-template-columns:1fr}.ten dt{border-bottom:0;padding-bottom:0}}
@media print{.nav,.tools,#insp{display:none}.dg-scroll{overflow:visible}}
"""

def js():
    return r"""
(function(){
  const DATA = JSON.parse(document.getElementById('dg-data').textContent);
  const insp = document.getElementById('insp'), body = insp.querySelector('.body'), tip = document.getElementById('tip');
  const narrow = () => window.matchMedia('(max-width: 999px)').matches;
  const wide = () => window.matchMedia('(min-width: 1760px)').matches;
  let opener = null, current = null, exampleOpen = false, tipTimer = null;
  const viewers = {};
  const eyeSvg = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5z" fill="none" stroke="#222" stroke-width="1.5"/><circle cx="8" cy="8" r="2.2" fill="none" stroke="#222" stroke-width="1.5"/></svg>';

  function preview(id){ const a = DATA.acts[id]; return '<b>' + id + ' ' + a.title + '</b><br>' + a.input + ' → ' + a.output; }
  function showTip(id, el){ clearTimeout(tipTimer); tipTimer = setTimeout(()=>{ tip.innerHTML = preview(id); const r = el.getBoundingClientRect();
      tip.hidden = false; const tw = tip.offsetWidth; tip.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left)) + 'px';
      tip.style.top = (r.bottom + 8 + 60 > window.innerHeight ? r.top - tip.offsetHeight - 8 : r.bottom + 8) + 'px'; }, 300); }
  function hideTip(){ clearTimeout(tipTimer); tip.hidden = true; }
  function hideTipSoon(){ clearTimeout(tipTimer); tipTimer = setTimeout(() => { tip.hidden = true; }, 200); }
  tip.addEventListener('mouseenter', () => clearTimeout(tipTimer)); tip.addEventListener('mouseleave', hideTip);

  function mark(id, on){
    for (const v of Object.values(viewers)) { const reg = v.get('elementRegistry'), cv = v.get('canvas');
      const el = reg.get(DATA.acts[id].node); if (el) { on ? cv.addMarker(el, 'sel') : cv.removeMarker(el, 'sel'); } }
    document.querySelectorAll('.eye[data-act="' + id + '"]').forEach(b => b.classList.toggle('on', on));
  }
  // keep the selected shape visible: below the docking width the panel moves to the side the shape is not on
  function placePanel(){
    insp.classList.remove('left');
    if (insp.hidden || !current || narrow() || wide()) return;
    const a = DATA.acts[current], v = viewers[a.vid]; if (!v) return;
    const reg = v.get('elementRegistry'), el = reg.get(a.node); if (!el) return;
    const r = reg.getGraphics(el).getBoundingClientRect(), w = insp.offsetWidth;
    if (!r.width || r.bottom < 0 || r.top > window.innerHeight) return;
    if (r.right > window.innerWidth - w && r.left >= w) insp.classList.add('left');
  }
  // a modal sheet on phones: the page behind it cannot be clicked or focused while it is open
  function setInert(on){
    for (const el of document.body.children) {
      if (el === insp || el === tip || el.tagName === 'SCRIPT' || el.tagName === 'TEMPLATE') continue;
      if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    }
  }
  function applyMode(){
    const n = narrow();
    insp.setAttribute('aria-modal', n ? 'true' : 'false');
    document.body.classList.toggle('docked', !insp.hidden && wide());
    setInert(n && !insp.hidden);
    placePanel();
  }
  function open(id, from){
    if (!DATA.acts[id]) return;
    hideTip();
    if (current) mark(current, false);
    if (insp.hidden) opener = from || document.activeElement;
    else if (from) opener = from;
    current = id;
    body.innerHTML = document.getElementById('tpl-' + id).innerHTML;
    const btn = body.querySelector('.ex-btn'), ex = body.querySelector('.example');
    btn.setAttribute('aria-expanded', String(exampleOpen)); ex.hidden = !exampleOpen;
    btn.addEventListener('click', () => { exampleOpen = !exampleOpen; btn.setAttribute('aria-expanded', String(exampleOpen)); ex.hidden = !exampleOpen; });
    insp.querySelector('.bar span').textContent = 'Activity ' + id + ' · ' + DATA.acts[id].view;
    insp.hidden = false; mark(id, true); applyMode();
    try { history.replaceState(null, '', '#a=' + id); } catch(e) {}
    body.scrollTop = 0;
    const h = body.querySelector('h2'); if (h) h.focus({preventScroll: true});
  }
  function close(){
    if (insp.hidden) return;
    if (current) mark(current, false);
    insp.hidden = true; current = null; applyMode();
    try { history.replaceState(null, '', location.pathname + location.search); } catch(e) {}
    if (opener && document.contains(opener)) opener.focus({preventScroll: true});
  }
  window.S1 = {open, close};
  insp.querySelector('.closeb').addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !insp.hidden) { e.preventDefault(); close(); }
    else if (e.key === 'Escape' && !tip.hidden) { hideTip(); }
    if (e.key === 'Tab' && !insp.hidden && narrow()) {
      const f = [...insp.querySelectorAll('button, summary, [href], [tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null);
      if (!f.length) return; const first = f[0], last = f[f.length - 1];
      if (!insp.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (b && !insp.contains(b) && (b.matches('button'))) { open(b.dataset.act, b); }
    else if (b && insp.contains(b) && b.matches('.fl-link')) { open(b.dataset.act); }
  });
  document.addEventListener('mouseover', e => { const b = e.target.closest('button[data-act]'); if (b && !insp.contains(b)) showTip(b.dataset.act, b); });
  document.addEventListener('mouseout', e => { if (e.target.closest('button[data-act]') && !(e.relatedTarget && tip.contains(e.relatedTarget))) hideTipSoon(); });
  // on phones a press on the inert page behind the sheet must not pull focus out of the sheet
  document.addEventListener('mousedown', e => { if (narrow() && !insp.hidden && !insp.contains(e.target)) e.preventDefault(); }, true);
  document.addEventListener('focusin', e => { const b = e.target.closest('button[data-act]'); if (b && !insp.contains(b)) showTip(b.dataset.act, b); else hideTip(); });
  window.addEventListener('resize', applyMode);
  // keep jumped-to headings clear of the sticky navigation
  const nav = document.querySelector('.nav');
  function pad(){ document.documentElement.style.scrollPaddingTop = (nav.offsetHeight + 8) + 'px'; }
  pad(); window.addEventListener('resize', pad);
  const sel = nav.querySelector('select');
  sel.addEventListener('change', () => { const t = document.getElementById(sel.value); if (t) { t.scrollIntoView({block: 'start'}); try { history.replaceState(null, '', '#' + sel.value); } catch(e) {} } sel.value = ''; });

  // diagram / list toggles
  document.querySelectorAll('.tools').forEach(t => {
    const sec = t.closest('section'), dgw = sec.querySelector('.dg-scroll'), lst = sec.querySelector('.listwrap');
    const bD = t.querySelector('[data-mode="dg"]'), bL = t.querySelector('[data-mode="list"]');
    function set(mode){ const d = mode === 'dg'; dgw.classList.remove('auto-hide'); dgw.style.display = d ? '' : 'none'; lst.hidden = d;
      bD.setAttribute('aria-pressed', String(d)); bL.setAttribute('aria-pressed', String(!d));
      if (d) { const v = viewers[dgw.dataset.view]; if (v) fit(v, dgw.dataset.view); } }
    bD.addEventListener('click', () => set('dg')); bL.addEventListener('click', () => set('list'));
    if (narrow()) { bD.setAttribute('aria-pressed', 'false'); bL.setAttribute('aria-pressed', 'true'); lst.hidden = false; dgw.style.display = 'none'; dgw.classList.remove('auto-hide'); }
  });

  function fit(v, vid){ const d = DATA.views[vid]; const cv = v.get('canvas'); cv.resized(); cv.viewbox({x: 0, y: 0, width: d.w, height: d.h}); }

  async function render(vid){
    const d = DATA.views[vid], el = document.getElementById('dg-' + vid);
    const v = new BpmnJS({container: el, width: d.w + 'px', height: d.h + 'px'});
    viewers[vid] = v;
    try { await v.importXML(d.xml); } catch (err) { el.textContent = 'Diagram failed to load: ' + err.message; el.dataset.error = err.message; return; }
    fit(v, vid);
    const ov = v.get('overlays'), reg = v.get('elementRegistry'), bus = v.get('eventBus');
    for (const id of d.acts) {
      const a = DATA.acts[id], el2 = reg.get(a.node); if (!el2) continue;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'eye'; b.dataset.act = id;
      b.style.setProperty('--c', a.color); b.setAttribute('aria-label', 'View ' + id + ' ' + a.title); b.innerHTML = eyeSvg;
      ov.add(a.node, {position: {top: -12, right: 8}, html: b});
    }
    for (const [nid, target] of Object.entries(d.links || {})) { const g = v.get('elementRegistry').getGraphics(nid); if (g) g.classList.add('view-link'); }
    bus.on('element.click', e => {
      const id = e.element.businessObject && e.element.businessObject.id;
      const act = d.nodeAct[id]; if (act) { open(act, document.querySelector('#dg-' + vid + ' .eye[data-act="' + act + '"]')); return; }
      const link = (d.links || {})[id]; if (link) { document.getElementById('view-' + link).scrollIntoView({block: 'start'}); }
    });
    bus.on('element.hover', e => { const id = e.element.businessObject && e.element.businessObject.id; const act = d.nodeAct[id];
      if (act) { const g = reg.getGraphics(e.element); showTip(act, g); } });
    bus.on('element.out', e => { const r = e.originalEvent && e.originalEvent.relatedTarget; if (!(r && tip.contains(r))) hideTipSoon(); });
    el.dataset.ready = 'true';
  }
  Promise.all(Object.keys(DATA.views).map(render)).then(() => {
    document.body.dataset.ready = 'true';
    const m = location.hash.match(/^#a=([\d.]+)$/); if (m) open(m[1]);
  });
})();
"""

def build():
    xmls, geos = {}, {}
    for view in [V.OVERVIEW] + V.VIEWS:
        xmls[view["id"]], geos[view["id"]] = bpmn_xml(view)
    acts_json = {}
    for a, act in ACT.items():
        nid = "A_" + a.replace(".", "_")
        acts_json[a] = dict(title=act["title"], input=act["io"][0], output=act["io"][2], node=nid,
                            color=ACTOR[act["lane"]][3], view=f"View {view_of_act(a)['n']}: {view_of_act(a)['title']}", vid=view_of_act(a)['id'])
    views_json = {}
    for view in [V.OVERVIEW] + V.VIEWS:
        g = geos[view["id"]]
        acts = [act_of(n[0]) for n in view["nodes"] if act_of(n[0])]
        links = {n[0]: n[6]["view"] for n in view["nodes"] if n[6].get("view")}
        views_json[view["id"]] = dict(xml=xmls[view["id"]], w=g["W"], h=g["H"], acts=acts,
                                      nodeAct={"A_" + a.replace(".", "_"): a for a in acts}, links=links)
    data = json.dumps(dict(views=views_json, acts=acts_json)).replace("</", "<\\/")

    P = []; A = P.append
    A(f"<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
      f"<title>Solution 1 one-pager</title><style>{css()}</style></head><body><main>")
    A(f"<h1>{E(D.TITLE)}</h1><p class='sub'>{E(D.SUBTITLE)} · {E(D.VERSION)}</p>")
    nav = "<nav class='nav' aria-label='Sections'><a href='#overview'>Overview</a>"
    for pk, pname, psub, vids in D.PHASES:
        nav += f"<a class='ph' href='#view-{vids[0]}'>{E(pname)}</a>" + "".join(f"<a href='#view-{v}'>{VIEW[v]['n']} {E(VIEW[v]['title'])}</a>" for v in vids)
    nav += "<a href='#controls'>Controls</a><a href='#records'>Records</a><a href='#cases'>Case types</a><a href='#evidence'>Evidence</a>"
    opts = "<option value=''>Jump to…</option><option value='overview'>Overview</option>"
    for pk, pname, psub, vids in D.PHASES:
        opts += f"<optgroup label='{E(pname)}'>" + "".join(f"<option value='view-{v}'>{VIEW[v]['n']} {E(VIEW[v]['title'])}</option>" for v in vids) + "</optgroup>"
    opts += "".join(f"<option value='{k}'>{t}</option>" for k, t in (("controls", "Controls"), ("records", "Records"), ("cases", "Case types"), ("evidence", "Evidence")))
    nav += f"<label class='jump'><span class='sr'>Jump to a section</span><select aria-label='Jump to a section'>{opts}</select></label></nav>"
    A(nav)
    A(f"<p><b>The problem.</b> {E(D.PROBLEM)}</p>")
    A(f"<div class='answer'><strong>The answer.</strong> {E(D.ANSWER)}</div>")
    A("<div class='grid cards'>" + "".join(
        f"<div class='box'><h3>{E(pname)}</h3><p class='sub' style='font-size:13px;margin:0'>{E(psub)} · {'views' if len(vids) > 1 else 'view'} " +
        ", ".join(str(VIEW[v]['n']) for v in vids) + "</p></div>" for pk, pname, psub, vids in D.PHASES) + "</div>")
    A("<div class='box' style='margin-top:10px'><h3>One made-up family in every example</h3><p style='margin:0 0 4px'>" + E(D.FAMILY["case"]) +
      "</p><div class='family'>" + "".join(f"<span><b>{E(k)}:</b> {E(v)}</span>" for k, v in D.FAMILY["values"]) + "</div></div>")
    A("<div class='box' style='margin-top:10px'><h3>How to read the diagrams (BPMN 2.0)</h3><div class='key'>" +
      "".join(f"<span><svg viewBox='0 0 36 28' aria-hidden='true'>{s}</svg>{E(k)}</span>" for k, s in KEY_SVG.items()) +
      "</div><div class='lanes'>" + "".join(f"<span><i class='dot' style='background:{c}'></i><b>{E(n)}</b> <span class='sub'>{E(s)}</span></span>" for k, n, s, c in D.ACTORS) +
      "</div><p class='sub' style='font-size:13px;margin-top:6px'>A pool is one process (one run per combination, case or form copy). Sequence lines stay inside a pool; dashed message lines cross between pools; dotted lines read or write a shared record. "
      "Every activity has an eye button: click it, or the shape, for its full card. Diagrams are drawn at full size; on a narrow screen each view reads as a list. "
      "The form-copy pool is marked ||| because it runs once per copy, side by side; 'every copy of the filing approved' in view 6 stands for the current approvals of all that filing's required copies; a withdrawn or superseded approval does not count.</p></div>")

    # overview
    A("<section class='blk' id='overview'><h2>End to end: who hands what to whom</h2>"
      "<p class='cont'>Four pools. Expat Ready sets up and changes combinations; each firm runs a case per prospect and a process per form copy; the government sits outside. "
      "Click a phase box to jump to its view.</p>")
    A(diagram_block(V.OVERVIEW, list_html(V.OVERVIEW)))
    A("<h3 style='margin-top:16px'>Who does what, by view</h3><div class='matrix'><table class='mx'><thead><tr><th>Actor</th>" +
      "".join(f"<th>{v['n']} {E(v['title'])}</th>" for v in V.VIEWS) + "</tr></thead><tbody>")
    for k, n, s, c in D.ACTORS:
        row = f"<tr><th class='act' style='--c:{c}'>{E(n)}</th>"
        for v in V.VIEWS:
            cell = "".join(f"<button type='button' data-act='{a}' style='--c:{c}'><b>{a}</b> {E(V.SHORT[a])}</button>"
                           for a in [act_of(nd[0]) for nd in v["nodes"] if act_of(nd[0])] if ACT[a]["lane"] == k)
            if k == "gov" and v["id"] == "v6": cell = "<span class='sub'>Receives the application; sends acknowledgement, requests and the decision (messages)</span>"
            row += f"<td>{cell}</td>"
        A(row + "</tr>")
    A("</tbody></table></div></section>")

    for pk, pname, psub, vids in D.PHASES:
        for vid in vids:
            v = VIEW[vid]
            A(f"<section class='view' id='view-{vid}'><div class='vhead'><span class='pl'>{E(pname)}</span><h2>View {v['n']} · {E(v['title'])}</h2></div>"
              f"<p style='margin:0'>{E(v['sub'])}</p><p class='cont'><b>Starts:</b> {E(v['starts'])} · <b>Ends:</b> {E(v['ends'])}</p>")
            A(diagram_block(v, list_html(v)))
            A("</section>")

    # controls
    A("<section class='blk' id='controls'><h2>Controls that run through every view</h2><div class='strip'>" +
      "".join(f"<div>{E(t)}</div><div>{E(s)} <span class='sub'>Records: {E(', '.join(D.RECORD_NAME[r] for r in recs))}.</span></div>" for t, s, recs in D.CONTROLS) + "</div>")
    A("<h3 style='margin-top:14px'>Two different kinds of check</h3><div class='tw'><table><thead><tr><th>Check</th><th>What it shows</th><th>How</th><th>Where</th><th>What it does not show</th></tr></thead><tbody>" +
      "".join(f"<tr><th>{E(a)}</th><td>{E(b)}</td><td>{E(c)}</td><td>{E(d)}</td><td>{E(e)}</td></tr>" for a, b, c, d, e in D.CHECK_KINDS) + "</tbody></table></div>")
    for title, steps in D.SAFEGUARDS:
        A(f"<p style='margin:10px 0 0'><b>{E(title)}</b></p><div class='seq'>" + "<i>→</i>".join(f"<span>{E(s)}</span>" for s in steps) + "</div>")
    A("<h3 style='margin-top:14px'>Principles</h3><div class='strip'>" + "".join(f"<div>{E(t)}</div><div>{E(s)}</div>" for t, s in D.PRINCIPLES) + "</div></section>")

    # records
    A("<section class='blk' id='records'><h2>Shared records</h2><p class='cont'>Data stores, not services. Each activity card lists the records it reads and updates.</p>"
      "<div class='tw'><table><thead><tr><th>Record</th><th>Holds</th><th>Read by</th><th>Updated by</th></tr></thead><tbody>")
    for k, n, holds, rules in D.RECORDS:
        rd = ", ".join(a for a in ACT if k in ACT[a]["reads"]); up = ", ".join(a for a in ACT if k in ACT[a]["updates"])
        extra = ("<ul style='font-size:13px'>" + "".join(f"<li><span class='rtag {c}'>{lab}</span> {E(t)}</li>" for c, lab, t in (tagname(r) for r in rules)) + "</ul>") if rules else ""
        A(f"<tr><th>{E(n)}</th><td>{E(holds)}{extra}</td><td>{rd}</td><td>{up}</td></tr>")
    A("</tbody></table></div></section>")

    # case types
    A("<section class='blk' id='cases'><h2>Individual · Family · Corporate</h2><p class='cont'>Same engine and package shape; the subjects, filings, answerers, repeats and signing differ.</p>"
      "<div class='tw'><table><thead><tr><th></th><th>Individual</th><th>Family</th><th>Corporate</th></tr></thead><tbody>" +
      "".join(f"<tr><th>{E(r[0])}</th><td>{E(r[1])}</td><td>{E(r[2])}</td><td>{E(r[3])}</td></tr>" for r in D.CASE_TYPES) + "</tbody></table></div></section>")

    # evidence
    A("<section class='blk' id='evidence'><h2>Evidence status</h2><p class='cont'>Proposed targets, measured results and approved release criteria are kept apart. Nothing is measured yet: the real read of the official forms comes next.</p>"
      "<div class='tw'><table><thead><tr><th>Measure</th><th>Scope</th><th>Proposed target</th><th>Measured</th><th>Approved release criterion</th></tr></thead><tbody>" +
      "".join(f"<tr><td>{E(a)}</td><td>{E(b)}</td><td>{E(c)}</td><td>{E(d)}</td><td>{E(e)}</td></tr>" for a, b, c, d, e in D.MEASURES) + "</tbody></table></div>")
    A("<h3 style='margin-top:14px'>What today's code cannot do yet</h3><div class='tw'><table><thead><tr><th>Gap</th><th>Evidence</th><th>Activities</th></tr></thead><tbody>" +
      "".join(f"<tr><td>{E(a)}</td><td><code>{E(b)}</code></td><td>{E(c)}</td></tr>" for a, b, c in D.BUILD_GAPS) + "</tbody></table></div>")
    A("<h3 style='margin-top:14px'>Proposed changes to the team's requirements</h3><div class='tw'><table><thead><tr><th>Requirement</th><th>Today</th><th>Proposed</th></tr></thead><tbody>" +
      "".join(f"<tr><td>{E(a)}</td><td>{E(b)}</td><td>{E(c)}</td></tr>" for a, b, c in D.TEAM_CHANGES) + "</tbody></table></div></section>")
    A(f"<footer>{E(D.FOOTER)}</footer></main>")

    # inspector, tooltip, templates, data, scripts
    A("<aside id='insp' role='dialog' aria-modal='false' aria-labelledby='insp-h' hidden><div class='bar'><span></span>"
      "<button type='button' class='closeb' aria-label='Close the activity card'>Close ✕</button></div><div class='body'></div></aside>")
    A("<div id='tip' role='tooltip' hidden></div>")
    for a in ACT: A(f"<template id='tpl-{a}'>{card_html(a)}</template>")
    A(f"<script type='application/json' id='dg-data'>{data}</script>")
    A("<script>" + open(VIEWER_JS).read() + "</script>")
    A(f"<script>{js()}</script></body></html>")
    out = "".join(P)
    with open(OUT, "w") as f: f.write(out)
    return out, geos

def diagram_block(view, listing):
    vid = view["id"]
    return (f"<div class='tools' role='group' aria-label='Show view as'><button type='button' data-mode='dg' aria-pressed='true'>Diagram</button>"
            f"<button type='button' data-mode='list' aria-pressed='false'>List</button></div>"
            f"<div class='dg-scroll auto-hide' data-view='{vid}' role='group' aria-label='{E(view['title'])} diagram; the list gives the same content'>"
            f"<div class='dg' id='dg-{vid}'></div></div>"
            f"<div class='listwrap' hidden>{listing}</div>")

# ------------------------------------------------------------------ structural checks
def checks(out, geos):
    allviews = [V.OVERVIEW] + V.VIEWS
    # 1. every activity is drawn exactly once and has every field
    drawn = [act_of(n[0]) for v in V.VIEWS for n in v["nodes"] if act_of(n[0])]
    for a in ACT:
        if drawn.count(a) != 1: ERR.append(f"activity {a} drawn {drawn.count(a)} times")
        act = ACT[a]
        for k in ("trigger", "prereq", "authority", "ready", "ret", "transfer", "receiving", "screen", "title"):
            if not str(act.get(k, "")).strip(): ERR.append(f"{a}: empty {k}")
        if len(act["io"]) != 4 or not all(x.strip() for x in act["io"]): ERR.append(f"{a}: incomplete Input → Output line")
        if len(act["accept"]) != 2: ERR.append(f"{a}: acceptance needs normal and alternate")
        if not act["reads"] and not act["updates"]: ERR.append(f"{a}: no records")
        if not (act["example"] or act["no_example"]): ERR.append(f"{a}: no example and no reason")
        if not act["rules"] or not act["actions"]: ERR.append(f"{a}: missing rules or actions")
        if act["view"] != next(v["id"] for v in V.VIEWS if a in [act_of(n[0]) for n in v["nodes"]]): ERR.append(f"{a}: view mismatch")
    for a in drawn:
        if a not in ACT: ERR.append(f"drawn activity {a} has no card")
    # 2. flows: endpoints exist, sequence inside a pool, messages across pools, data touches a store
    keys = {}
    for v in allviews:
        nodes = {n[0]: n for n in v["nodes"]}
        pool = lambda r: r[5:] if r.startswith("band:") else nodes[r][2].split(".")[0]
        for s, t, kind, label, opts in v["flows"]:
            for r in (s, t):
                if not r.startswith("band:") and r not in nodes: ERR.append(f"{v['id']}: flow endpoint {r} missing")
                if r.startswith("band:") and r[5:] not in [b[0] for b in v["bands"]]: ERR.append(f"{v['id']}: band {r} not drawn")
            if kind == "seq" and pool(s) != pool(t): ERR.append(f"{v['id']}: sequence flow {s}→{t} crosses pools")
            if kind == "msg" and pool(s) == pool(t): ERR.append(f"{v['id']}: message flow {s}→{t} inside one pool")
            if kind == "data" and "store" not in (nodes[s][1], nodes[t][1]): ERR.append(f"{v['id']}: data association {s}→{t} without a record")
            if kind == "msg" and v["id"] != "v0":
                k = opts.get("key");
                if not k: ERR.append(f"{v['id']}: message {s}→{t} has no pairing key")
                elif "band:gov" in (s, t): pass
                elif not s.startswith("band:") and not t.startswith("band:"): keys.setdefault(k, set()).update({"send", "receive"})
                else: keys.setdefault(k, set()).add("send" if not s.startswith("band:") else "receive")
        # 3. gateways: conditions labelled; splits have joins; reachability
        outs, ins = {}, {}
        for s, t, kind, label, opts in v["flows"]:
            if kind == "seq": outs.setdefault(s, []).append((t, label, opts)); ins.setdefault(t, []).append(s)
        for n in v["nodes"]:
            nid, typ = n[0], n[1]
            o = outs.get(nid, [])
            if typ in ("xor", "or") and len(o) > 1:
                for t, label, opts in o:
                    if not label: ERR.append(f"{v['id']}: unlabelled branch {nid}→{t}")
                if typ == "or" and not any(op.get("default") for _, _, op in o): ERR.append(f"{v['id']}: inclusive split {nid} has no default path")
            if typ == "evg":
                for t, _, _ in o:
                    if nodes[t][1] not in ("catch-msg", "catch-cond"): ERR.append(f"{v['id']}: event gateway {nid} leads to a non-event")
        for typ in ("and", "or"):
            splits = sum(1 for n in v["nodes"] if n[1] == typ and len(outs.get(n[0], [])) > 1)
            joins = sum(1 for n in v["nodes"] if n[1] == typ and len(ins.get(n[0], [])) > 1)
            if splits != joins: ERR.append(f"{v['id']}: {splits} {typ}-splits but {joins} joins")
        starts = [n[0] for n in v["nodes"] if n[1].startswith("start") or n[1] == "link-catch" or n[1] == "evsub"]
        catch_by_msg = {f[1] for f in v["flows"] if f[2] == "msg"}
        seen, stack = set(), list(starts) + [x for x in catch_by_msg if x in nodes]
        while stack:
            x = stack.pop()
            if x in seen: continue
            seen.add(x); stack += [t for t, _, _ in outs.get(x, [])]
            if nodes[x][1] == "evsub": stack += [c[0] for c in v["nodes"] if c[6].get("parent") == x]
        for n in v["nodes"]:
            if n[1] != "store" and n[0] not in seen: ERR.append(f"{v['id']}: {n[0]} not reachable from a start")
            if n[1] not in ("store", "end", "end-msg", "link-throw", "evsub", "sub-ev") and not outs.get(n[0]):
                ERR.append(f"{v['id']}: {n[0]} has no way out")
        # 4. width
        if geos[v["id"]]["W"] > 1240: ERR.append(f"{v['id']}: diagram {geos[v['id']]['W']}px wide (limit 1,240)")
    for k, sides in keys.items():
        if sides != {"send", "receive"}: ERR.append(f"message '{k}' is only {sides} across the views")
    links = {}
    for v in V.VIEWS:
        for n in v["nodes"]:
            if n[1] in ("link-catch", "link-throw"): links.setdefault(n[6]["link"], set()).add(n[1])
    for k, s in links.items():
        if s != {"link-catch", "link-throw"}: ERR.append(f"link '{k}' has no partner ({s})")
    # 5. banned wording and decision numbers in page text
    text = re.sub(r"<script.*?</script>", " ", out, flags=re.S)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.S)
    plain = html.unescape(re.sub(r"<[^>]+>", " ", text))
    for bad in ["box address", "every slip", "staff-only tier", "fourth tier", "only new or uncertain", "new or uncertain items", "bars are set", "below its agreed bar",
                "the union", "skills, one per step", "Only the winner", "earns little"]:
        if bad.lower() in plain.lower(): ERR.append(f"banned wording on the page: '{bad}'")
    for m in re.findall(r"\b(?:AIW-)?D\d{3}\b", plain): ERR.append(f"decision number on the page: {m}")
    # 6. family values consistent
    for d in re.findall(r"\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (?:19|20)\d\d\b", plain):
        if d not in D.FAMILY["dates"] and not d.endswith("2026"): ERR.append(f"date not in the family set: {d}")
    if "70 days" not in plain or re.search(r"expires in (?!70)\d+ days", plain): ERR.append("partner passport expiry not consistent (70 days)")
    return plain

if __name__ == "__main__":
    out, geos = build()
    plain = checks(out, geos)
    try:
        import s3_ledger
        ERR.extend(s3_ledger.run())
    except ImportError:
        ERR.append("ledger module missing")
    nacts = len(ACT); nrules = sum(len(a["rules"]) for a in ACT.values())
    print(f"wrote {os.path.relpath(OUT, ROOT)} ({len(out)//1024} KB · {nacts} activities · {nrules} rules · "
          f"views " + ", ".join(f"{v['id']} {geos[v['id']]['W']}×{geos[v['id']]['H']}" for v in [V.OVERVIEW] + V.VIEWS) + ")")
    if ERR:
        print("CHECKS FAILED:"); [print("  - " + e) for e in ERR]; sys.exit(1)
    print("structural checks: all passed")
