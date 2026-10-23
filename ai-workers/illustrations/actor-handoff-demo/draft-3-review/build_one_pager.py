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
ROW_H, POOL_HDR, LANE_HDR, PAD_L, BAND_H, GAP, POOL_T = 128, 30, 30, 14, 54, 46, 24
TASK_W, TASK_H, GW, EV, ST_W, ST_H, SUB_W, SUB_H = 100, 80, 32, 34, 46, 40, 112, 70
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
        y += POOL_T  # room for the pool's horizontal title above it
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
    notes = V.NOTES.get(vid, []); groups = V.GROUPS.get(vid, [])
    for gid, glabel, members, pad in groups:
        x.append(f'<bpmn:group id="{gid}" categoryValueRef="CV_{gid}" />')
    x.append('</bpmn:collaboration>')
    for gid, glabel, members, pad in groups:
        x.append(f'<bpmn:category id="Cat_{gid}"><bpmn:categoryValue id="CV_{gid}" value="{E(glabel)}" /></bpmn:category>')
    note_geo = {}
    for i, (tgt, text, dx, dy, w) in enumerate(notes):
        T_ = geo["nodes"][tgt]; lines = max(1, -(-int(len(text) * 6.4) // (w - 12)))
        note_geo[f"N_{vid}_{i}"] = (Box(T_.x + dx, T_.y + dy, w, lines * 15 + 10), tgt, text)

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
        for nid_, (bx, tgt, text) in note_geo.items():
            if pool_of(tgt) == pool:
                x.append(f'<bpmn:textAnnotation id="{nid_}"><bpmn:text>{E(text)}</bpmn:text></bpmn:textAnnotation>')
                x.append(f'<bpmn:association id="As_{nid_}" sourceRef="{nid_}" targetRef="{tgt}" associationDirection="None" />')
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
            if typ in ("xor", "and", "or", "evg") and n[6].get("lab") != "below": lb = Box(b.cx - 48, b.t - 32, 96, 28)
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
            opts["_from_band"] = s.startswith("band:")
            lb = flow_label_box(pts, label, kind, opts, geo["W"])
            lab = f"<bpmndi:BPMNLabel>{bounds(lb)}</bpmndi:BPMNLabel>"
        x.append(f'<bpmndi:BPMNEdge id="{fid[id(f)]}_di" bpmnElement="{fid[id(f)]}">{wps}{lab}</bpmndi:BPMNEdge>')
    for nid_, (bx, tgt, text) in note_geo.items():
        x.append(f'<bpmndi:BPMNShape id="{nid_}_di" bpmnElement="{nid_}">{bounds(bx)}</bpmndi:BPMNShape>')
        T_ = geo["nodes"][tgt]
        # join the bracket side of the note to the nearest point of the element
        if T_.r < bx.l: sx, sy = bx.l, bx.cy
        elif T_.l > bx.r: sx, sy = bx.r, bx.cy
        else: sx, sy = (max(bx.l, T_.l) + min(bx.r, T_.r)) / 2, (bx.t if T_.cy < bx.cy else bx.b)
        tx = min(max(sx, T_.l), T_.r); ty = min(max(sy, T_.t), T_.b)
        if T_.l <= sx <= T_.r and not (T_.t <= sy <= T_.b): ty = T_.t if sy < T_.cy else T_.b
        x.append(f'<bpmndi:BPMNEdge id="As_{nid_}_di" bpmnElement="As_{nid_}"><di:waypoint x="{sx:.0f}" y="{sy:.0f}" /><di:waypoint x="{tx:.0f}" y="{ty:.0f}" /></bpmndi:BPMNEdge>')
    for gid, glabel, members, pad in groups:
        bs = [geo["nodes"][m] for m in members]; PB = next(iter(geo["pools"].values()))
        gx, gy = min(b.l for b in bs) - pad, max(min(b.t for b in bs) - pad - 26, PB.t + 6)
        gw, gh = min(max(b.r for b in bs) + pad, PB.r - 6) - gx, min(max(b.b for b in bs) + pad, PB.b - 6) - gy
        x.append(f'<bpmndi:BPMNShape id="{gid}_di" bpmnElement="{gid}"><dc:Bounds x="{gx:.0f}" y="{gy:.0f}" width="{gw:.0f}" height="{gh:.0f}" />'
                 f'<bpmndi:BPMNLabel><dc:Bounds x="{gx + 10:.0f}" y="{gy + gh - 20:.0f}" width="440" height="16" /></bpmndi:BPMNLabel></bpmndi:BPMNShape>')
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
        if len(pts) == 2 and opts.get("_from_band") and y2 > y1: ym = y1 + 16  # keep it in the gap above the pool's title
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
    return blocks_html(act["example"])

def blocks_html(blocks):
    out = []
    for blk in blocks:
        k = blk[0]
        if k == "table" and len(blk[2]) >= 5:
            # wide tables become expandable rows, readable in the side panel: key cell and outcome first, the rest on expand
            _, cap, head, rows = blk
            out.append(f"<figure class='ex-rows'><figcaption>{E(cap)}</figcaption><p class='sub rowhint'>{len(rows)} rows · {E(head[0])} → {E(head[2])}; open a row for {E(', '.join(h.lower() for i, h in enumerate(head) if i not in (0, 2)))}</p>" +
                       "".join(f"<details class='xrow'><summary><b>{E(r[0])}</b><span>{E(r[2])}</span></summary><dl>" +
                               "".join(f"<dt>{E(h)}</dt><dd>{E(c)}</dd>" for i, (h, c) in enumerate(zip(head, r)) if i not in (0, 2)) + "</dl></details>" for r in rows) + "</figure>")
        elif k == "table":
            _, cap, head, rows = blk
            out.append(f"<figure class='ex-tbl'><figcaption>{E(cap)}</figcaption><div class='tw'><table><thead><tr>" + "".join(f"<th>{E(h)}</th>" for h in head) +
                       "</tr></thead><tbody>" + "".join("<tr>" + "".join(f"<td>{E(c)}</td>" for c in r) + "</tr>" for r in rows) + "</tbody></table></div></figure>")
        elif k == "flow":
            _, cap, steps = blk
            out.append(f"<figure class='ex-flow'><figcaption>{E(cap)}</figcaption><ol>" + "".join(f"<li>{E(s)}</li>" for s in steps) + "</ol></figure>")
        elif k == "exception":
            out.append(f"<p class='ex-exc'><b>Exception.</b> {E(blk[1])}</p>")
        elif k == "pending":
            out.append("<p class='ex-pend'>Immigration conditions, forms and values shown are examples, pending the Immigration SME.</p>")
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
    gaps = [f"G|{g}" for g, _, acts in D.BUILD_GAPS if a in [x.strip() for x in acts.split("·")]] if not any(r.startswith("G|") for r in act["rules"]) else []
    rules = "".join(f"<li><span class='rtag {c}'>{lab}</span> {E(txt)}</li>" for c, lab, txt in (tagname(r) for r in act["rules"] + gaps))
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
.eye{all:unset;box-sizing:border-box;flex:none;width:26px;height:26px;border-radius:50%;background:#fff;color:var(--c,#1b1b1a);border:2px solid var(--c,#1b1b1a);display:grid;place-items:center;cursor:pointer;box-shadow:0 0 0 3px color-mix(in srgb,var(--c,#1b1b1a) 18%,transparent),0 1px 2px rgba(0,0,0,.2);transition:transform .12s}
.eye svg{width:15px;height:15px}
.eye:hover{transform:scale(1.12)}
.eye:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.eye.on{background:var(--c,#1b1b1a);color:#fff}
.dg .eye{width:21px;height:21px;border-width:1.5px;box-shadow:0 0 0 2px color-mix(in srgb,var(--c,#1b1b1a) 16%,transparent)}
.dg .eye svg{width:13px;height:13px}
.band-setup .eye{--c:var(--b-setup)}.band-case .eye{--c:var(--b-case)}.band-change .eye{--c:var(--b-change)}.whois .eye{--c:var(--accent);margin-left:auto}
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
/* phase and band colours: one hue per band, used for its label, numbers and edge; meaning always carried by words too */
:root{--b-setup:#1d4ed8;--b-case:#15803d;--b-change:#b45309;--t-setup:#eef3ff;--t-case:#eef8f1;--t-change:#fdf4e8;--note:#f7f7f3}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--b-setup:#7aa2ff;--b-case:#5fd38a;--b-change:#f0a85a;--t-setup:#17203a;--t-case:#132a1c;--t-change:#2c2112;--note:#1f2024}}
:root[data-theme="dark"]{--b-setup:#7aa2ff;--b-case:#5fd38a;--b-change:#f0a85a;--t-setup:#17203a;--t-case:#132a1c;--t-change:#2c2112;--note:#1f2024}
.two{grid-template-columns:1fr}
.terms h3,.whois h3{margin:0}
.terms dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:4px 18px;margin:6px 0 0}
.terms dl div{display:flex;gap:8px;font-size:13.5px;line-height:1.35}
.terms dt{font-weight:700;flex:none;min-width:42px}
.terms dd{margin:0;color:var(--muted)}
.whois{margin-top:10px}
.whead{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px}
.whead .eye{margin-left:auto}
.wgrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:8px}
.wg{border-radius:8px;padding:8px 10px;background:var(--note);border-top:3px solid var(--line)}
.wg-er{border-top-color:var(--b-setup)}.wg-firm{border-top-color:var(--b-case)}.wg-client{border-top-color:var(--a-cli)}.wg-product{border-top-color:var(--a-sys)}.wg-outside{border-top-color:var(--a-gov)}
.wg h4{margin:0;font-size:13.5px;font-weight:800;letter-spacing:.01em}
.wgd{margin:2px 0 6px;font-size:12px;color:var(--muted);line-height:1.3}
/* aligned lists: a fixed number or bullet column, wrapped lines start under the text */
.msec{margin:0}
.mlab{margin:2px 0 3px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:5px}
.mwho,.mcall,.wg ol,.vnotes ol{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.mwho{counter-reset:w}.wg ol{counter-reset:w}
.mwho li,.mcall li,.wg li{display:grid;grid-template-columns:18px minmax(0,1fr);column-gap:5px;margin:0;font-size:13px;line-height:1.32}
.mwho li,.wg li{counter-increment:w}
.mwho li::before,.wg li::before{content:counter(w) ".";font-weight:800;color:var(--muted);text-align:right;font-variant-numeric:tabular-nums}
.mcall li::before{content:"›";color:var(--b-setup);text-align:right;font-weight:900;font-size:15px;line-height:1.05}
.band-case .mcall li::before{color:var(--b-case)}.band-change .mcall li::before{color:var(--b-change)}
.mwho b,.wg li b{color:var(--c);font-weight:800}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .mwho b,:root:not([data-theme="light"]) .wg li b{color:var(--ink)}}
:root[data-theme="dark"] .mwho b,:root[data-theme="dark"] .wg li b{color:var(--ink)}
.side{margin-left:3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);white-space:nowrap;cursor:help}
.wr{color:var(--muted);font-size:12px}
.wn{display:inline-block;font-size:11px;font-weight:700;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:0 7px;margin-left:4px;vertical-align:1px;background:var(--panel)}
.mrt{margin:0 0 0 23px;font-size:12.5px;line-height:1.35}
.mgate .qq{margin:0 0 3px 23px;font-weight:700;font-size:13px;line-height:1.3}
.mgate ul{list-style:none;margin:0 0 0 23px;padding:0;display:grid;grid-template-columns:fit-content(38%) minmax(0,1fr);column-gap:6px;row-gap:3px;font-size:12.5px;line-height:1.32}
.mgate li{display:contents}
.mgate li b{line-height:1.25}
.snum.start,.band-case .snum.start,.sg-case .snum.start{background:var(--panel);border:3px solid var(--b-case);box-shadow:none;width:24px;min-width:24px;height:24px}
.sg .snum.start,.sg-case .snum.start{width:18px;min-width:18px;height:18px;border-width:2px}
.kick{display:block;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--b-case);line-height:1.1;margin-bottom:1px}
.mdoors{position:relative}
.mdoors .dlab{position:absolute;top:-19px;left:2px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--b-case)}
.band-case .bhead{margin-bottom:26px}
.sgways{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin:4px 0 2px;padding-bottom:4px;border-bottom:1px dashed var(--line)}
.sgways a{display:inline-flex;align-items:center;gap:5px;color:var(--ink);text-decoration:none;font-size:12.5px}
.sgsub{font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.vnotes li{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:9px;margin:0;font-size:13px;line-height:1.35;padding:8px 10px;background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--c);border-radius:0 8px 8px 0}
.vn-id{align-self:start;font-weight:800;font-size:12px;color:#fff;background:var(--c);border-radius:5px;padding:1px 6px;font-variant-numeric:tabular-nums}
.vnotes .fl-link{font-weight:700;text-decoration:none}
.vn-who{order:-1}
.vn-b{display:flex;flex-direction:column}
/* stage strip */
.stagestrip>ol{list-style:none;margin:10px 0 4px;padding:0;display:grid;grid-template-columns:3fr 8fr 3fr;gap:8px}
.sg{border-radius:8px;padding:6px 8px;background:var(--t-setup)}
.sg-case{background:var(--t-case)}.sg-change{background:var(--t-change)}
.sgname{font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--b-setup)}
.sg-case .sgname{color:var(--b-case)}.sg-change .sgname{color:var(--b-change)}
.sgrange{font-size:12px;color:var(--muted);margin-left:8px}
.sg ol{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:4px 10px}
.sg li{margin:0}
.sg a{display:inline-flex;align-items:center;gap:5px;color:var(--ink);text-decoration:none;font-size:12.5px}
.sg a:hover .sgt,.sg a:focus-visible .sgt{text-decoration:underline}
.sg .snum{width:22px;min-width:22px;height:22px;font-size:11.5px}
/* bands */
.band{border:1px solid var(--line);border-radius:12px;padding:12px 14px 14px;margin:12px 0 0;background:var(--panel);border-top:5px solid var(--b-setup)}
.band-case{border-top-color:var(--b-case)}.band-change{border-top-color:var(--b-change)}
.bhead{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;margin-bottom:10px}
.bhead h3{margin:0;font-size:18px;font-weight:800}
.bhead p{flex-basis:100%;margin:0;font-size:13.5px;color:var(--muted)}
.freq{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;border-radius:999px;padding:3px 12px;color:#fff;background:var(--b-setup)}
.band-case .freq{background:var(--b-case)}.band-change .freq{background:var(--b-change)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .freq{color:#111}}
:root[data-theme="dark"] .freq{color:#111}
.brange{font-size:13px;font-weight:700;color:var(--b-setup)}.band-case .brange{color:var(--b-case)}.band-change .brange{color:var(--b-change)}
.bwho{font-size:13px;color:var(--muted)}
/* the map grid: four item columns and three arrow columns */
.mgrid{display:grid;grid-template-columns:minmax(0,1fr) 88px minmax(0,1fr) 88px minmax(0,1fr) 88px minmax(0,1fr);align-items:start;row-gap:0}
.mnode{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:9px 11px 10px;font-size:13.5px;display:flex;flex-direction:column;gap:6px;position:relative}
.band-setup .mnode{background:var(--t-setup)}.band-case .mnode{background:var(--t-case)}.band-change .mnode{background:var(--t-change)}
.mnode.sel{outline:3px solid var(--ink);outline-offset:2px}
.mnode header{display:flex;align-items:flex-start;gap:8px}
.mnode h4{margin:2px 0 0;font-size:15px;line-height:1.25;font-weight:800;flex:1}
.snum{flex:none;display:grid;place-items:center;width:28px;min-width:28px;height:28px;border-radius:50%;background:var(--b-setup);color:#fff;font-weight:800;font-size:13.5px;box-shadow:0 0 0 3px var(--panel),0 0 0 4px var(--b-setup)}
.band-case .snum,.sg-case .snum{background:var(--b-case);box-shadow:0 0 0 3px var(--panel),0 0 0 4px var(--b-case)}
.band-change .snum,.sg-change .snum{background:var(--b-change);box-shadow:0 0 0 3px var(--panel),0 0 0 4px var(--b-change)}
.sg .snum{box-shadow:none}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .snum{color:#111}}
:root[data-theme="dark"] .snum{color:#111}
.mruns::before,.mgate .q::before{content:"";flex:none;width:16px;height:16px;margin-top:1px;background:var(--muted);-webkit-mask:var(--ic) center/contain no-repeat;mask:var(--ic) center/contain no-repeat}
.mruns{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.6'%3E%3Cpath d='M13 8a5 5 0 1 1-1.5-3.6M13 2.5V5h-2.5'/%3E%3C/svg%3E")}
.mruns.ic-par{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.7'%3E%3Cpath d='M2 5h9M2 11h9M9 2.5 11.5 5 9 7.5M9 8.5l2.5 2.5L9 13.5M14 3v10'/%3E%3C/svg%3E")}
.mruns.ic-wait{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5'%3E%3Cpath d='M4 1.5h8M4 14.5h8M5 1.5c0 4 6 4 6 6.5S5 10.5 5 14.5M11 1.5c0 4-6 4-6 6.5s6 2.5 6 6.5'/%3E%3C/svg%3E")}
.mruns.ic-each{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5'%3E%3Crect x='4.5' y='1.5' width='9' height='10' rx='1'/%3E%3Cpath d='M2.5 4.5v9a1 1 0 0 0 1 1h7'/%3E%3C/svg%3E")}
.mgate{border-left:3px solid var(--b-setup);background:var(--panel);border-radius:0 6px 6px 0;padding:5px 8px;font-size:12.5px;line-height:1.35}
.mgate .q{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5'%3E%3Cpath d='M8 1.5 14.5 8 8 14.5 1.5 8z'/%3E%3Cpath d='M6.6 6.4a1.5 1.5 0 1 1 2 1.4c-.4.2-.6.5-.6.9v.4M8 10.8v.2'/%3E%3C/svg%3E")}
.mgate .q::before{background:var(--ink)}
.band-case .mgate{border-left-color:var(--b-case)}.band-change .mgate{border-left-color:var(--b-change)}
.sg{border-top:3px solid var(--b-setup)}.sg-case{border-top-color:var(--b-case)}.sg-change{border-top-color:var(--b-change)}
/* rails between the bands: one shared record, or the two things the bands exchange; short parallel arrows mark the handoffs */
.mrail{position:relative;padding:26px 0;margin:0}
.mrail .rbox{position:relative;z-index:1;display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;border:2px dashed var(--b-setup);border-radius:12px;background:var(--panel);padding:8px 14px;font-size:13px;line-height:1.35}
.mrail .rk{font-weight:800;font-size:14px}
.mrail .rread{flex-basis:100%;font-weight:700;color:var(--b-setup);font-size:12.5px}
.mrail .cyl{width:26px;height:22px;border-radius:50% / 6px}.mrail .cyl::before{height:9px}
.mrail-x .rbox{border:1px solid var(--line);border-left:4px solid var(--b-change);border-radius:0 10px 10px 0;background:var(--t-change);flex-direction:column;align-items:flex-start;gap:2px}
.rv{position:absolute;width:2px;background:var(--muted)}
.rv::after{content:"";position:absolute;left:-5px;border-left:6px solid transparent;border-right:6px solid transparent}
.rv-in{top:0;height:26px;right:calc(15px + (100% - 294px) / 8);background:var(--b-setup)}.rv-in::after{bottom:-2px;border-top:9px solid var(--b-setup)}
.rv-out{bottom:0;height:26px;left:calc(103px + (100% - 294px) * .375);background:var(--b-setup)}.rv-out::after{bottom:-2px;border-top:9px solid var(--b-setup)}
.rv-dn{top:0;bottom:0;left:calc(15px + (100% - 294px) / 8 - 10px)}.rv-dn::after{bottom:-2px;border-top:9px solid var(--muted)}
.rv-up{top:0;bottom:0;left:calc(15px + (100% - 294px) / 8 + 10px)}.rv-up::after{top:-2px;border-bottom:9px solid var(--muted)}
.mctl{display:flex;gap:6px;margin-top:auto;padding-top:2px}
.mbtn{font:inherit;font-size:12.5px;font-weight:700;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:999px;padding:3px 12px;cursor:pointer}
.mbtn:hover{border-color:var(--ink)}
.mbtn:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.mbtn.on{background:var(--ink);color:var(--panel);border-color:var(--ink)}
.marr{align-self:start;padding-top:19px;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;text-align:center;font-size:11.5px;overflow-wrap:anywhere;hyphens:auto;font-weight:600;color:var(--muted);padding:0 5px}
.marr .hl{line-height:1.2}
.marr .ln{order:-1;display:block;position:relative;width:100%;height:2px;background:var(--muted);margin:0 0 5px}
.marr .ln::after{content:"";position:absolute;right:-2px;top:-5px;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:9px solid var(--muted)}
.marr.phone-only{display:none}
.mdoors{display:flex;flex-direction:column;gap:8px;min-width:0}
.mdoors .dlab{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--b-case)}
.mdoors + .marr{padding-top:19px}
.mwrap{grid-column:1 / -1;position:relative;height:46px;margin:2px 0}
.mwrap::before{content:"";position:absolute;top:0;height:23px;left:calc((100% - 264px) / 8);right:calc((100% - 264px) / 8);border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);border-bottom-right-radius:10px}
.mwrap::after{content:"";position:absolute;top:21px;bottom:6px;left:calc((100% - 264px) / 8 - 1px);border-left:2px solid var(--muted);border-top-left-radius:10px}
.mwrap .hl{position:absolute;top:13px;left:50%;transform:translateX(-50%);background:var(--panel);padding:0 8px;font-size:11.5px;font-weight:600;color:var(--muted);white-space:nowrap}
.mwrap .ah,.mread .ah{position:absolute;bottom:0;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid var(--muted)}
.mwrap .ah{left:calc((100% - 264px) / 8 - 5px)}
.mstore{align-self:center;min-height:260px;display:flex;flex-direction:column;align-items:center;text-align:center;justify-content:center;gap:4px;padding:8px 10px;border:2px dashed var(--b-setup);border-radius:12px;background:var(--panel)}
.mstore h4{margin:0;font-size:15px;font-weight:800}
.mstore p{margin:0;font-size:12.5px;line-height:1.35;color:var(--muted)}
.cyl{width:44px;height:38px;position:relative;border:2px solid var(--b-setup);border-radius:50% / 9px;background:var(--t-setup)}
.cyl::before{content:"";position:absolute;left:-2px;right:-2px;top:-2px;height:14px;border:2px solid var(--b-setup);border-radius:50%;background:var(--panel)}
.mend{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px;padding:8px}
.mend .ring{width:30px;height:30px;border-radius:50%;border:4px solid var(--ink)}
.mend p{margin:0;font-size:13px;line-height:1.35}
.mread{position:relative;height:60px;margin:0}
.mread::before{content:"";position:absolute;top:0;height:30px;right:calc(15px + (100% - 294px) / 8);left:calc(103px + (100% - 294px) * .375);border-right:2px dashed var(--b-setup);border-bottom:2px dashed var(--b-setup)}
.mread::after{content:"";position:absolute;top:30px;bottom:8px;left:calc(103px + (100% - 294px) * .375);border-left:2px dashed var(--b-setup)}
.mread .ah{left:calc(103px + (100% - 294px) * .375 - 5px);border-top-color:var(--b-setup)}
.mread .hl{position:absolute;top:20px;left:calc(103px + (100% - 294px) * .375 + 16px);background:var(--bg);padding:0 8px;font-size:12px;font-weight:700;color:var(--b-setup)}
.mxlink{margin:12px 0 0;padding:6px 12px;border-left:4px solid var(--b-change);background:var(--t-change);border-radius:0 8px 8px 0;font-size:13px}
.mxlink p{margin:0}
.scard .io li span{text-transform:none}
.scard .mwho{margin:6px 0}
.alist{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:4px;font-size:13.5px}
.inview{margin:12px 0 2px;font-size:14px}
details.symbols{margin:6px 0 10px;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:6px 10px}
details.symbols summary{cursor:pointer;font-weight:600;font-size:13.5px}
details.techov>summary{cursor:pointer;list-style:none;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
details.techov>summary::-webkit-details-marker{display:none}
details.techov>summary .th{font-weight:800;font-size:16px}
details.techov>summary::before{content:"▸ ";font-weight:800}
details.techov[open]>summary::before{content:"▾ "}
details.techov[open]>summary .sub{display:none}
.tools .symb{margin-left:auto}
/* view headers: phase in its band colour */
.vhead .pl{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#fff;background:var(--b-setup);border-radius:999px;padding:2px 11px}
.ph-case .vhead .pl,.ph-file .vhead .pl{background:var(--b-case)}.ph-change .vhead .pl{background:var(--b-change)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .vhead .pl{color:#111}}
:root[data-theme="dark"] .vhead .pl{color:#111}
.vhead .psub{font-size:12.5px;color:var(--muted)}
.vhead h2{flex-basis:100%;margin:2px 0 0}
.vstages{font-size:12.5px;font-weight:700;color:var(--muted)}
section.view{border-top-color:var(--b-setup)}section.view.ph-case,section.view.ph-file{border-top-color:var(--b-case)}section.view.ph-change{border-top-color:var(--b-change)}
/* lane and pool names, horizontal, on the diagram */
.lanetag{pointer-events:auto;cursor:help;display:flex;flex-direction:column;gap:1px;width:max-content;max-width:108px;font:700 11.5px/1.15 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:#111;background:#fff;border:1px solid #d5d5cf;border-left:4px solid var(--c);border-radius:4px;padding:2px 7px;box-shadow:0 1px 1px rgba(0,0,0,.06)}
.lanetag i{font-style:normal;font-weight:700;font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:#555}
.pooltag{pointer-events:none;white-space:nowrap;background:#fff;padding:0 4px;font:800 13px/1.2 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:#111}
.dg [data-element-id^="P_"]>.djs-visual>text,.dg [data-element-id^="L_"]>.djs-visual>text{display:none}
.dg .djs-element[data-element-id$="_label"] text,.dg .djs-element[data-element-id$="_label"] tspan{font-size:10.5px!important;fill:#5b5b57!important}
.dg [data-element-id^="N_"] text,.dg [data-element-id^="N_"] tspan{font-size:11px!important;fill:#3f3f3c!important;font-style:italic}
/* plain-language notes under each view */
.vnotes{margin:10px 0 0}
.vnotes h3{font-size:14.5px;margin:0 0 6px}
.vnotes ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:8px}
.vnotes .fl-link{font-weight:600}
.vn-who{font-size:12px;color:var(--muted);margin-top:1px}
.vn-do{color:var(--ink)}
.vn-mi{font-size:12px;color:var(--muted);font-style:italic}
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
.ex-rows .rowhint{font-size:12px;margin:0 0 4px}
.xrow{border:1px solid var(--line);border-radius:6px;margin:4px 0;background:var(--bg)}
.xrow>summary{cursor:pointer;padding:5px 8px;display:flex;flex-direction:column;gap:1px;font-size:13px;list-style:none}
.xrow>summary::-webkit-details-marker{display:none}
.xrow>summary b::before{content:"▸ ";color:var(--muted)}
.xrow[open]>summary b::before{content:"▾ "}
.xrow>summary span{color:var(--muted);font-size:12.5px;padding-left:14px}
.xrow dl{margin:0;padding:2px 10px 8px 22px;font-size:12.5px}
.xrow dt{font-weight:700;color:var(--muted);font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;margin-top:4px}
.xrow dd{margin:0}
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
#tip{position:fixed;z-index:1001;max-width:320px;background:#111827;color:#fff;font-size:12.5px;line-height:1.4;padding:7px 10px;border-radius:8px;border-left:4px solid #60a5fa;box-shadow:0 6px 18px rgba(0,0,0,.25)}
#tip .tk{display:block;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#93c5fd;margin-bottom:2px}
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
  .mgrid{grid-template-columns:1fr}
  .marr,.marr.phone-only{display:flex;flex-direction:row;gap:8px;padding:4px 0 4px 26px;justify-content:flex-start;min-height:34px}
  .marr .ln{order:-1;width:2px;height:22px;margin:0}
  .marr .ln::after{right:auto;left:-5px;top:auto;bottom:-6px;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid var(--muted);border-bottom:0}
  .mwrap,.mread,.rv{display:none}
  .mrail{padding:10px 0}
  .mdoors{margin-top:0}
  .mdoors .dlab{position:static}
  .band-case .bhead{margin-bottom:10px}
  .stagestrip>ol{grid-template-columns:1fr}
  .wgrid{grid-template-columns:1fr 1fr}
  .vnotes{display:none}
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
  const eyeSvg = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

  const KIND = {user: 'Person step (the person mark)', service: 'Automatic step by the product (the gear mark)', manual: 'Done by hand outside the product (the hand mark)', call: 'Calls views 1–3 on the changed items (thick border)'};
  function preview(id){ const a = DATA.acts[id]; return '<span class="tk">Activity ' + id + ' · ' + (KIND[a.kind] || '') + '</span><b>' + a.title + '</b><br>' + a.input + ' → ' + a.output + (a.mi ? '<br><i>||| Runs ' + a.mi + '</i>' : ''); }
  function esc(t){ return String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c])); }
  function showText(html, el){ clearTimeout(tipTimer); tipTimer = setTimeout(() => { tip.innerHTML = html; const r = el.getBoundingClientRect();
      tip.hidden = false; const tw = tip.offsetWidth; tip.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left)) + 'px';
      tip.style.top = (r.bottom + 8 + 60 > window.innerHeight ? r.top - tip.offsetHeight - 8 : r.bottom + 8) + 'px'; }, 250); }
  function symbolTip(el){ const bo = el.businessObject; if (!bo) return null; const t = bo.$type, ed = ((bo.eventDefinitions || [])[0] || {}).$type || '', n = bo.name ? esc(bo.name) : '';
    const k = (a, b) => '<span class="tk">' + a + '</span>' + b + (n && !b.includes(n) ? '<br><b>' + n + '</b>' : '');
    if (t === 'bpmn:ExclusiveGateway') return k('Decision mark ✕', 'Exactly one outgoing path is taken; each path is labelled with its answer.');
    if (t === 'bpmn:ParallelGateway') return k('Parallel mark +', 'All paths start together; where paths join again, it waits for every one of them.');
    if (t === 'bpmn:InclusiveGateway') return k('Inclusive mark ○', 'Every path that applies runs; the join waits for those paths only.');
    if (t === 'bpmn:EventBasedGateway') return k('Wait mark ⬠', 'Waits for whichever of the next events happens first.');
    if (t === 'bpmn:StartEvent') return k('Start', ed.includes('Message') ? 'Starts when this message arrives.' : ed.includes('Timer') ? 'Starts on a schedule.' : 'Where this process starts.');
    if (t === 'bpmn:EndEvent') return k('End', ed.includes('Message') ? 'Ends and sends a message to another pool.' : 'Where this path ends.');
    if (t === 'bpmn:IntermediateCatchEvent') return k('Wait', ed.includes('Message') ? 'Waits for a message from another pool.' : ed.includes('Conditional') ? 'Waits until this becomes true.' : 'Continues from another view (link mark).');
    if (t === 'bpmn:IntermediateThrowEvent') return k(ed.includes('Link') ? 'Link' : 'Message', ed.includes('Link') ? 'Continues in another view (link mark).' : 'Sends a message to another pool.');
    if (t === 'bpmn:DataStoreReference') return k('Shared record', 'A data store; dotted lines show who reads or writes it.');
    if (t === 'bpmn:SubProcess') return bo.triggeredByEvent ? k('Event sub-process (dotted border)', 'Runs inside each case whenever its start event happens.') : k('Collapsed sub-process ⊞', 'Click to open its detailed view.');
    if (t === 'bpmn:CallActivity') return k('Call activity (thick border)', 'Runs views 1–3 again on the changed items only.');
    if (t === 'bpmn:Group') return k('Boundary (dashed)', 'A visual boundary: ' + esc(((bo.categoryValueRef || {}).value) || ''));
    if (t === 'bpmn:MessageFlow') return k('Message (dashed line)', 'Something passed between two pools.');
    if (t === 'bpmn:DataInputAssociation' || t === 'bpmn:DataOutputAssociation') return k('Reads or writes a record (dotted line)', '');
    return null; }
  function showTip(id, el){ clearTimeout(tipTimer); tipTimer = setTimeout(()=>{ tip.innerHTML = preview(id); const r = el.getBoundingClientRect();
      tip.hidden = false; const tw = tip.offsetWidth; tip.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left)) + 'px';
      tip.style.top = (r.bottom + 8 + 60 > window.innerHeight ? r.top - tip.offsetHeight - 8 : r.bottom + 8) + 'px'; }, 300); }
  function hideTip(){ clearTimeout(tipTimer); tip.hidden = true; }
  function hideTipSoon(){ clearTimeout(tipTimer); tipTimer = setTimeout(() => { tip.hidden = true; }, 200); }
  tip.addEventListener('mouseenter', () => clearTimeout(tipTimer)); tip.addEventListener('mouseleave', hideTip);

  function mark(id, on){
    if (!DATA.acts[id]) { document.querySelectorAll('.det[data-card="' + id + '"], .det-actors[data-card="' + id + '"]').forEach(b => b.classList.toggle('on', on));
      const n = document.getElementById(id); if (n && n.classList.contains('mnode')) n.classList.toggle('sel', on); return; }
    for (const v of Object.values(viewers)) { const reg = v.get('elementRegistry'), cv = v.get('canvas');
      const el = reg.get(DATA.acts[id].node); if (el) { on ? cv.addMarker(el, 'sel') : cv.removeMarker(el, 'sel'); } }
    document.querySelectorAll('.eye[data-act="' + id + '"]').forEach(b => b.classList.toggle('on', on));
  }
  // keep the selected shape visible: below the docking width the panel moves to the side the shape is not on
  function placePanel(){
    insp.classList.remove('left');
    if (insp.hidden || !current || narrow() || wide()) return;
    let r; const a = DATA.acts[current];
    if (a) { const v = viewers[a.vid]; if (!v) return; const reg = v.get('elementRegistry'), el = reg.get(a.node); if (!el) return; r = reg.getGraphics(el).getBoundingClientRect(); }
    else { const n = document.getElementById(current); if (!n || !n.classList.contains('mnode')) return; r = n.getBoundingClientRect(); }
    const w = insp.offsetWidth;
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
  function open(id, from, opts){
    const isAct = !!DATA.acts[id];
    if (!isAct && !(DATA.cards || {})[id]) return;
    hideTip();
    if (current) mark(current, false);
    if (insp.hidden) opener = from || document.activeElement;
    else if (from) opener = from;
    current = id;
    if (opts && opts.example) exampleOpen = true;
    body.innerHTML = document.getElementById('tpl-' + id).innerHTML;
    const btn = body.querySelector('.ex-btn'), ex = body.querySelector('.example');
    if (btn && ex) {
      btn.setAttribute('aria-expanded', String(exampleOpen)); ex.hidden = !exampleOpen;
      btn.addEventListener('click', () => { exampleOpen = !exampleOpen; btn.setAttribute('aria-expanded', String(exampleOpen)); ex.hidden = !exampleOpen; });
    }
    insp.querySelector('.bar span').textContent = isAct ? 'Activity ' + id + ' · ' + DATA.acts[id].view : DATA.cards[id].label;
    insp.hidden = false; mark(id, true); applyMode();
    try { history.replaceState(null, '', (isAct ? '#a=' : '#c=') + id); } catch(e) {}
    body.scrollTop = 0;
    const h = body.querySelector('h2'); if (h) h.focus({preventScroll: true});
    if (opts && opts.example && btn) { btn.scrollIntoView({block: 'start'}); btn.focus({preventScroll: true}); }
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
    const c = e.target.closest('button[data-card]');
    if (c && !insp.contains(c)) { open(c.dataset.card, c, {example: c.dataset.ex === '1'}); return; }
    const b = e.target.closest('[data-act]');
    if (b && !insp.contains(b) && (b.matches('button'))) { open(b.dataset.act, b); }
    else if (b && insp.contains(b) && b.matches('.fl-link')) { open(b.dataset.act); }
  });
  document.addEventListener('mouseover', e => { const b = e.target.closest('button[data-act]'); if (b && !insp.contains(b)) { showTip(b.dataset.act, b); return; }
    const d = e.target.closest('[data-tip]'); if (d) showText(esc(d.dataset.tip), d); });
  document.addEventListener('mouseout', e => { if (e.target.closest('[data-tip]') && !(e.relatedTarget && (tip.contains(e.relatedTarget) || e.target.closest('[data-tip]').contains(e.relatedTarget)))) hideTipSoon(); });
  document.addEventListener('mouseout', e => { if (e.target.closest('button[data-act]') && !(e.relatedTarget && tip.contains(e.relatedTarget))) hideTipSoon(); });
  // on phones a press on the inert page behind the sheet must not pull focus out of the sheet
  document.addEventListener('mousedown', e => { if (narrow() && !insp.hidden && !insp.contains(e.target)) e.preventDefault(); }, true);
  document.addEventListener('focusin', e => { const b = e.target.closest('button[data-act]'); if (b && !insp.contains(b)) { showTip(b.dataset.act, b); return; }
    const d = e.target.closest('[data-tip]'); if (d && !insp.contains(d)) showText(esc(d.dataset.tip), d); else hideTip(); });
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
      b.style.setProperty('--c', a.color); b.setAttribute('aria-label', 'Details: activity ' + id + ' ' + a.title); b.innerHTML = eyeSvg;
      ov.add(a.node, {position: {top: 3, right: 25}, html: b});
    }
    // horizontal pool and lane names (the rotated BPMN labels are hidden by the page's style; the names and roles stay in the diagram data)
    for (const p of d.pools || []) { if (!reg.get(p.id)) continue; const t = document.createElement('div'); t.className = 'pooltag'; t.textContent = p.name;
      ov.add(p.id, {position: {top: -20, left: 2}, html: t}); }
    for (const l of d.lanes || []) { if (!reg.get(l.id)) continue; const t = document.createElement('div'); t.className = 'lanetag'; t.style.setProperty('--c', l.color);
      t.innerHTML = '<span></span><i></i>'; t.firstChild.textContent = l.name; t.lastChild.textContent = l.side; t.dataset.tip = l.tip;
      ov.add(l.id, {position: {top: 4, left: 4}, html: t}); }
    for (const [nid, target] of Object.entries(d.links || {})) { const g = v.get('elementRegistry').getGraphics(nid); if (g) g.classList.add('view-link'); }
    bus.on('element.click', e => {
      const id = e.element.businessObject && e.element.businessObject.id;
      const act = d.nodeAct[id]; if (act) { open(act, document.querySelector('#dg-' + vid + ' .eye[data-act="' + act + '"]')); return; }
      const link = (d.links || {})[id]; if (link) { document.getElementById('view-' + link).scrollIntoView({block: 'start'}); }
    });
    bus.on('element.hover', e => { const id = e.element.businessObject && e.element.businessObject.id; const act = d.nodeAct[id];
      const g = reg.getGraphics(e.element); if (act) { showTip(act, g); return; } const h = symbolTip(e.element); if (h) showText(h, g); });
    bus.on('element.out', e => { const r = e.originalEvent && e.originalEvent.relatedTarget; if (r && (tip.contains(r) || (r.closest && r.closest('.djs-element') && r.closest('.djs-element') !== reg.getGraphics(e.element)))) return; hideTipSoon(); });
    el.dataset.ready = 'true';
  }
  const tech = document.querySelector('details.techov');
  if (tech) tech.addEventListener('toggle', () => { if (tech.open && viewers.v0) fit(viewers.v0, 'v0'); });
  Promise.all(Object.keys(DATA.views).map(render)).then(() => {
    document.body.dataset.ready = 'true';
    const m = location.hash.match(/^#a=([\d.]+)$/); if (m) open(m[1]);
    const mc = location.hash.match(/^#c=([\w-]+)$/); if (mc) open(mc[1]);
  });
})();
"""

# ------------------------------------------------------------------ the annotated process map (overview, plain language, not BPMN)
J_LABEL = {"pub": "Content publisher", "spec": "Immigration SME", "rel": "Second-person approver", "ai": "AI", "sys": "Platform",
           "cli": "Client and family", "agt": "Agent", "rep": "Lead representative", "gov": "Government"}
SIDE_SHORT = {"er": "Super Admin", "product": "", "firm": "Firm", "client": "Client portal", "outside": "Outside"}
SIDE = {k: (k, n, d) for k, n, d in D.SIDES}
J_BLOCKS = {"REUSE_EXAMPLE": D.REUSE_EXAMPLE, "REUSE_SCENARIOS": D.REUSE_SCENARIOS}
STAGE = {x["n"]: x for x in D.JOURNEY + D.JOURNEY_DOORS}
BAND_OF = {}
for _b in D.JOURNEY_BANDS:
    for _r in _b[5]:
        for _i in _r:
            if _i == "doors":
                for _d in D.JOURNEY_DOORS: BAND_OF[_d["n"]] = _b[0]
            elif _i in STAGE: BAND_OF[_i] = _b[0]

def j_rules(st):
    return [r for k, n, h, rules in D.RECORDS if k == "facts" for r in rules] if st["rules"] == "REUSE" else st["rules"]

def side_tag(k):
    t = SIDE_SHORT[D.ACTOR_ROLE[k][0]]
    return f" <span class='side' tabindex='0' data-tip='{E(D.ACTOR_ROLE[k][1])}'>{E(t)}</span>" if t else ""

def who_html(st):
    return ("<div class='msec'><p class='mlab'>Who acts</p><ol class='mwho'>" +
            "".join(f"<li style='--c:{ACTOR[k][3]}'><span><b>{E(J_LABEL[k])}</b>{side_tag(k)}<br>{E(v)}</span></li>" for k, v in st["who"]) + "</ol></div>")

def gates_html(st):
    return "".join(f"<div class='mgate'><p class='mlab q' data-tip='Decision mark: one of the outcomes below is taken'>Decision</p><p class='qq'>{E(q)}</p><ul>" +
                   "".join(f"<li><b>{E(o)}</b><span>→ {E(c)}</span></li>" for o, c in outs) + "</ul></div>" for q, outs in st["gates"])

def runs_html(st):
    k = {"Runs": "rep", "Side by side": "par", "Waits for": "wait", "Per filing": "each"}[st["runs"][0]] if st["runs"] else ""
    tip = {"rep": "Repeat mark: this stage runs several times", "par": "Side-by-side mark: these steps run at the same time", "wait": "Wait mark: the stage pauses until this arrives", "each": "Per-filing mark: each applicant's filing moves on its own"}.get(k, "")
    return f"<div class='msec'><p class='mlab mruns ic-{k}' data-tip='{tip}'>{E(st['runs'][0])}</p><p class='mrt'>{E(st['runs'][1])}</p></div>" if st["runs"] else ""

def m_node(st, door=False):
    sid = "st-" + st["n"]; kind = "Way in" if door else "Stage"
    call = "<div class='msec'><p class='mlab'>Good to know</p><ul class='mcall'>" + "".join(f"<li><span>{E(x)}</span></li>" for x in st["pointers"]) + "</ul></div>" if st["pointers"] else ""
    ex = (f"<button type='button' class='mbtn' data-card='{sid}' data-ex='1' aria-label='Example: {kind.lower()} {E(st['n'])}, {E(st['title'])}' data-tip='Open Client A&#39;s worked example for this stage'>Example</button>"
          if st["example"] else "")
    return (f"<article class='mnode{' door' if door else ''}' id='{sid}' aria-labelledby='{sid}-h'>"
            + (f"<header><span class='snum start' aria-hidden='true' data-tip='Start mark: where a case begins'></span><h4 id='{sid}-h'><span class='kick'>Start</span>{E(st['title'])}</h4>" if door else
               f"<header><span class='snum' aria-label='{kind} {E(st['n'])}'>{E(st['n'])}</span><h4 id='{sid}-h'>{E(st['title'])}</h4>") +
            f"<button type='button' class='eye seye det' data-card='{sid}' aria-label='Details: {'way in' if door else 'stage ' + st['n']}, {E(st['title'])}' "
            f"data-tip='Open the details: what this stage receives, does and hands over, its rules, exceptions and the detailed activities'>{EYE_SVG}</button></header>"
            f"{who_html(st)}{call}{runs_html(st)}{gates_html(st)}"
            + (f"<div class='mctl'>{ex}</div>" if ex else "") + "</article>")

EYE_SVG = ('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" stroke-width="1.5"/>'
           '<circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>')

def m_arrow(label, cls=""):
    lab = f"<span class='sr'>then, handing over: </span><span class='hl'>{E(label)}</span>" if label else "<span class='sr'>then</span>"
    return f"<div class='marr {cls}'>{lab}<span class='ln' aria-hidden='true'></span></div>"

def m_store():
    lk = next(l for l in D.JOURNEY_LINKS if l[0] == "setup")
    return (f"<div class='mstore' id='released-package'><div class='cyl' aria-hidden='true'></div><h4>{E(lk[2])}</h4>"
            f"<p>{E(lk[3])}</p></div>")

def m_end(text):
    return f"<div class='mend'><span class='ring' aria-hidden='true'></span><p><b>End.</b> {E(text)}</p></div>"

def map_html():
    out = ["<section class='blk' id='overview'><h2>End to end: the process at a glance</h2>"
           "<p class='cont'>A plain-language process map, not BPMN. Read each band left to right: setup happens once and is reused, every case reads the published setup, "
           "and a change is published and then adopted. Each stage shows who acts and with what authority, what to know, and the decision that ends it. "
           "The <b>eye</b> opens the full contract (receives, does, hands over, rules, exceptions); <b>Example</b> opens Client A's example; hover any mark or tag for its meaning. "
           "Stage numbers 1–12 belong to this map; the detailed BPMN views below are numbered 1–7 and their activities 1.1–10.4.</p>"]
    # the stage strip: every stage in one line, so no band looks as if it starts in the middle
    strip = []
    for key, badge, title, who, note, rows, rng in D.JOURNEY_BANDS:
        items = []
        for r in rows:
            for i in r:
                if i == "doors": items += [d["n"] for d in D.JOURNEY_DOORS]
                elif i in STAGE: items.append(i)
        doors = [n for n in items if not n.isdigit()]; nums = [n for n in items if n.isdigit()]
        starts = ("<div class='sgways'><span class='sgsub'>Two ways in</span>" + "".join(f"<a href='#st-{n}'><span class='snum start' aria-hidden='true'></span><span class='sgt'>{E(STAGE[n]['label'])}</span></a>" for n in doors) + "</div>") if doors else ""
        strip.append(f"<li class='sg sg-{key}'><span class='sgname'>{E(badge)}</span><span class='sgrange'>{E(rng)}</span>{starts}<ol>" +
                     "".join(f"<li><a href='#st-{n}'><span class='snum'>{E(n)}</span><span class='sgt'>{E(STAGE[n]['title'])}</span></a></li>" for n in nums) + "</ol></li>")
    out.append("<nav class='stagestrip' aria-label='All stages on this map'><ol>" + "".join(strip) + "</ol></nav>")
    for key, badge, title, who, note, rows, rng in D.JOURNEY_BANDS:
        if key == "change":
            out.append("<div class='mrail mrail-x' role='note'><i class='rv rv-dn' aria-hidden='true'></i><i class='rv rv-up' aria-hidden='true'></i>"
                       "<div class='rbox'><span class='rk'>Between the bands</span><span><b>Down, stage 7 → 10:</b> a firm's support ticket about a form or a mapping.</span>"
                       "<span><b>Up, stage 12 → 7:</b> after the agent adopts a new published version, only the affected forms are prepared again.</span></div></div>")
        out.append(f"<div class='band band-{key}'><div class='bhead'><span class='freq'>{E(badge)}</span><h3>{E(title)}</h3>"
                   f"<span class='brange'>{E(rng)}</span><span class='bwho'>{E(who)}</span><p>{E(note)}</p></div><div class='mgrid'>")
        for ri, row in enumerate(rows):
            if ri > 0:
                prev = STAGE[rows[ri - 1][-1]]
                out.append(f"<div class='mwrap' aria-hidden='true'><span class='hl'>{E(prev['handoff'])} (stage {E(prev['n'])} → stage {E(row[0])})</span><i class='ah'></i></div>")
                out.append(m_arrow(prev["handoff"], "phone-only"))
            cells = []
            for ci, item in enumerate(row):
                if item == "doors":
                    cells.append("<div class='mdoors' role='group' aria-label='Two ways in'><span class='dlab'>Two ways in</span>" +
                                 "".join(m_node(d, door=True) for d in D.JOURNEY_DOORS) + "</div>")
                elif item == "store": cells.append(m_store())
                elif item.startswith("end:"): cells.append(m_end(item[4:]))
                else: cells.append(m_node(STAGE[item]))
                if ci < len(row) - 1:
                    lab = "Resolved client" if item == "doors" else STAGE[item]["handoff"]
                    cells.append(m_arrow(lab))
            out.append("".join(cells))
        out.append("</div></div>")
        if key == "setup":
            lk = next(l for l in D.JOURNEY_LINKS if l[0] == "setup")
            out.append("<div class='mrail mrail-pkg' id='released-package' role='note'><i class='rv rv-in' aria-hidden='true'></i><i class='rv rv-out' aria-hidden='true'></i>"
                       f"<div class='rbox'><span class='cyl' aria-hidden='true' data-tip='Record mark: a shared, read-only store'></span><span class='rk'>{E(lk[2])}</span><span>{E(lk[3])}</span>"
                       "<span class='rread'>Read, not sent: each new case reads it when it opens (stage 4)</span></div></div>")
    out.append("</section>")
    return "".join(out)

def j_panel(st, door=False):
    sid = "st-" + st["n"]
    band = next(b for b in D.JOURNEY_BANDS if b[0] == BAND_OF[st["n"]])
    meta = f"{E(band[2])} · {E(band[6])}"
    io = ("" if door else
          f"<ol class='io'><li><span>Receives</span>{E(st['receives'])}</li><li><span>Does</span>{E(st['does'])}</li>"
          f"<li><span>Hands over</span>{E(st['produces'])}</li><li><span>To</span>{E(st['to'])}</li></ol>")
    lead = f"<p class='human'>{E(st['does'])}</p>" if door else ""
    ptr = "<ul class='ptr'>" + "".join(f"<li>{E(x)}</li>" for x in st["pointers"]) + "</ul>" if st["pointers"] else ""
    blocks = [J_BLOCKS.get(b, b) if isinstance(b, str) else b for b in st["example"]]
    ex = (f"<button type='button' class='ex-btn' aria-expanded='false' aria-controls='ex-{sid}'>Example · Client A</button>"
          f"<div class='example' id='ex-{sid}' hidden>{blocks_html(blocks)}</div>") if blocks else ""
    rules = j_rules(st)
    sec = ""
    if st["before"]: sec += f"<details><summary>Before it starts ({len(st['before'])})</summary><ul>{''.join(f'<li>{E(x)}</li>' for x in st['before'])}</ul></details>"
    if rules:
        open_ = " open" if st["rules"] == "REUSE" else ""
        sec += (f"<details{open_}><summary>Rules ({len(rules)})</summary><ul class='rules'>" +
                "".join(f"<li><span class='rtag {c}'>{lab}</span> {E(t)}</li>" for c, lab, t in (tagname(r) for r in rules)) + "</ul></details>")
    if st["exceptions"]: sec += f"<details><summary>Exceptions ({len(st['exceptions'])})</summary><ul>{''.join(f'<li>{E(x)}</li>' for x in st['exceptions'])}</ul></details>"
    acts = "".join(f"<li><button type='button' class='fl-link' data-act='{a}'>Activity {a} · {E(V.SHORT[a])}</button> <span class='sub'>· {E(J_LABEL[ACT[a]['lane']])} · view {view_of_act(a)['n']}</span></li>" for a in st["acts"])
    return (f"<div class='card scard' data-card='{sid}'><header class='ch'><div class='cid' style='--c:#374151'>{'Way in · start' if door else 'Stage ' + E(st['n'])}</div>"
            f"<h2 id='insp-h' tabindex='-1'>{E(st['title'])}</h2><div class='cmeta'>{meta}</div></header>"
            f"{who_html(st)}{io}{lead}{ptr}{runs_html(st)}{gates_html(st)}{ex}{sec}"
            f"<h3 class='inview'>In the detailed views</h3><p class='sub' style='font-size:13px;margin:0'>Each opens its full activity card here.</p><ul class='alist'>{acts}</ul></div>")

def whoiswho_html():
    groups = []
    for k, n, d in D.SIDES:
        members = [a for a in D.ACTORS if D.ACTOR_ROLE[a[0]][0] == k]
        unit = {"er": "roles", "product": "parts", "firm": "roles", "client": "role", "outside": "party"}[k]
        groups.append(f"<div class='wg wg-{k}'><h4>{E(n)} <span class='wn'>{len(members)} {unit if len(members) > 1 or unit in ('role', 'party') else unit.rstrip('s')}</span></h4><p class='wgd'>{E(d)}</p><ol>" +
                      "".join(f"<li style='--c:{a[3]}'><span><b>{E(a[1])}</b><br><span class='wr'>{E(D.ACTOR_ROLE[a[0]][1])}</span></span></li>" for a in members) + "</ol></div>")
    return ("<div class='box whois' id='who'><div class='whead'><h3>Who is who</h3><span class='sub'>Which side of the product each actor works on, and their product role</span>"
            f"<button type='button' class='eye det-actors' data-card='actors' aria-label='Details: what each actor may and may never do' data-tip='Open the details: what each actor may and may never do'>{EYE_SVG}</button></div><div class='wgrid'>" + "".join(groups) + "</div></div>")

def actors_card():
    rows = "".join(f"<tr><th style='border-left:5px solid {a[3]}'>{E(a[1])}</th><td>{E(SIDE[D.ACTOR_ROLE[a[0]][0]][1])}<br><span class='sub'>{E(D.ACTOR_ROLE[a[0]][1])}</span></td>"
                   f"<td>{E(D.ACTOR_ROLE[a[0]][2])}</td><td>{E(D.ACTOR_ROLE[a[0]][3])}</td></tr>" for a in D.ACTORS)
    return ("<div class='card'><h2 id='insp-h' tabindex='-1'>Who is who</h2><p class='sub' style='font-size:13px'>Role names follow the team's design: six Expat Ready staff roles in the Super Admin console; "
            "firm roles Case Manager and Case Officer; representative types RCIC, lawyer or notary, paralegal. The Immigration SME is not one of today's staff roles: it is proposed.</p>"
            "<div class='tw'><table><thead><tr><th>Actor</th><th>Side · product role</th><th>Does</th><th>Never does</th></tr></thead><tbody>" + rows + "</tbody></table></div></div>")

def terms_html():
    return ("<div class='box terms'><h3>Terms used on this page</h3><dl>" + "".join(f"<div><dt>{E(t)}</dt><dd>{E(d)}</dd></div>" for t, d in D.TERMS) + "</dl></div>")

def view_notes_html(view):
    acts = [act_of(n[0]) for n in view["nodes"] if act_of(n[0])]
    items = []
    for a in acts:
        act = ACT[a]; actor = ACTOR[act["lane"]]
        items.append(f"<li style='--c:{actor[3]}'><span class='vn-id'>{a}</span><span class='vn-b'><button type='button' class='fl-link' data-act='{a}'>{E(act['title'])}</button>"
                     f"<span class='vn-who'>{E(J_LABEL[act['lane']])}{side_tag(act['lane'])}</span><span class='vn-do'>{E(act['io'][1])}</span>"
                     + (f"<span class='vn-mi'>Runs {E(act['mi'])}</span>" if act['mi'] else "") + "</span></li>")
    return (f"<div class='vnotes'><h3>What happens in this view <span class='sub'>({len(acts)} activities · each opens its card)</span></h3><ol>" + "".join(items) + "</ol></div>")

def symbols_html(h2=False):
    head = "<h2 id='insp-h' tabindex='-1'>Diagram symbols (BPMN 2.0)</h2>" if h2 else ""
    return (f"{head}<div class='key'>" + "".join(f"<span><svg viewBox='0 0 36 28' aria-hidden='true'>{s_}</svg>{E(k)}</span>" for k, s_ in KEY_SVG.items()) +
            "</div><div class='lanes'>" + "".join(f"<span><i class='dot' style='background:{c}'></i><b>{E(n)}</b> <span class='sub'>{E(s_)}</span></span>" for k, n, s_, c in D.ACTORS) +
            "</div><p class='sub' style='font-size:13px;margin-top:6px'>A pool is one process (one run per combination, case or form). Sequence lines stay inside a pool; dashed message lines cross between pools; dotted lines read or write a shared record. "
            "Every activity has an eye button: click it, or the shape, for its full card. Diagrams are drawn at full size; on a narrow screen each view reads as a list. "
            "The form pool is marked ||| because it runs once per form, side by side; 'every form of a filing approved' in view 6 stands for the current approvals of all that filing's required forms; a withdrawn or superseded approval does not count.</p>")

def build():
    xmls, geos = {}, {}
    for view in [V.OVERVIEW] + V.VIEWS:
        xmls[view["id"]], geos[view["id"]] = bpmn_xml(view)
    acts_json = {}
    for a, act in ACT.items():
        nid = "A_" + a.replace(".", "_")
        acts_json[a] = dict(title=act["title"], input=act["io"][0], output=act["io"][2], node=nid, kind=act["kind"], mi=act["mi"],
                            color=ACTOR[act["lane"]][3], view=f"View {view_of_act(a)['n']}: {view_of_act(a)['title']}", vid=view_of_act(a)['id'])
    views_json = {}
    for view in [V.OVERVIEW] + V.VIEWS:
        g = geos[view["id"]]
        acts = [act_of(n[0]) for n in view["nodes"] if act_of(n[0])]
        links = {n[0]: n[6]["view"] for n in view["nodes"] if n[6].get("view")}
        lanes = [dict(id=f"L_{view['id']}_{pool}_{actor}", name=J_LABEL[actor], side=lane_side(actor), color=ACTOR[actor][3],
                      tip=f"{D.ACTOR_ROLE[actor][1]}. Does: {D.ACTOR_ROLE[actor][2]}.")
                 for pool, ll in view["pools"] for actor, _ in ll if actor]
        pools = [dict(id=f"P_{view['id']}_{pool}", name=D.POOLS[pool]["name"] + (" · runs once per form, side by side" if D.POOLS[pool].get("multi") else "")) for pool, _ in view["pools"]]
        views_json[view["id"]] = dict(xml=xmls[view["id"]], w=g["W"], h=g["H"], acts=acts, lanes=lanes, pools=pools,
                                      nodeAct={"A_" + a.replace(".", "_"): a for a in acts}, links=links)
    cards_json = {"st-" + st["n"]: dict(label=("Way in · " + st["label"] if st in D.JOURNEY_DOORS else "Stage " + st["n"]) + " · process map") for st in D.JOURNEY + D.JOURNEY_DOORS}
    cards_json["symbols"] = dict(label="Diagram symbols")
    cards_json["actors"] = dict(label="Who is who")
    data = json.dumps(dict(views=views_json, acts=acts_json, cards=cards_json)).replace("</", "<\\/")

    P = []; A = P.append
    A(f"<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
      f"<title>Solution 1 one-pager</title><style>{css()}</style></head><body><main>")
    A(f"<h1>{E(D.TITLE)}</h1><p class='sub'>{E(D.SUBTITLE)} · {E(D.VERSION)}</p>")
    nav = "<nav class='nav' aria-label='Sections'><a href='#overview'>Overview</a>"
    for pk, pname, psub, vids in D.PHASES:
        nav += f"<a class='ph' href='#view-{vids[0]}'>{E(pname)}</a>" + "".join(f"<a href='#view-{v}'>{VIEW[v]['n']} {E(VIEW[v]['title'])}</a>" for v in vids)
    nav += "<a href='#controls'>Controls</a><a href='#records'>Records</a><a href='#cases'>Case types</a><a href='#evidence'>Evidence</a>"
    opts = "<option value=''>Jump to…</option><option value='overview'>Overview</option><option value='overview-bpmn'>Overview in BPMN</option>"
    for pk, pname, psub, vids in D.PHASES:
        opts += f"<optgroup label='{E(pname)}'>" + "".join(f"<option value='view-{v}'>{VIEW[v]['n']} {E(VIEW[v]['title'])}</option>" for v in vids) + "</optgroup>"
    opts += "".join(f"<option value='{k}'>{t}</option>" for k, t in (("controls", "Controls"), ("records", "Records"), ("cases", "Case types"), ("evidence", "Evidence")))
    nav += f"<label class='jump'><span class='sr'>Jump to a section</span><select aria-label='Jump to a section'>{opts}</select></label></nav>"
    A(nav)
    A(f"<p><b>The problem.</b> {E(D.PROBLEM)}</p>")
    A(f"<div class='answer'><strong>The answer.</strong> {E(D.ANSWER)}</div>")
    A("<div class='box' style='margin-top:10px'><h3>One made-up family in every example</h3><p style='margin:0 0 4px'>" + E(D.FAMILY["case"]) +
      "</p><div class='family'>" + "".join(f"<span><b>{E(k)}:</b> {E(v)}</span>" for k, v in D.FAMILY["values"]) + "</div></div>")
    A("<div class='grid two'>" + terms_html() + "</div>")
    A(whoiswho_html())
    A(map_html())

    # the same journey in BPMN, for the delivery team: closed by default, so two large overviews never compete
    A("<section class='blk' id='overview-bpmn'><details class='techov'><summary><span class='th'>Technical view: the end-to-end BPMN overview</span>"
      "<span class='sub'> For the delivery team: four pools, one collapsed sub-process per detailed view, and who does what by view. Open</span></summary>"
      "<p class='cont'>The same process in BPMN 2.0. Expat Ready sets up and changes combinations; each firm runs a case per prospect or existing client and a process per form; the government sits outside. "
      "Click a phase box to jump to its view.</p>"
      "<details class='symbols'><summary>Diagram symbols</summary>" + symbols_html() + "</details>")
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
    A("</tbody></table></div></details></section>")

    for pk, pname, psub, vids in D.PHASES:
        for vid in vids:
            v = VIEW[vid]
            A(f"<section class='view ph-{pk}' id='view-{vid}'><div class='vhead'><span class='pl'>{E(pname)}</span><span class='psub'>{E(psub)}</span><h2>View {v['n']} · {E(v['title'])}</h2>"
              f"<span class='vstages'>Map stages {E(v['stages'])}</span></div>"
              f"<p style='margin:0'>{E(v['sub'])}</p><p class='cont'><b>Starts:</b> {E(v['starts'])} · <b>Ends:</b> {E(v['ends'])}</p>")
            A(diagram_block(v, list_html(v)))
            A(view_notes_html(v))
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
    for st in D.JOURNEY: A(f"<template id='tpl-st-{st['n']}'>{j_panel(st)}</template>")
    for st in D.JOURNEY_DOORS: A(f"<template id='tpl-st-{st['n']}'>{j_panel(st, door=True)}</template>")
    A(f"<template id='tpl-actors'>{actors_card()}</template>")
    A(f"<template id='tpl-symbols'><div class='card'>{symbols_html(h2=True)}</div></template>")
    A(f"<script type='application/json' id='dg-data'>{data}</script>")
    A("<script>" + open(VIEWER_JS).read() + "</script>")
    A(f"<script>{js()}</script></body></html>")
    out = "".join(P)
    with open(OUT, "w") as f: f.write(out)
    return out, geos

def lane_side(k):
    sd = D.ACTOR_ROLE[k][0]
    return {"er": "Super Admin", "firm": "Firm", "client": "Client portal", "outside": "Outside"}.get(sd, "Code and rules" if k == "sys" else "AI steps")

def diagram_block(view, listing):
    vid = view["id"]
    return (f"<div class='tools' role='group' aria-label='Show view as'><button type='button' data-mode='dg' aria-pressed='true'>Diagram</button>"
            f"<button type='button' data-mode='list' aria-pressed='false'>List</button>"
            f"<button type='button' class='symb' data-card='symbols'>Diagram symbols</button></div>"
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
    # 4b. the process map and the detailed views describe the same work
    jacts = [a for st in D.JOURNEY + D.JOURNEY_DOORS for a in st["acts"]]
    for a in jacts:
        if a not in ACT: ERR.append(f"journey names unknown activity {a}")
    for a in ACT:
        if a not in jacts: ERR.append(f"activity {a} belongs to no journey stage")
    for st in D.JOURNEY:
        for k in ("receives", "does", "produces", "to"):
            if not st.get(k, "").strip(): ERR.append(f"stage {st['n']}: empty {k}")
        if st["does"].count(". ") > 0: ERR.append(f"stage {st['n']}: 'does' is more than one sentence")
        if len(st["pointers"]) > 2: ERR.append(f"stage {st['n']}: more than two pointers on the card")
    for st in D.JOURNEY + D.JOURNEY_DOORS:
        for k in st["actors"]:
            if k not in ACTOR: ERR.append(f"stage {st['n']}: unknown actor {k}")
        if not st["who"] or any(k not in ACTOR or not v.strip() for k, v in st["who"]): ERR.append(f"stage {st['n']}: who-line missing an actor or what they do")
        if {k for k, _ in st["who"]} != set(st["actors"]): ERR.append(f"stage {st['n']}: who-lines and actors disagree")
        for q, outs in st["gates"]:
            if not q.endswith("?") or len(outs) < 2 or any(not o or not c for o, c in outs): ERR.append(f"stage {st['n']}: decision '{q}' needs a question and labelled outcomes")
        if st["runs"] and st["runs"][0] not in ("Runs", "Side by side", "Waits for", "Per filing"): ERR.append(f"stage {st['n']}: unknown runs label {st['runs'][0]}")
    for k in ACTOR:
        if k not in D.ACTOR_ROLE: ERR.append(f"actor {k} has no side and product role")
    placed = [i for b in D.JOURNEY_BANDS for r in b[5] for i in r if i not in ("doors", "store") and not i.startswith("end:")]
    if placed != [st["n"] for st in D.JOURNEY]: ERR.append(f"map bands place stages out of order: {placed}")
    for b in D.JOURNEY_BANDS:
        for r in b[5]:
            for i in r[:-1]:
                if i not in ("doors", "store") and not STAGE[i]["handoff"]: ERR.append(f"stage {i}: arrow has no handoff label")
    if "How to read the diagrams" in out.split("id='overview-bpmn'")[0]: ERR.append("BPMN legend appears before the process map")
    pre = out.split("id='overview-bpmn'")[0]
    mp = pre.split("id='overview'")[1]
    if re.sub(r"<button type='button' class='eye[^>]*>.*?</button>", "", mp, flags=re.S).count("<svg"): ERR.append("an SVG other than the eye button appears in the process map")
    for m in re.finditer(r"<button type='button' class='eye[^>]*>", pre):
        if "data-tip=" not in m.group(0) or "aria-label=" not in m.group(0): ERR.append("an eye button without its tooltip or accessible name")
    for v in V.VIEWS:
        if not v.get("stages"): ERR.append(f"{v['id']}: no map stages named")
    for vid, notes in V.NOTES.items():
        nodes_ = {n[0] for n in VIEW[vid]["nodes"]}
        for tgt, text, *_ in notes:
            if tgt not in nodes_: ERR.append(f"{vid}: note on missing element {tgt}")
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
