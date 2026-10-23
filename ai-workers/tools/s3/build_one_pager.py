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
import s3_panels as PN

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
    k = {"R|": "req", "F|": "dec", "G|": "gap"}.get(rule[:2], "prop")
    return k, D.TAG_MEANING[k][0], (rule[2:] if k != "prop" else rule)

def rtag(c):
    lab, why = D.TAG_MEANING[c]
    return f"<span class='rtag {c}' tabindex='0' data-tip='{E(lab)}: {E(why)}'>{E(lab)}</span>"

def tag_key():
    return "<div class='tagkey'><span class='sub'>Where each rule comes from:</span>" + "".join(f"<span>{rtag(c)} <span class='sub'>{E(D.TAG_MEANING[c][1])}</span></span>" for c in ("req", "dec", "prop", "gap")) + "</div>"

SCREEN_KIND = {"team": "in the team's design", "proposed": "proposed", "none": "no screen", "outside": "outside the product"}
KIND_LABEL = {"user": "Person step", "service": "Automatic step", "manual": "By hand, outside the product's filling", "call": "Re-runs setup on the changed items"}

def view_of_act(a): return VIEW[ACT[a]["view"]]

def example_html(a):
    act = ACT[a]
    return blocks_html(act["example"]) if act["example"] else ""

def blocks_html(blocks):
    out = []
    for blk in blocks:
        k = blk[0]
        if k == "table" and len(blk[2]) >= 5:
            # a wide table becomes a two-column comparison (key and outcome side by side); each row's other columns
            # are shown as labelled lines directly under it: nothing hidden, no disclosure inside the example
            _, cap, head, rows = blk
            out.append(f"<figure class='ex-cmp'><figcaption>{E(cap)}</figcaption><div class='tw'><table><thead><tr><th>{E(head[0])}</th><th>{E(head[2])}</th></tr></thead><tbody>" +
                       "".join(f"<tr class='k'><th scope='row'>{E(r[0])}</th><td>{E(r[2])}</td></tr><tr class='x'><td colspan='2'>" +
                               "".join(f"<span><b>{E(h)}:</b> {E(c)}</span>" for i, (h, c) in enumerate(zip(head, r)) if i not in (0, 2)) + "</td></tr>" for r in rows) +
                       "</tbody></table></div></figure>")
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

# ------------------------------------------------------------------ the detail panels (activity, stage, reference)
# Reading order for an activity: what it achieves, who acts, before it starts, how it works, result and what happens
# next. Below that, only the supporting sections that apply: rules and exceptions, example, acceptance checks,
# sources and detail. Supporting sections sit side by side at one level; none is nested in another.
def words(t):
    stop = {"that", "this", "with", "from", "each", "every", "into", "only", "when", "then", "than", "their", "there", "they", "were", "which", "what", "have", "does", "will", "also", "after", "before", "until", "once", "same", "other", "never", "still"}
    return {w[:6] for w in re.findall(r"[a-z][a-z']{3,}", t.lower()) if w not in stop}   # first six letters: 'submits' and 'submit' match

def covered(text, by, share=0.8):
    w = words(text)
    return not w or len(w & words(by)) / len(w) >= share

def dup(a, b):
    wa, wb = words(a), words(b)
    return bool(wa) and len(wa & wb) / len(wa) >= 0.75

def act_gaps(a):
    act = ACT[a]
    own = [r[2:] for r in act["rules"] if r.startswith("G|")]
    refs = [(g, ref) for g, ref, acts in D.BUILD_GAPS if a in [x.strip() for x in acts.split("·")]]
    return own, refs

def sec(title, body, cls=""):
    return f"<section class='psec {cls}'><h3>{title}</h3>{body}</section>"

def actor_line(k, text=None, name=None):
    side = SIDE_SHORT[D.ACTOR_ROLE[k][0]]
    return (f"<span class='lchip' style='--c:{ACTOR[k][3]}'>{E(name or J_LABEL[k])}</span>"
            + (f" <span class='side' tabindex='0' data-tip='{E(D.ACTOR_ROLE[k][1])}'>{E(side)}</span>" if side else "")
            + (f" {text}" if text else ""))

def act_parts(a):
    """The visible first view of an activity, as (html, plain text) per part, so the build can check what is shown."""
    act = ACT[a]; io = act["io"]; lane = act["lane"]
    who = []
    if a in PN.ROLES:
        who.append("<table class='roles'><tbody>" + "".join(f"<tr><th>{actor_line(k, name=n)}</th><td>{E(t)}</td></tr>" for k, n, t in PN.ROLES[a]) + "</tbody></table>")
    else:
        who.append(f"<p>{actor_line(lane, name=ACTOR[lane][1])}<br><span class='sub'>{E(PN.PERFORMER[a] if a in PN.PERFORMER else ACTOR[lane][2])}</span></p>")
    who.append(f"<p class='auth'><b>Authority.</b> {E(act['authority'])}</p>")
    if a in PN.CHECKED_BY: who.append(f"<p class='chk'><b>Checked by.</b> {E(PN.CHECKED_BY[a])}</p>")
    before = (f"<dl class='kv'><dt>Starts when</dt><dd>{E(act['trigger'])}</dd><dt>Needs</dt><dd>{E(act['prereq'])}</dd>"
              f"<dt>Works on</dt><dd>{E(io[0])}</dd></dl>")
    # the person's line and the one-line action are shown only when the steps do not already say the same thing
    base = " ".join(act["actions"]) + " " + PN.PURPOSE[a] + " " + PN.PERFORMER.get(a, "") + " " + " ".join(t for _, _, t in PN.ROLES.get(a, []))
    lead = [x for x in (act["human"], io[1]) if x and not covered(x, base)]
    if len(lead) == 2 and covered(lead[1], lead[0] + " " + base): lead = lead[:1]
    how = ((f"<p class='lead'>{E(lead[0])}" + (f" <span class='sub'>In one line: {E(lead[1])}.</span>" if len(lead) > 1 else "") + "</p>") if lead else "") + \
          "<ol class='steps'>" + "".join(f"<li>{E(x)}</li>" for x in act["actions"]) + "</ol>"
    own, refs = act_gaps(a)
    gap = ("<div class='gapnote'><b>Not built yet in today's code.</b><ul>" + "".join(f"<li>{E(t)}</li>" for t in (own or [g for g, _ in refs])) +
           "</ul><span class='sub'>Code references: Sources and detail, below.</span></div>") if (own or refs) else ""
    nxt = PN.NEXT.get(a, io[3])
    result = (f"<dl class='kv'><dt>Produces</dt><dd>{E(io[2])}</dd><dt>Next</dt><dd>{E(nxt)}<span class='then'>Then: {E(act['receiving'])}</span></dd>"
              f"<dt>Done when</dt><dd>{E(act['ready'])}</dd><dt class='hold'>If not</dt><dd class='hold'>{E(act['ret'])}</dd></dl>")
    return [("What this achieves", f"<p class='purpose'>{E(PN.PURPOSE[a])}</p>"), ("Who acts", "".join(who)), ("Before it starts", before),
            ("How it works", how + gap), ("Result and what happens next", result)]

def card_html(a):
    act = ACT[a]; actor = ACTOR[act["lane"]]; v = view_of_act(a)
    where = (E(PN.RESULT_AT[a]) if a in PN.RESULT_AT else
             f"<b>Screen:</b> {E(act['screen'])} <span class='stag'>{SCREEN_KIND[act['screen_kind']]}</span>")
    meta = (f"{KIND_LABEL[act['kind']]} <span class='sep'>·</span> View {v['n']}: {E(v['title'])}"
            + (f" <span class='sep'>·</span> <b>Runs</b> {E(act['mi'])}" if act["mi"] else "") + f"<br>{where}")
    first = "".join(sec(t, h) for t, h in act_parts(a))
    # supporting sections: only those that apply, all at one level
    own, refs = act_gaps(a)
    rules = [r for r in act["rules"] if not r.startswith("G|")]
    exc = [x for x in act["exceptions"] if not dup(x, act["ret"])]
    sup = []
    if rules or exc:
        sup.append(f"<details class='sup'><summary>Rules and exceptions ({len(rules) + len(exc)})</summary>"
                   + (f"<ul class='rules'>{''.join(f'<li>{rtag(c)} {E(t)}</li>' for c, lab, t in (tagname(r) for r in rules))}</ul>" if rules else "")
                   + ("<p class='slab'>Exceptions</p><ul>" + "".join(f"<li>{E(x)}</li>" for x in exc) + "</ul>" if exc else "") + "</details>")
    if act["example"]:
        sup.append(f"<button type='button' class='ex-btn' aria-expanded='false' aria-controls='ex-{a.replace('.', '-')}'>Example · Client A</button>"
                   f"<div class='example' id='ex-{a.replace('.', '-')}' hidden>{example_html(a)}</div>")
    elif a in PN.EXAMPLE_LINKS:
        sup.append("<div class='exlinks'><p class='slab'>Examples (this step reuses the setup steps)</p><ul>" +
                   "".join(f"<li><button type='button' class='fl-link' data-act='{t}'>Example in {t} · {E(V.SHORT[t])}</button> <span class='sub'>{E(why)}</span></li>" for t, why in PN.EXAMPLE_LINKS[a]) + "</ul></div>")
    sup.append(f"<details class='sup'><summary>Acceptance checks ({len(act['accept'])})</summary><ul class='acc'>" +
               "".join(f"<li><b>{'Normal case' if i == 0 else 'Alternate case'}.</b> {E(x)}</li>" for i, x in enumerate(act["accept"])) + "</ul></details>")
    reads = ", ".join(D.RECORD_NAME[r] for r in act["reads"]) or "none"
    upd = ", ".join(D.RECORD_NAME[r] for r in act["updates"]) or "none"
    src = [f"<tr><th>Record handed over</th><td>{E(act['transfer'])}</td></tr>", f"<tr><th>Records read · updated</th><td>Reads {E(reads)} · updates {E(upd)}</td></tr>"]
    if a in PN.RESULT_AT: src.append(f"<tr><th>Screen</th><td>None: it runs in the background</td></tr>")
    src += [f"<tr><th>{E(w)}</th><td>{E(i)}</td></tr>" for w, i in act["traces"]]
    src += [f"<tr><th>Build gap</th><td>{E(g)} <span class='sub'>({E(ref)})</span></td></tr>" for g, ref in refs]
    sup.append("<details class='sup'><summary>Sources and detail</summary><div class='tw'><table class='src'><tbody>" + "".join(src) + "</tbody></table></div></details>")
    return (f"<div class='card' data-act='{a}'>"
            f"<header class='ch'><div class='cid' style='--c:{actor[3]}'>Activity {a}</div><h2 id='insp-h' tabindex='-1'>{E(act['title'])}</h2><div class='cmeta'>{meta}</div></header>"
            f"{first}<div class='supw'>{''.join(sup)}</div></div>")


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
:root{--bg:#f7f8f6;--panel:#fff;--ink:#25313b;--muted:#52606d;--line:#d9dee3;--accent:#2b5c8f;--soft:#edf2f7;--rule:#f1f3f4;--warn:#8a4b0f;--ok:#2f6b45;--pw:460px;
""" + av + """}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#131619;--panel:#1b1f23;--ink:#e6e9ec;--muted:#a3adb7;--line:#343b42;--soft:#1e2833;--rule:#21262b;--warn:#e7b469;--ok:#86c49b;--accent:#8fb4dc;}}
:root[data-theme="dark"]{--bg:#131619;--panel:#1b1f23;--ink:#e6e9ec;--muted:#a3adb7;--line:#343b42;--soft:#1e2833;--rule:#21262b;--warn:#e7b469;--ok:#86c49b;--accent:#8fb4dc;}
@media (min-width:1760px){:root{--pw:540px}}
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
.eye{all:unset;box-sizing:border-box;flex:none;width:26px;height:26px;border-radius:50%;background:#fff;color:var(--c,#1b1b1a);border:2px solid var(--c,#1b1b1a);display:grid;place-items:center;cursor:pointer;box-shadow:0 1px 1px rgba(0,0,0,.12);transition:transform .12s}
.eye svg{width:15px;height:15px}
.eye:hover{transform:scale(1.08)}
.eye:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.eye.on{background:var(--c,#1b1b1a);color:#fff}
.dg .eye{width:21px;height:21px;border-width:1.5px;box-shadow:none}
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
.tw.scrolls::before{content:"Swipe or scroll sideways for more columns →";display:block;position:sticky;left:0;font-size:11.5px;font-weight:600;color:var(--muted);margin:0 0 4px}
.strip{display:grid;grid-template-columns:170px 1fr;gap:0;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)}
.strip>div{padding:7px 10px;border-bottom:1px solid var(--line);font-size:14px}
.strip>div:nth-child(odd){background:var(--rule);font-weight:600}
.strip>div:nth-last-child(-n+2){border-bottom:0}
.seq{display:flex;flex-wrap:wrap;gap:4px;align-items:center;font-size:13.5px;margin:4px 0}
.seq span{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:3px 8px}
.seq i{color:var(--muted);font-style:normal}
/* phase and band colours: one hue per band, used for its label, numbers and edge; meaning always carried by words too */
:root{--b-setup:#3b5673;--b-case:#3f6b59;--b-change:#876343;--t-setup:#eff3f7;--t-case:#f0f5f1;--t-change:#f7f2eb;--note:#f5f6f4}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--b-setup:#9db4cf;--b-case:#9cc5ad;--b-change:#d6b08a;--t-setup:#1c242e;--t-case:#1b2620;--t-change:#29231c;--note:#1f2327}}
:root[data-theme="dark"]{--b-setup:#9db4cf;--b-case:#9cc5ad;--b-change:#d6b08a;--t-setup:#1c242e;--t-case:#1b2620;--t-change:#29231c;--note:#1f2327}
.two{grid-template-columns:1fr}
.terms h3,.whois h3{margin:0}
.terms dl{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:6px 24px;margin:8px 0 0}
.terms dl div{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:8px;font-size:13.5px;line-height:1.4;align-items:baseline}
.terms dt{font-weight:700}
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
.mwho li,.mcall li,.wg li{display:grid;grid-template-columns:18px minmax(0,1fr);column-gap:5px;margin:0;font-size:13.5px;line-height:1.38}
.mwho li,.wg li{counter-increment:w}
.mwho li::before,.wg li::before{content:counter(w) ".";font-weight:800;color:var(--muted);text-align:right;font-variant-numeric:tabular-nums}
.mcall li::before{content:"";justify-self:end;width:5px;height:5px;margin-top:.55em;border-radius:50%;background:var(--b-setup);opacity:.7}
.band-case .mcall li::before{background:var(--b-case)}.band-change .mcall li::before{background:var(--b-change)}
.mwho b,.wg li b{color:var(--c);font-weight:800}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .mwho b,:root:not([data-theme="light"]) .wg li b{color:color-mix(in srgb,var(--c) 45%,#fff)}}
:root[data-theme="dark"] .mwho b,:root[data-theme="dark"] .wg li b{color:color-mix(in srgb,var(--c) 45%,#fff)}
.mwho li:only-child::before{visibility:hidden}
.wn1{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;column-gap:6px}
.wn1 .side{margin-left:auto}
.akey{display:flex;flex-wrap:wrap;align-items:center;gap:4px 16px;margin:2px 0 8px;font-size:12.5px;color:var(--muted)}
.akl{font-weight:600}
.ak{display:inline-flex;align-items:center;gap:6px;color:var(--ink)}
.ak i{display:inline-block;width:3px;height:14px;border-radius:2px;background:var(--c)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .ak i{background:color-mix(in srgb,var(--c) 55%,#fff)}}
:root[data-theme="dark"] .ak i{background:color-mix(in srgb,var(--c) 55%,#fff)}
.side{margin-left:3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);white-space:nowrap;cursor:help}
.wr{color:var(--muted);font-size:12px}
.wn{display:inline-block;font-size:11px;font-weight:700;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:0 7px;margin-left:4px;vertical-align:1px;background:var(--panel)}
.mrt{margin:0 0 0 23px;font-size:13px;line-height:1.38}
.mgate .qq{margin:0 0 3px 23px;font-weight:700;font-size:13.5px;line-height:1.32}
.mgate ul{list-style:none;margin:0 0 0 23px;padding:0;display:grid;grid-template-columns:fit-content(48%) minmax(0,1fr);column-gap:6px;row-gap:3px;font-size:13px;line-height:1.36}
.mgate li{display:contents}
.mgate ul{display:block}.mgate li{display:block;margin:0 0 3px;padding-left:10px;text-indent:-10px}.mgate li span{margin-left:4px}
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
.band{border:1px solid var(--line);border-radius:10px;padding:12px 14px 14px;margin:12px 0 0;background:var(--panel);border-top:3px solid var(--b-setup)}
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
.mgrid{display:grid;grid-template-columns:var(--cols,minmax(0,1fr) 88px minmax(0,1fr) 88px minmax(0,1fr) 88px minmax(0,1fr));align-items:start;row-gap:0}
.mnode{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px 12px 11px;font-size:13.5px;display:flex;flex-direction:column;gap:8px;position:relative}
.band-setup .mnode{background:var(--t-setup)}.band-case .mnode{background:var(--t-case)}.band-change .mnode{background:var(--t-change)}
.mnode.sel{outline:2px solid var(--ink);outline-offset:2px}
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
.mgate{border-left:2px solid var(--b-setup);background:var(--panel);border-radius:0 6px 6px 0;padding:6px 9px;font-size:13px;line-height:1.36}
.mgate .q{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='black' stroke-width='1.5'%3E%3Cpath d='M8 1.5 14.5 8 8 14.5 1.5 8z'/%3E%3Cpath d='M6.6 6.4a1.5 1.5 0 1 1 2 1.4c-.4.2-.6.5-.6.9v.4M8 10.8v.2'/%3E%3C/svg%3E")}
.mgate .q::before{background:var(--ink)}
.band-case .mgate{border-left-color:var(--b-case)}.band-change .mgate{border-left-color:var(--b-change)}
.sg{border-top:2px solid var(--b-setup)}.sg-case{border-top-color:var(--b-case)}.sg-change{border-top-color:var(--b-change)}
/* rails between the bands: one shared record, or the two things the bands exchange; short parallel arrows mark the handoffs */
.mrail{position:relative;padding:26px 0;margin:0}
.mrail .rbox{position:relative;z-index:1;display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;border:2px dashed var(--b-setup);border-radius:12px;background:var(--panel);padding:8px 14px;font-size:13px;line-height:1.35}
.mrail .rk{font-weight:800;font-size:14px}
.mrail .rread{flex-basis:100%;font-weight:700;color:var(--b-setup);font-size:12.5px}
.mrail .cyl{width:26px;height:22px;border-radius:50% / 6px}.mrail .cyl::before{height:9px}
.mrail-x .rbox{border:1px solid var(--line);border-left:4px solid var(--b-change);border-radius:0 10px 10px 0;background:var(--t-change);flex-direction:column;align-items:flex-start;gap:2px}
.rv{position:absolute;width:2px;background:var(--muted)}
.rv::after{content:"";position:absolute;left:-5px;border-left:6px solid transparent;border-right:6px solid transparent}
.rv-in{top:0;height:26px;right:var(--xin);background:var(--b-setup)}.rv-in::after{bottom:-2px;border-top:9px solid var(--b-setup)}
.rv-out{bottom:0;height:26px;left:var(--xout);background:var(--b-setup)}.rv-out::after{bottom:-2px;border-top:9px solid var(--b-setup)}
.rv-dn{top:0;bottom:0;left:calc(var(--x7) - 10px)}.rv-dn::after{bottom:-2px;border-top:9px solid var(--muted)}
.rv-up{top:0;bottom:0;left:calc(var(--x7) + 10px)}.rv-up::after{top:-2px;border-bottom:9px solid var(--muted)}
.mctl{display:flex;gap:6px;margin-top:auto;padding-top:2px}
.mbtn{font:inherit;font-size:12.5px;font-weight:700;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:999px;padding:3px 12px;cursor:pointer}
.mbtn:hover{border-color:var(--ink)}
.mbtn:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.mbtn.on{background:var(--ink);color:var(--panel);border-color:var(--ink)}
.marr{align-self:start;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;text-align:center;font-size:11.5px;overflow-wrap:normal;hyphens:none;word-break:normal;font-weight:600;color:var(--muted);padding:23px 5px 0}
.marr .hl{line-height:1.2}
.marr .ln{order:-1;display:block;position:relative;width:100%;height:2px;background:var(--muted);margin:0 0 5px}
.marr .ln::after{content:"";position:absolute;right:-2px;top:-5px;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:9px solid var(--muted)}
.marr.phone-only{display:none}
.marr .hs{display:none}
.mdoors{display:flex;flex-direction:column;gap:8px;min-width:0}
.mdoors .dlab{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--b-case)}
.mdoors + .marr{padding-top:19px}
.mwrap{grid-column:1 / -1;position:relative;height:46px;margin:2px 0}
.mwrap::before{content:"";position:absolute;top:0;height:23px;left:var(--wl);right:var(--wr);border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);border-bottom-right-radius:10px}
.mwrap::after{content:"";position:absolute;top:21px;bottom:6px;left:calc(var(--wl) - 1px);border-left:2px solid var(--muted);border-top-left-radius:10px}
.mwrap .hl{position:absolute;top:13px;left:50%;transform:translateX(-50%);background:var(--panel);padding:0 8px;font-size:11.5px;font-weight:600;color:var(--muted);white-space:nowrap}
.mwrap .ah,.mread .ah{position:absolute;bottom:0;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid var(--muted)}
.mwrap .ah{left:calc(var(--wl) - 5px)}
.mstore{align-self:center;min-height:260px;display:flex;flex-direction:column;align-items:center;text-align:center;justify-content:center;gap:4px;padding:8px 10px;border:2px dashed var(--b-setup);border-radius:12px;background:var(--panel)}
.mstore h4{margin:0;font-size:15px;font-weight:800}
.mstore p{margin:0;font-size:12.5px;line-height:1.35;color:var(--muted)}
.cyl{width:44px;height:38px;position:relative;border:2px solid var(--b-setup);border-radius:50% / 9px;background:var(--t-setup)}
.cyl::before{content:"";position:absolute;left:-2px;right:-2px;top:-2px;height:14px;border:2px solid var(--b-setup);border-radius:50%;background:var(--panel)}
.mend{align-self:start;display:flex;flex-direction:column;gap:4px;padding:9px 11px;border:1px solid var(--line);border-left:3px solid var(--b-setup);border-radius:0 8px 8px 0;background:var(--panel)}
.band-case .mend{border-left-color:var(--b-case)}.band-change .mend{border-left-color:var(--b-change)}
.mend p{margin:0;font-size:13px;line-height:1.38}
.mend .mend-h{display:flex;align-items:center;gap:7px;font-weight:700;font-size:13.5px;line-height:1.25}
.mend .ring{flex:none;width:14px;height:14px;border-radius:50%;border:3px solid var(--ink);cursor:help}
.mend .hand{flex:none;width:16px;height:14px;cursor:help;background:var(--ink);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 14' fill='none' stroke='black' stroke-width='1.8'%3E%3Cpath d='M1 7h12M9 2.5 13.5 7 9 11.5'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 14' fill='none' stroke='black' stroke-width='1.8'%3E%3Cpath d='M1 7h12M9 2.5 13.5 7 9 11.5'/%3E%3C/svg%3E") center/contain no-repeat}
.mend .mend-c{padding-top:5px;margin-top:2px;border-top:1px solid var(--line);color:var(--muted)}
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
.atype{box-sizing:border-box;width:24px;display:flex;align-items:center;justify-content:center;border-left:3px solid var(--c);border-top:1px solid var(--c);border-bottom:1px solid var(--c);border-radius:6px 0 0 6px;background:color-mix(in srgb,var(--c) 7%,#fff);cursor:help}
.atype span{writing-mode:vertical-rl;transform:rotate(180deg);font:800 9.5px/1 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--c);white-space:nowrap}
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
#insp{position:fixed;top:0;right:0;bottom:0;width:min(var(--pw),92vw);background:var(--panel);color:var(--ink);border-left:1px solid var(--line);box-shadow:-6px 0 18px rgba(0,0,0,.14);z-index:1000;display:flex;flex-direction:column}
#insp[hidden]{display:none}
#insp .bar{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--muted)}
#insp .body{overflow:auto;padding:12px 16px 30px;flex:1}
body.docked main{margin-right:calc(var(--pw) + 16px)}
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
.rtag{display:inline-block;font-size:10.5px;font-weight:700;border-radius:3px;padding:0 4px;margin-right:3px;border:1px solid currentColor;cursor:help}
.tagkey{display:flex;flex-wrap:wrap;gap:4px 16px;align-items:baseline;font-size:12.5px;margin:6px 0 10px;padding:6px 10px;background:var(--panel);border:1px solid var(--line);border-radius:8px}
table.rec{table-layout:fixed}
table.rec thead th:nth-child(1){width:14%}table.rec thead th:nth-child(2){width:44%}table.rec thead th:nth-child(3),table.rec thead th:nth-child(4){width:21%}
.rec .plain{margin:0 0 3px;font-weight:600}
.rec .holds{margin:0 0 4px;font-size:12.5px}
.rec .where{margin:0 0 4px;font-size:12.5px;color:var(--muted)}
@media (max-width:700px){table.rec,table.rec tbody,table.rec tr,table.rec th,table.rec td{display:block;width:auto!important}table.rec thead{display:none}
  table.rec tr{border:1px solid var(--line);border-radius:8px;margin:0 0 10px;padding:8px 10px;background:var(--panel)}
  table.rec tbody th{border:0;padding:0 0 4px;font-size:15px;overflow-wrap:anywhere}table.rec td{border:0;padding:4px 0;overflow-wrap:anywhere}
  table.rec td:nth-of-type(2)::before,table.rec td:nth-of-type(3)::before{display:block;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:2px 0}
  table.rec td:nth-of-type(2)::before{content:"Read by"}table.rec td:nth-of-type(3)::before{content:"Changed by"}}
.recrules summary{cursor:pointer;font-weight:600;font-size:13px}
.recrules ul{font-size:13px}
.alink{all:unset;cursor:pointer;display:inline-block;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;border:1px solid var(--line);border-radius:999px;padding:0 7px;margin:0 3px 3px 0;background:var(--panel)}
.alink:hover,.alink:focus-visible{border-color:var(--accent);outline:none;background:var(--soft)}
.rtag.req{color:#0e7490}.rtag.dec{color:#7c3aed}.rtag.gap{color:#b91c1c}.rtag.prop{color:var(--muted)}
.tr td{font-size:12.5px}
#tip{position:fixed;z-index:1001;max-width:340px;background:#1f2a33;color:#fff;font-size:12.5px;line-height:1.45;padding:7px 10px;border-radius:6px;border-left:3px solid #8fa9c4;box-shadow:0 4px 14px rgba(0,0,0,.22)}
#tip .tk{display:block;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#b9cde0;margin-bottom:2px}
#tip[hidden]{display:none}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (max-width:999px){
  .nav{flex-wrap:nowrap;padding:6px 0}
  .nav a{display:none}
  .nav .jump{display:block}
  .dg-scroll.auto-hide{display:none}
  .io{grid-template-columns:1fr}
  .strip{grid-template-columns:1fr}
  .vnotes{display:none}
  .strip>div:nth-child(odd){border-bottom:0}
}
/* a constrained desktop reading pane (about 900–1099px): two cards per line; the middle handoff of each row and the
   6 → 7 wrap become downward arrows across the band; the end strip sits beside the row's last stage */
@media (min-width:900px) and (max-width:1099px){
  .mgrid{grid-template-columns:minmax(0,1fr) 96px minmax(0,1fr)}
  .marr.mid,.marr.phone-only{grid-column:1 / -1;display:flex;flex-direction:row;gap:8px;padding:6px 0 6px 26px;justify-content:flex-start;min-height:36px}
  .marr.mid .ln,.marr.phone-only .ln{order:-1;width:2px;height:24px;margin:0}
  .marr.mid .hs,.marr.phone-only .hs{display:inline;font-size:11.5px;font-weight:600;color:var(--muted)}
  .marr.mid .ln::after,.marr.phone-only .ln::after{right:auto;left:-5px;top:auto;bottom:-6px;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid var(--muted);border-bottom:0}
  .mwrap,.mread,.rv{display:none}
  .mrail{padding:12px 0}
  .stagestrip>ol{grid-template-columns:1fr}
  .wgrid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media (max-width:899px){
  #insp{top:auto;left:0;right:0;width:auto;height:92vh;border-left:0;border-top:1px solid var(--line);border-radius:12px 12px 0 0}
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
}
@media (max-width:600px){h1{font-size:22px}.ten{grid-template-columns:1fr}.ten dt{border-bottom:0;padding-bottom:0}}
/* detail panels: what it achieves, who acts, before, how, result; then flat supporting sections */
.backb{all:unset;box-sizing:border-box;cursor:pointer;display:inline-block;max-width:100%;font-size:13px;font-weight:600;color:var(--accent);margin:0 0 10px;padding:4px 9px;border:1px solid var(--line);border-radius:6px;background:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.backb:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.psec{margin:12px 0 0}
.psec>h3{margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.psec p{margin:0 0 4px;font-size:14px}
.psec p.mlab{font-size:10.5px;margin:2px 0 3px}.psec .mgate .qq{font-size:13.5px}
.purpose{font-size:15px!important;font-weight:600;line-height:1.4}
.auth,.chk{font-size:13.5px!important}
.kv{display:grid;grid-template-columns:92px minmax(0,1fr);margin:0;font-size:13.5px}
.kv dt{font-weight:700;color:var(--muted);font-size:12.5px;padding:5px 8px 5px 0;border-top:1px solid var(--line)}
.kv dd{margin:0;padding:5px 0;border-top:1px solid var(--line)}
.kv dt.hold{color:var(--warn)}
.then{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.lead{font-size:14px}
.steps{margin:4px 0 0;padding-left:22px;font-size:13.5px}
.steps li{margin:2px 0}
.gapnote{margin:8px 0 0;border-left:3px solid #b91c1c;background:var(--rule);padding:6px 9px;font-size:13px;border-radius:0 6px 6px 0}
.gapnote ul{margin:2px 0;padding-left:18px}
.supw{margin-top:14px;border-top:2px solid var(--line);padding-top:4px}
.supw>details.sup{border-bottom:1px solid var(--line);padding:6px 0;margin:0}
.supw>details.sup>summary{font-size:13.5px}
.slab{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:8px 0 2px}
.story,.roles{font-size:13px;margin-top:2px}
.story th,.story td,.roles th,.roles td{padding:5px 6px}
.story tbody th,.roles th{background:none;font-weight:600;width:30%}
.story .side,.roles .side{display:block;margin:1px 0 0}
.story td{width:38%}
.story td:last-child{color:var(--muted)}
#insp .story thead{display:none}
#insp .story,#insp .story tbody{display:block}
#insp .story tr{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);column-gap:12px;row-gap:2px;padding:7px 0;border-top:1px solid var(--line)}
#insp .story tbody th{grid-column:1 / -1;width:auto;border:0;padding:0}
#insp .story tbody th .side{display:inline;margin-left:6px}
#insp .story td{width:auto;border:0;padding:0;font-size:13.5px;line-height:1.4}
#insp .story td:last-child::before{content:"Result: ";font-weight:600;color:var(--muted)}
.acc{padding-left:18px}
.src th{width:34%;font-weight:600;font-size:12.5px;background:var(--rule)}
.src td{font-size:12.5px}
.ex-cmp tr.k th{background:var(--rule);font-weight:700}
.ex-cmp tr.k td{font-weight:600}
.ex-cmp tr.x td{font-size:12px;color:var(--muted);border-top:0;padding-top:2px}
.ex-cmp tr.x span{display:block;margin:1px 0}
.ex-cmp tr.x b{color:var(--ink);font-weight:600}
.exlinks ul{list-style:none;padding:0;margin:0;display:grid;gap:4px;font-size:13.5px}
.scard .ptr{margin:0;padding-left:18px;font-size:13.5px}
@media (max-width:600px){.story thead{display:none}.story,.story tbody,.story tr,.story th,.story td{display:block;width:auto}.story tr{border:1px solid var(--line);border-radius:6px;margin:0 0 6px;padding:4px 6px}.story th,.story td{border:0;padding:1px 0}.story td:last-child::before{content:"→ "}.story tbody th,.story td{width:auto}.kv{grid-template-columns:78px minmax(0,1fr)}}
@media print{.nav,.tools,#insp{display:none}.dg-scroll{overflow:visible}}
"""

def js():
    return r"""
(function(){
  const DATA = JSON.parse(document.getElementById('dg-data').textContent);
  const insp = document.getElementById('insp'), body = insp.querySelector('.body'), tip = document.getElementById('tip');
  const narrow = () => window.matchMedia('(max-width: 899px)').matches;
  const wide = () => window.matchMedia('(min-width: 1760px)').matches;
  let opener = null, current = null, tipTimer = null, stack = [];
  const exState = {};   // the reader's own Example choice, remembered per panel; never carried to an unrelated panel
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
  // a tooltip belongs to the thing under the pointer: any scroll, of the page or of a diagram or table, dismisses it
  document.addEventListener('scroll', () => { if (!tip.hidden) hideTip(); }, {capture: true, passive: true});
  // a table wider than the screen says so above it (the cue appears only when the table really overflows)
  function markScrolls(){ document.querySelectorAll('.tw').forEach(t => t.classList.toggle('scrolls', t.scrollWidth > t.clientWidth + 2)); }
  markScrolls(); window.addEventListener('resize', markScrolls); document.addEventListener('toggle', markScrolls, true);
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
    const anchor = stack.length ? stack[0].id : current;   // after a drill-down the panel stays clear of the element the reader selected
    let r; const a = DATA.acts[anchor];
    if (a) { const v = viewers[a.vid]; if (!v) return; const reg = v.get('elementRegistry'), el = reg.get(a.node); if (!el) return; r = reg.getGraphics(el).getBoundingClientRect(); }
    else { const n = document.getElementById(anchor); if (!n || !n.classList.contains('mnode')) return; r = n.getBoundingClientRect(); }
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
  function heading(){ const c = body.querySelector('.cid'), h = body.querySelector('h2'); return (c ? c.textContent + ' · ' : '') + (h ? h.textContent : ''); }
  // opts.child: opened from a link inside the panel (Back returns to the parent); opts.back: returning; neither: a new selection
  function open(id, from, opts){
    opts = opts || {};
    const isAct = !!DATA.acts[id];
    if (!isAct && !(DATA.cards || {})[id]) return;
    hideTip();
    if (opts.child && current && !insp.hidden) stack.push({id: current, scroll: body.scrollTop, open: [...body.querySelectorAll('details')].map(d => d.open), title: heading(), via: opts.via || null});
    else if (!opts.back) { for (const s of stack) mark(s.id, false); stack = []; }
    if (current) mark(current, false);
    if (insp.hidden) opener = from || document.activeElement;
    else if (from) opener = from;
    current = id;
    if (opts.example) exState[id] = true;
    body.innerHTML = document.getElementById('tpl-' + id).innerHTML;
    const btn = body.querySelector('.ex-btn'), ex = body.querySelector('.example');
    if (btn && ex) {
      const on = !!exState[id]; btn.setAttribute('aria-expanded', String(on)); ex.hidden = !on;
      btn.addEventListener('click', () => { exState[id] = ex.hidden; btn.setAttribute('aria-expanded', String(exState[id])); ex.hidden = !exState[id]; });
    }
    if (stack.length) { const p = stack[stack.length - 1], b = document.createElement('button'); b.type = 'button'; b.className = 'backb';
      b.textContent = '← Back to ' + p.title; b.addEventListener('click', back); body.prepend(b); }
    insp.querySelector('.bar span').textContent = isAct ? 'Activity ' + id + ' · ' + DATA.acts[id].view : DATA.cards[id].label;
    insp.hidden = false; for (const s of stack) mark(s.id, true); mark(id, true); applyMode();
    try { history.replaceState(null, '', (isAct ? '#a=' : '#c=') + id); } catch(e) {}
    const r = opts.restore;
    if (r) { const ds = body.querySelectorAll('details'); r.open.forEach((o, i) => { if (ds[i]) ds[i].open = o; }); body.scrollTop = r.scroll; } else body.scrollTop = 0;
    const via = r && r.via ? body.querySelector('.fl-link[data-act="' + r.via + '"], .fl-link[data-card="' + r.via + '"]') : null;
    if (via) via.focus({preventScroll: true}); else { const h = body.querySelector('h2'); if (h) h.focus({preventScroll: true}); }
    if (opts.example && btn) { btn.scrollIntoView({block: 'start'}); btn.focus({preventScroll: true}); }
  }
  function back(){ const p = stack.pop(); if (p) open(p.id, null, {back: true, restore: p}); }
  function close(){
    if (insp.hidden) return;
    for (const s of stack) mark(s.id, false); stack = [];
    if (current) mark(current, false);
    insp.hidden = true; current = null; applyMode();
    try { history.replaceState(null, '', location.pathname + location.search); } catch(e) {}
    if (opener && document.contains(opener)) opener.focus({preventScroll: true});
  }
  window.S1 = {open, close, back};
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
    if (c && c.matches('.fl-link')) { open(c.dataset.card, null, {child: true, via: c.dataset.card}); return; }
    const b = e.target.closest('[data-act]');
    if (b && !insp.contains(b) && (b.matches('button'))) { open(b.dataset.act, b); }
    else if (b && insp.contains(b) && b.matches('.fl-link')) { open(b.dataset.act, null, {child: true, via: b.dataset.act}); }
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
      if (d) { const v = viewers[dgw.dataset.view]; if (v) { fit(v, dgw.dataset.view); placeLabels(v, dgw.dataset.view); } } }
    bD.addEventListener('click', () => set('dg')); bL.addEventListener('click', () => set('list'));
    if (narrow()) { bD.setAttribute('aria-pressed', 'false'); bL.setAttribute('aria-pressed', 'true'); lst.hidden = false; dgw.style.display = 'none'; dgw.classList.remove('auto-hide'); }
  });


  // Label placement (cohesion pass, 18 Oct 2026): the viewer draws each external label where the diagram data puts it, but its
  // text wraps by the viewer's own measure, so a label can end up struck through by a connector or on top of a shape. Once a
  // diagram is visible, each label's real text box is measured and, only if it collides, moved by the smallest offset that clears
  // every connector, shape, other label and the dashed group border. Nothing else in the diagram changes.
  const placedLabels = {};
  function placeLabels(v, vid){
    if (placedLabels[vid]) return;
    const cv = v.get('canvas'), reg = v.get('elementRegistry'), svg = cv._svg;
    if (!svg || !svg.getBoundingClientRect().width) return;
    placedLabels[vid] = true;
    const segs = [], obst = [], labels = [], D = DATA.views[vid];
    const edges = (x, y, w, h, id) => { segs.push([{x, y}, {x: x + w, y}, id], [{x: x + w, y}, {x: x + w, y: y + h}, id], [{x: x + w, y: y + h}, {x, y: y + h}, id], [{x, y: y + h}, {x, y}, id]); };
    reg.forEach(e => {
      const t = e.type || '', bo = e.businessObject || {};
      if (e.waypoints) { for (let i = 0; i + 1 < e.waypoints.length; i++) segs.push([e.waypoints[i], e.waypoints[i + 1], e.id]); return; }
      if (t === 'label') { labels.push(e); return; }
      if (t === 'bpmn:Lane' || t === 'bpmn:Collaboration' || t === 'bpmn:Process' || !('x' in e)) return;
      if (t === 'bpmn:Participant') { if (!bo.processRef) obst.push({id: e.id, l: e.x, t: e.y, r: e.x + e.width, b: e.y + e.height}); return; }
      if (t === 'bpmn:Group' || (t === 'bpmn:SubProcess' && e.width > 200)) { edges(e.x, e.y, e.width, e.height, e.id); return; }
      obst.push({id: e.id, l: e.x, t: e.y, r: e.x + e.width, b: e.y + e.height});
    });
    const boxOf = e => { const g = reg.getGraphics(e), tx = g && g.querySelector('text'); if (!tx || !tx.textContent.trim()) return null;
      const b = tx.getBBox(); return {l: e.x + b.x, t: e.y + b.y, r: e.x + b.x + b.width, b: e.y + b.y + b.height}; };
    const cur = new Map(); labels.forEach(e => { const b = boxOf(e); if (b) cur.set(e, b); });
    const hitSeg = (q, s) => { const [p, r] = s; const n = Math.max(2, Math.ceil(Math.hypot(r.x - p.x, r.y - p.y) / 2));
      for (let i = 0; i <= n; i++) { const x = p.x + (r.x - p.x) * i / n, y = p.y + (r.y - p.y) * i / n; if (x > q.l && x < q.r && y > q.t && y < q.b) return true; } return false; };
    const ov = (a, b, pad) => a.l < b.r + pad && a.r > b.l - pad && a.t < b.b + pad && a.b > b.t - pad;
    function bad(e, q){
      const own = e.labelTarget && e.labelTarget.id;
      if (q.l < 2 || q.t < 2 || q.r > D.w - 2 || q.b > D.h - 2) return true;
      for (const s of segs) if (hitSeg({l: q.l - 4, t: q.t - 3, r: q.r + 4, b: q.b + 3}, s)) return true;
      for (const o of obst) if (ov(q, o, o.id === own ? 1 : 2)) return true;
      for (const [f, b] of cur) if (f !== e && ov(q, b, 6)) return true;
      // stay next to what the label names: within 14px of its own connector, or 28px of its own shape
      const tgt = e.labelTarget;
      if (tgt && tgt.waypoints) { let near = false; for (let i = 0; i + 1 < tgt.waypoints.length && !near; i++) near = hitSeg({l: q.l - 14, t: q.t - 14, r: q.r + 14, b: q.b + 14}, [tgt.waypoints[i], tgt.waypoints[i + 1]]); if (!near) return true; }
      else if (tgt && 'x' in tgt && !ov(q, {l: tgt.x, t: tgt.y, r: tgt.x + tgt.width, b: tgt.y + tgt.height}, 28)) return true;
      return false;
    }
    const offs = []; for (let dx = -140; dx <= 140; dx += 4) for (let dy = -56; dy <= 56; dy += 4) offs.push([dx, dy]);
    offs.sort((a, b) => (Math.abs(a[0]) + 1.4 * Math.abs(a[1])) - (Math.abs(b[0]) + 1.4 * Math.abs(b[1])));
    // event and gateway labels first (they belong next to one shape); connector labels can slide along their line
    labels.sort((a, b) => (a.labelTarget && a.labelTarget.waypoints ? 1 : 0) - (b.labelTarget && b.labelTarget.waypoints ? 1 : 0));
    for (const e of labels) {
      const b = cur.get(e); if (!b || !bad(e, b)) continue;
      for (const [dx, dy] of offs) {
        const q = {l: b.l + dx, r: b.r + dx, t: b.t + dy, b: b.b + dy};
        if (bad(e, q)) continue;
        e.x += dx; e.y += dy; reg.getGraphics(e).setAttribute('transform', 'matrix(1 0 0 1 ' + e.x + ' ' + e.y + ')'); cur.set(e, q); break;
      }
    }
  }
  function fit(v, vid){ const d = DATA.views[vid]; const cv = v.get('canvas'); cv.resized(); cv.viewbox({x: 0, y: 0, width: d.w, height: d.h}); }

  async function render(vid){
    const d = DATA.views[vid], el = document.getElementById('dg-' + vid);
    const v = new BpmnJS({container: el, width: d.w + 'px', height: d.h + 'px'});
    viewers[vid] = v;
    try { await v.importXML(d.xml); } catch (err) { el.textContent = 'Diagram failed to load: ' + err.message; el.dataset.error = err.message; return; }
    fit(v, vid); placeLabels(v, vid);
    const ov = v.get('overlays'), reg = v.get('elementRegistry'), bus = v.get('eventBus');
    for (const id of d.acts) {
      const a = DATA.acts[id], el2 = reg.get(a.node); if (!el2) continue;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'eye'; b.dataset.act = id;
      b.style.setProperty('--c', a.color); b.setAttribute('aria-label', 'Details: activity ' + id + ' ' + a.title); b.innerHTML = eyeSvg;
      ov.add(a.node, {position: {top: 3, right: 25}, html: b});
    }
    // horizontal pool and lane names (the rotated BPMN labels are hidden by the page's style; the names and roles stay in the diagram data)
    for (const p of d.pools || []) { if (!reg.get(p.id)) continue; const t = document.createElement('div'); t.className = 'pooltag'; t.textContent = p.name;
      ov.add(p.id, {position: {top: -20, left: 2}, html: t});
      for (const gr of p.groups || []) { const b = document.createElement('div'); b.className = 'atype'; b.style.height = (gr.h - 8) + 'px'; b.style.setProperty('--c', gr.color);
        b.dataset.tip = gr.tip; b.innerHTML = '<span></span>'; b.firstChild.textContent = gr.label; ov.add(p.id, {position: {top: gr.top + 4, left: 3}, html: b}); } }
    for (const l of d.lanes || []) { if (!reg.get(l.id)) continue; const t = document.createElement('div'); t.className = 'lanetag'; t.style.setProperty('--c', l.color);
      t.innerHTML = '<span></span>'; t.firstChild.textContent = l.name; t.dataset.tip = l.tip;
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
  if (tech) tech.addEventListener('toggle', () => { if (tech.open && viewers.v0) { fit(viewers.v0, 'v0'); placeLabels(viewers.v0, 'v0'); } });
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
SIDE_KEY = D.SIDE_KEY
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
    # name and product-side tag share one line (the tag right-aligned, wrapping under the name only when the card is narrow)
    return ("<div class='msec'><p class='mlab'>Who acts</p><ol class='mwho'>" +
            "".join(f"<li style='--c:{ACTOR[k][3]}'><span><span class='wn1'><b>{E(J_LABEL[k])}</b>{side_tag(k)}</span>{E(v)}</span></li>" for k, v in st["who"]) + "</ol></div>")

def gate_tip(q):
    # the decision mark says whether its outcomes exclude each other or may apply together (D.DECISIONS_TOGETHER)
    return ("Decision mark: these outcomes can apply together, for example to different items or as a follow-on"
            if q in D.DECISIONS_TOGETHER else "Decision mark: exactly one of the outcomes below is taken")

def gates_html(st, card=False):
    # the map card may show a compact summary of the decisions (card_gates); the panel always shows them in full
    gates = st.get("card_gates") or st["gates"] if card else st["gates"]
    return "".join(f"<div class='mgate'><p class='mlab q' data-tip='{E(gate_tip(q))}'>Decision</p><p class='qq'>{E(q)}</p><ul>" +
                   "".join(f"<li><b>{E(o)}</b><span>→ {E(c)}</span></li>" for o, c in outs) + "</ul></div>" for q, outs in gates)

# card label and tooltip for each kind of 'runs' line; the data keeps its own key words
RUNS = {"Runs": ("rep", "Repeats", "Repeat mark: this stage runs several times"),
        "Side by side": ("par", "In parallel", "Parallel mark: these steps run at the same time"),
        "Waits for": ("wait", "Waits for", "Wait mark: the stage pauses until this arrives"),
        "Per filing": ("each", "Per filing", "Per-filing mark: each applicant's filing moves on its own")}
def runs_html(st):
    if not st["runs"]: return ""
    k, lab, tip = RUNS[st["runs"][0]]
    return f"<div class='msec'><p class='mlab mruns ic-{k}' data-tip='{E(tip)}'>{E(lab)}</p><p class='mrt'>{E(st['runs'][1])}</p></div>"

def m_node(st, door=False):
    sid = "st-" + st["n"]; kind = "Start a new case" if door else "Stage"
    ptrs = st.get("card_pointers", st["pointers"])   # a compact route card may show fewer; the panel always shows every pointer
    call = "<div class='msec'><p class='mlab'>Key rules</p><ul class='mcall'>" + "".join(f"<li><span>{E(x)}</span></li>" for x in ptrs) + "</ul></div>" if ptrs else ""
    ex = (f"<button type='button' class='mbtn' data-card='{sid}' data-ex='1' aria-label='Example: {kind.lower()} {E(st['n'])}, {E(st['title'])}' data-tip='Open Client A&#39;s worked example for this stage'>Example</button>"
          if st["example"] else "")
    return (f"<article class='mnode{' door' if door else ''}' id='{sid}' aria-labelledby='{sid}-h'>"
            + (f"<header><span class='snum start' aria-hidden='true' data-tip='{E(START_TIP[st['n']])}'></span><h4 id='{sid}-h'><span class='kick'>{E(st['label'])}</span>{E(st['title'])}</h4>" if door else
               f"<header><span class='snum' aria-label='{kind} {E(st['n'])}'>{E(st['n'])}</span><h4 id='{sid}-h'>{E(st['title'])}</h4>") +
            f"<button type='button' class='eye seye det' data-card='{sid}' aria-label='Details: {E(st['label']) if door else 'stage ' + st['n']}, {E(st['title'])}' "
            f"data-tip='Open the details: what this stage receives, does and hands over, its rules, exceptions and the detailed activities'>{EYE_SVG}</button></header>"
            f"{who_html(st)}{call}{runs_html(st)}{gates_html(st, card=True)}"
            + (f"<div class='mctl'>{ex}</div>" if ex else "") + "</article>")

EYE_SVG = ('<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5z" fill="none" stroke="currentColor" stroke-width="1.5"/>'
           '<circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>')

def m_arrow(label, cls="", route=None):
    # route (source, destination): shown only where the arrow leaves the row (the 900–1099px reflow), so a downward cue names its real source
    lab = f"<span class='sr'>then, handing over: </span><span class='hl'>{E(label)}</span>" if label else "<span class='sr'>then</span>"
    if route: lab += f"<span class='hs'>(stage {E(route[0])} → stage {E(route[1])})</span>"
    return f"<div class='marr {cls}'>{lab}<span class='ln' aria-hidden='true'></span></div>"

def m_store():
    lk = next(l for l in D.JOURNEY_LINKS if l[0] == "setup")
    return (f"<div class='mstore' id='released-package'><div class='cyl' aria-hidden='true'></div><h4>{E(lk[2])}</h4>"
            f"<p>{E(lk[3])}</p></div>")

START_TIP = {"A": "Start mark: an enquiry arrives; no case exists until the firm accepts it",
             "B": "Start mark: the agent starts another service from an existing client's record"}

def m_end(text):
    # a compact strip attached to the row's last arrow: either the end of this band's process (end ring) or a handoff
    # to work that continues elsewhere (After decision); the case-closure condition is stated on its own line
    title, body, *close = text.split("|")
    cont = title.startswith("Continues")
    mark = ("<span class='hand' aria-hidden='true' data-tip='Handoff: the work continues in another part of the case workflow'></span>" if cont else
            "<span class='ring' aria-hidden='true' data-tip='End mark: this band\u2019s process ends here'></span>")
    return (f"<div class='mend{' mcont' if cont else ''}'><p class='mend-h'>{mark}{E(title)}</p><p>{E(body)}</p>"
            + "".join(f"<p class='mend-c'>{E(c)}</p>" for c in close) + "</div>")

# Column weights per band (stage cards, then the end strip): wider columns for the cards with more to say, so short and long
# cards sit closer in height without padding. The rails between the bands and the 6 → 7 wrap are placed from the same weights.
COLW = {"setup": (1.0, 1.0, 1.4, 0.62), "case": (1.05, 1.05, 0.95, 1.1), "change": (1.0, 1.05, 1.1, 0.62)}
ARW = 88
def col_template(w): return f" {ARW}px ".join(f"minmax(0,{x}fr)" for x in w)
def col_at(w, i, from_right=False, pad=0):
    # CSS offset of column i's centre from the left (or right) edge of a box whose content starts after 'pad' px
    if from_right: w = tuple(reversed(w)); i = len(w) - 1 - i
    f = (sum(w[:i]) + w[i] / 2) / sum(w); n = len(w) - 1
    return f"calc({pad + ARW * i}px + {f:.4f} * (100% - {2 * pad + ARW * n}px))"

def map_html():
    key = "".join(f"<span class='ak' style='--c:{c}'><i aria-hidden='true'></i>{E(t)}</span>" for t, c in SIDE_KEY)
    out = ["<section class='blk' id='overview'><h2>End to end: the process at a glance</h2>"
           "<p class='cont'>A plain-language process map, not BPMN. Read each band left to right: setup is done once and reused, every case reads the published setup, "
           "and a change is published and then adopted. Each card names who acts and the decision that ends the stage. "
           "The <b>eye</b> opens the full details (inputs, actions, handoff, rules, exceptions); <b>Example</b> opens Client A's case; hover any mark or tag for its meaning. "
           "Stage numbers 1–12 belong to this map; the BPMN views below are numbered 1–7, with activities 1.1–10.4.</p>"
           f"<p class='akey'><span class='akl'>Actor names, by product side:</span>{key}</p>"]
    # the stage strip: every stage in one line, so no band looks as if it starts in the middle
    strip = []
    for key, badge, title, who, note, rows, rng in D.JOURNEY_BANDS:
        items = []
        for r in rows:
            for i in r:
                if i == "doors": items += [d["n"] for d in D.JOURNEY_DOORS]
                elif i in STAGE: items.append(i)
        doors = [n for n in items if not n.isdigit()]; nums = [n for n in items if n.isdigit()]
        starts = ("<div class='sgways'><span class='sgsub'>Start a new case</span>" + "".join(f"<a href='#st-{n}'><span class='snum start' aria-hidden='true'></span><span class='sgt'>{E(STAGE[n]['label'])}</span></a>" for n in doors) + "</div>") if doors else ""
        strip.append(f"<li class='sg sg-{key}'><span class='sgname'>{E(badge)}</span><span class='sgrange'>{E(rng)}</span>{starts}<ol>" +
                     "".join(f"<li><a href='#st-{n}'><span class='snum'>{E(n)}</span><span class='sgt'>{E(STAGE[n]['title'])}</span></a></li>" for n in nums) + "</ol></li>")
    out.append("<nav class='stagestrip' aria-label='All stages on this map'><ol>" + "".join(strip) + "</ol></nav>")
    for key, badge, title, who, note, rows, rng in D.JOURNEY_BANDS:
        if key == "change":
            c7 = col_at(COLW["case"], 0, pad=15)
            out.append(f"<div class='mrail mrail-x' role='note' style='--x7:{c7}'><i class='rv rv-dn' aria-hidden='true'></i><i class='rv rv-up' aria-hidden='true'></i>"
                       "<div class='rbox'><span class='rk'>Between the bands</span><span><b>Down, stage 7 → 10:</b> a firm's support ticket about a form or a mapping.</span>"
                       "<span><b>Up, stage 12 → 7:</b> after the agent adopts a new published version, only the affected forms are prepared again.</span></div></div>")
        endcol = " mgrid-end" if all(r[-1].startswith("end:") for r in rows) else ""
        out.append(f"<div class='band band-{key}'><div class='bhead'><span class='freq'>{E(badge)}</span><h3>{E(title)}</h3>"
                   f"<span class='brange'>{E(rng)}</span><span class='bwho'>{E(who)}</span><p>{E(note)}</p></div><div class='mgrid{endcol}' style='--cols:{col_template(COLW[key])}'>")
        for ri, row in enumerate(rows):
            if ri > 0:
                prev = STAGE[rows[ri - 1][-1]]
                # the wrap starts above the source stage's own column (stage 6 is the last card of its row)
                src = len(rows[ri - 1]) - 1
                out.append(f"<div class='mwrap' aria-hidden='true' style='--wl:{col_at(COLW[key], 0)};--wr:{col_at(COLW[key], src, from_right=True)}'>"
                           f"<span class='hl'>{E(prev['handoff'])} (stage {E(prev['n'])} → stage {E(row[0])})</span><i class='ah'></i></div>")
                out.append(m_arrow(prev["handoff"], "phone-only", (prev["n"], row[0])))
            cells = []
            for ci, item in enumerate(row):
                if item == "doors":
                    cells.append("<div class='mdoors' role='group' aria-label='Start a new case: 4A or 4B'><span class='dlab'>Start a new case</span>" +
                                 "".join(m_node(d, door=True) for d in D.JOURNEY_DOORS) + "</div>")
                elif item == "store": cells.append(m_store())
                elif item.startswith("end:"): cells.append(m_end(item[4:]))
                else: cells.append(m_node(STAGE[item]))
                if ci < len(row) - 1:
                    lab = "Client record resolved" if item == "doors" else STAGE[item]["handoff"]
                    mid = ci == 1 and len(row) == 4
                    cells.append(m_arrow(lab, "mid" if mid else "", (item, row[ci + 1]) if mid else None))
            out.append("".join(cells))
        out.append("</div></div>")
        if key == "setup":
            lk = next(l for l in D.JOURNEY_LINKS if l[0] == "setup")
            out.append(f"<div class='mrail mrail-pkg' id='released-package' role='note' style='--xin:{col_at(COLW['setup'], 3, from_right=True, pad=15)};--xout:{col_at(COLW['case'], 1, pad=15)}'>"
                       "<i class='rv rv-in' aria-hidden='true'></i><i class='rv rv-out' aria-hidden='true'></i>"
                       f"<div class='rbox'><span class='cyl' aria-hidden='true' data-tip='Record mark: a shared, read-only store'></span><span class='rk'>{E(lk[2])}</span><span>{E(lk[3])}</span>"
                       "<span class='rread'>Read, not sent: each new case reads it when it opens (stage 4)</span></div></div>")
    out.append("</section>")
    return "".join(out)

def stage_story(st):
    p = PN.STAGE[st["n"]]
    return ("<table class='story'><thead><tr><th>Who</th><th>What happens</th><th>Result</th></tr></thead><tbody>" +
            "".join(f"<tr><th>{actor_line(k)}</th><td>{E(w)}</td><td>{E(r)}</td></tr>" for k, w, r in p["story"]) + "</tbody></table>")

def j_panel(st, door=False):
    sid = "st-" + st["n"]; p = PN.STAGE[st["n"]]
    band = next(b for b in D.JOURNEY_BANDS if b[0] == BAND_OF[st["n"]])
    meta = f"{E(band[2])} · {E(band[6])}"
    first = [sec("What this achieves", f"<p class='purpose'>{E(p['purpose'])}</p>"), sec("Who does what, in order", stage_story(st) + runs_html(st))]
    if not door:
        first.append(sec("Starts with", f"<p>{E(st['receives'])}</p>" + (f"<p class='sub'><b>Needs:</b> {E('; '.join(st['before']))}</p>" if st["before"] else "")))
        nxt = f"<p><b>Hands over:</b> {E(st['produces'])} <b>→</b> {E(st['to'])}</p>"
    else:
        nxt = f"<p>{E(p['next'])}</p>"
    links = "".join(f" <button type='button' class='fl-link' data-card='{c}'>{E(t)}</button>" for c, t in p.get("links", []))
    first.append(sec("Result and what happens next", nxt + (f"<p class='sub'>Open: {links}</p>" if links else "")))
    if st["gates"]: first.append(sec("Decisions", gates_html(st)))
    imp = ([p["important"]] if p.get("important") else []) + st["pointers"]
    if imp: first.append(sec("Key rules", "<ul class='ptr'>" + "".join(f"<li>{E(x)}</li>" for x in imp) + "</ul>"))
    rules = j_rules(st)
    sup = []
    if rules or st["exceptions"]:
        sup.append(f"<details class='sup'><summary>Rules and exceptions ({len(rules) + len(st['exceptions'])})</summary>"
                   + (f"<ul class='rules'>{''.join(f'<li>{rtag(c)} {E(t)}</li>' for c, lab, t in (tagname(r) for r in rules))}</ul>" if rules else "")
                   + ("<p class='slab'>Exceptions</p><ul>" + "".join(f"<li>{E(x)}</li>" for x in st["exceptions"]) + "</ul>" if st["exceptions"] else "") + "</details>")
    blocks = [J_BLOCKS.get(b, b) if isinstance(b, str) else b for b in st["example"]]
    if blocks:
        sup.append(f"<button type='button' class='ex-btn' aria-expanded='false' aria-controls='ex-{sid}'>Example · Client A</button>"
                   f"<div class='example' id='ex-{sid}' hidden>{blocks_html(blocks)}</div>")
    acts = "".join(f"<li><button type='button' class='fl-link' data-act='{a}'>{a} · {E(V.SHORT[a])}</button> <span class='sub'>· {E(J_LABEL[ACT[a]['lane']])} · view {view_of_act(a)['n']}</span></li>" for a in st["acts"])
    sup.append(f"<section class='psec acts'><h3>Detailed activities</h3><p class='sub'>Each opens its full description here; Back returns to this {'route' if door else 'stage'}.</p><ul class='alist'>{acts}</ul></section>")
    return (f"<div class='card scard' data-card='{sid}'><header class='ch'><div class='cid' style='--c:#374151'>{E(st['label']) + ' · start a new case' if door else 'Stage ' + E(st['n'])}</div>"
            f"<h2 id='insp-h' tabindex='-1'>{E(st['title'])}</h2><div class='cmeta'>{meta}</div></header>"
            + "".join(first) + f"<div class='supw'>{''.join(sup)}</div></div>")

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
        pools = [dict(id=f"P_{view['id']}_{pool}", name=D.POOLS[pool]["name"] + (" · runs once per form, side by side" if D.POOLS[pool].get("multi") else ""),
                      groups=actor_groups(view, pool, g)) for pool, _ in view["pools"]]
        views_json[view["id"]] = dict(xml=xmls[view["id"]], w=g["W"], h=g["H"], acts=acts, lanes=lanes, pools=pools,
                                      nodeAct={"A_" + a.replace(".", "_"): a for a in acts}, links=links)
    cards_json = {"st-" + st["n"]: dict(label=(st["label"] if st in D.JOURNEY_DOORS else "Stage " + st["n"]) + " · process map") for st in D.JOURNEY + D.JOURNEY_DOORS}
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
      "Click a phase box to jump to its view.</p>")
    A(diagram_block(V.OVERVIEW, list_html(V.OVERVIEW)))
    A("<h3 style='margin-top:16px'>Who does what, by view</h3><div class='matrix'><table class='mx'><thead><tr><th>Actor</th>" +
      "".join(f"<th>{v['n']} {E(v['title'])}</th>" for v in V.VIEWS) + "</tr></thead><tbody>")
    for k, n, s, c in D.ACTORS:
        row = f"<tr><th class='act' style='--c:{c}'>{E(n)}</th>"
        for v in V.VIEWS:
            cell = "".join(f"<button type='button' data-act='{a}' style='--c:{c}'><b>{a}</b> {E(V.SHORT[a])}</button>"
                           for a in [act_of(nd[0]) for nd in v["nodes"] if act_of(nd[0])] if ACT[a]["lane"] == k)
            if k == "gov" and v["id"] == "v6": cell = "<span class='sub'>Receives the application; sends acknowledgements, requests and the decision as government letters</span>"
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
    A("<h3 style='margin-top:14px'>Checks and what each establishes</h3><div class='tw'><table><thead><tr><th>Check</th><th>What it shows</th><th>How</th><th>Where</th><th>What it does not show</th></tr></thead><tbody>" +
      "".join(f"<tr><th>{E(a)}</th><td>{E(b)}</td><td>{E(c)}</td><td>{E(d)}</td><td>{E(e)}</td></tr>" for a, b, c, d, e in D.CHECK_KINDS) + "</tbody></table></div>")
    for title, steps in D.SAFEGUARDS:
        A(f"<p style='margin:10px 0 0'><b>{E(title)}</b></p><div class='seq'>" + "<i>→</i>".join(f"<span>{E(s)}</span>" for s in steps) + "</div>")
    A("<h3 style='margin-top:14px'>Principles</h3><div class='strip'>" + "".join(f"<div>{E(t)}</div><div>{E(s)}</div>" for t, s in D.PRINCIPLES) + "</div></section>")

    # records: plain words first, rules tagged by source, readers and writers as links to their activity cards
    def act_links(ids):
        return "".join(f"<button type='button' class='alink' data-act='{a}'>{a}</button>" for a in ids)
    def where(ids):
        ph = []
        for pk, pname, psub, vids in D.PHASES:
            hit = sorted({VIEW[ACT[a]["view"]]["n"] for a in ids if ACT[a]["view"] in vids})
            if hit: ph.append(f"{pname} (view{'s' if len(hit) > 1 else ''} {', '.join(str(x) for x in hit)})")
        return "; ".join(ph)
    A("<section class='blk' id='records'><h2>Shared records</h2><p class='cont'>The six places where information is kept. They are data stores, not services: activities read and change them. "
      "Click an activity number to open its card; hover it for a one-line preview.</p>" + tag_key() +
      "<div class='tw'><table class='rec'><thead><tr><th>Shared record</th><th>In plain words, what it holds and its rules</th><th>Read by</th><th>Changed by</th></tr></thead><tbody>")
    for k, n, holds, rules in D.RECORDS:
        rd = [a for a in ACT if k in ACT[a]["reads"]]; up = [a for a in ACT if k in ACT[a]["updates"]]
        extra = ("<details class='recrules'><summary>Rules (" + str(len(rules)) + ")</summary><ul>" + "".join(f"<li>{rtag(c)} {E(t)}</li>" for c, lab, t in (tagname(r) for r in rules)) + "</ul></details>") if rules else ""
        A(f"<tr><th>{E(n)}</th><td><p class='plain'>{E(D.RECORD_PLAIN[k])}</p><p class='sub holds'>{E(holds)}</p>{extra}</td>"
          f"<td><p class='where'>{E(where(rd)) or 'none'}</p>{act_links(rd)}</td><td><p class='where'>{E(where(up)) or 'none'}</p>{act_links(up)}</td></tr>")
    A("</tbody></table></div></section>")

    # case types
    A("<section class='blk' id='cases'><h2>Individual · Family · Corporate</h2><p class='cont'>Same engine and pack structure; the subjects, filings, answerers, repeats and signing differ.</p>"
      "<div class='tw'><table><thead><tr><th></th><th>Individual</th><th>Family</th><th>Corporate</th></tr></thead><tbody>" +
      "".join(f"<tr><th>{E(r[0])}</th><td>{E(r[1])}</td><td>{E(r[2])}</td><td>{E(r[3])}</td></tr>" for r in D.CASE_TYPES) + "</tbody></table></div></section>")

    # evidence
    A("<section class='blk' id='evidence'><h2>Evidence status</h2><p class='cont'>Proposed targets, measured results and approved acceptance criteria are kept apart. Nothing is measured yet. The planned real read of the official forms establishes two things only: each form's field inventory and the matching (with the runtime AI challenger on the same answer key). The table after the measures shows what each other proof needs.</p>"
      "<div class='tw'><table><thead><tr><th>Measure</th><th>Scope</th><th>Proposed target</th><th>Measured</th><th>Approved acceptance criterion</th></tr></thead><tbody>" +
      "".join(f"<tr><td>{E(a)}</td><td>{E(b)}</td><td>{E(c)}</td><td>{E(d)}</td><td>{E(e)}</td></tr>" for a, b, c, d, e in D.MEASURES) + "</tbody></table></div>")
    A("<h3 style='margin-top:14px'>What each kind of proof establishes</h3><div class='tw'><table><thead><tr><th>Evidence</th><th>What it establishes</th><th>In the planned real read?</th><th>Who proves the rest</th></tr></thead><tbody>" +
      "".join(f"<tr><th>{E(a)}</th><td>{E(b)}</td><td>{E(c)}</td><td>{E(d)}</td></tr>" for a, b, c, d in D.PROOF_SCOPE) + "</tbody></table></div>")
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

POOL_TYPE = {"setup": "er", "copy": "firm", "case": "firm"}
def actor_groups(view, pool, g):
    # contiguous lanes of the same actor type share one bracket in the pool's left strip
    ll = dict(view["pools"])[pool]; P = g["pools"][pool]; out = []
    if len(ll) == 1 and ll[0][0] is None:
        lab, tip, col = D.ACTOR_TYPE[POOL_TYPE[pool]]
        lab = "Expat Ready" if pool == "setup" else lab
        return [dict(top=0, h=P.h, label=lab, tip=tip, color=col)]
    for actor, _ in ll:
        L = g["lanes"][f"{pool}.{actor}"]; t = D.ACTOR_ROLE[actor][0]
        if out and out[-1]["type"] == t: out[-1]["h"] += L.h; continue
        lab, tip, col = D.ACTOR_TYPE[t]
        out.append(dict(type=t, top=L.t - P.t, h=L.h, label=lab, tip=tip, color=col))
    return out

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
        # what a reader needs for this kind of item, not a fixed count of fields
        if not PN.PURPOSE.get(a, "").strip() or ". " in PN.PURPOSE[a].rstrip("."): ERR.append(f"{a}: 'what this achieves' missing or more than one sentence")
        for k, why in (("trigger", "start condition"), ("ready", "done-when"), ("ret", "route when it cannot finish"), ("title", "title")):
            if not str(act.get(k, "")).strip(): ERR.append(f"{a}: no {why}")
        if not act["io"][2].strip() or not (PN.NEXT.get(a) or act["io"][3]).strip(): ERR.append(f"{a}: no result or next recipient")
        if not act["actions"]: ERR.append(f"{a}: no steps")
        if act["kind"] in ("user", "manual", "call") and not act["authority"].strip(): ERR.append(f"{a}: a person's step without its authority")
        if act["kind"] == "service" and act["screen_kind"] == "none" and a not in PN.RESULT_AT: ERR.append(f"{a}: automatic step without where its results appear")
        if act["kind"] == "call":
            ro = PN.ROLES.get(a, []); ks = {k for k, _, _ in ro}
            if len(ks) < 3 or not {"pub", "rel"} <= ks or not any("Never" in t for k, _, t in ro if k == "rel"):
                ERR.append(f"{a}: a composite step must name its coordinator, its parts and an approver who is never the drafter")
        if not act["accept"]: ERR.append(f"{a}: no acceptance check")
        if not act["reads"] and not act["updates"]: ERR.append(f"{a}: no records")
        if not act["example"] and not (PN.EXAMPLE_LINKS.get(a) and all(t in ACT and ACT[t]["example"] for t, _ in PN.EXAMPLE_LINKS[a])):
            ERR.append(f"{a}: no example and no link to an existing one")
        if not act["rules"]: ERR.append(f"{a}: no rules")
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
                if typ == "or" and not any(op.get("default") for _, _, op in o) and not n[6].get("covers"): ERR.append(f"{v['id']}: inclusive split {nid} has no default path")
                # 'covers': the branch conditions together always apply in some combination, so no default is drawn; a default would
                # suppress the other branches (BPMN 2.0.2 inclusive gateway: the default runs only when no other condition is true)
                if typ == "or" and n[6].get("covers") and any(op.get("default") for _, _, op in o): ERR.append(f"{v['id']}: inclusive split {nid} marked 'covers' has a default")
            if typ == "evg":
                for t, _, _ in o:
                    if nodes[t][1] not in ("catch-msg", "catch-cond"): ERR.append(f"{v['id']}: event gateway {nid} leads to a non-event")
        for typ in ("and", "or"):
            # an inclusive split marked nojoin has branches that never merge again (each ends, leaves the view or returns earlier)
            splits = sum(1 for n in v["nodes"] if n[1] == typ and len(outs.get(n[0], [])) > 1 and not n[6].get("nojoin"))
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
        for q, outs in st["gates"] + st.get("card_gates", []):
            if not q.endswith("?") or len(outs) < 2 or any(not o or not c for o, c in outs): ERR.append(f"stage {st['n']}: decision '{q}' needs a question and labelled outcomes")
        if st["runs"] and st["runs"][0] not in ("Runs", "Side by side", "Waits for", "Per filing"): ERR.append(f"stage {st['n']}: unknown runs label {st['runs'][0]}")
    for k in ACTOR:
        if k not in D.ACTOR_ROLE: ERR.append(f"actor {k} has no side and product role")
    for st in D.JOURNEY + D.JOURNEY_DOORS:
        pn = PN.STAGE.get(st["n"])
        if not pn or not pn.get("purpose") or not pn.get("story"): ERR.append(f"stage {st['n']}: panel needs its purpose and who-does-what story"); continue
        for k, w, r in pn["story"]:
            if k not in ACTOR or not w.strip() or not r.strip(): ERR.append(f"stage {st['n']}: story row needs an actor, what happens and its result")
        if st in D.JOURNEY_DOORS and not pn.get("next"): ERR.append(f"way in {st['n']}: no next step")
        for c, t in pn.get("links", []):
            if c[3:] not in STAGE: ERR.append(f"stage {st['n']}: link to unknown {c}")
    g3 = STAGE["3"]["gates"][0][1]
    if not any(o == "No" and "decide" in c and "stage 2" not in c for o, c in g3): ERR.append("stage 3: items to decide must reach the reviewer, not go back to drafting")
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
    check_panels(out)
    return plain

def templates(out):
    return dict(re.findall(r"<template id='tpl-([^']+)'>(.*?)</template>", out, flags=re.S))

def text_of(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()

def check_panels(out):
    T = templates(out)
    for k, h in T.items():
        depth, worst = 0, 0
        for m in re.finditer(r"<(/?)details\b", h):
            depth += -1 if m.group(1) else 1; worst = max(worst, depth)
        if worst > 1: ERR.append(f"panel {k}: a disclosure inside another disclosure")
        t = text_of(h)
        for bad in ("No screen (background)", "No human action at this step", "Receiving owner", "Next owner", "N/A", "No separate example"):
            if bad in t: ERR.append(f"panel {k}: shows '{bad}'")
        if "class='ex-btn'" in h and not re.search(r"<div class='example'[^>]*>\s*<(figure|p)", h): ERR.append(f"panel {k}: an Example button with no example")
    for a in ACT:
        t = text_of(T[a]); pos = [t.find(x) for x in ("What this achieves", "Who acts", "Before it starts", "How it works", "Result and what happens next")]
        if -1 in pos or pos != sorted(pos): ERR.append(f"panel {a}: the five first-view parts are missing or out of order")
    for st in D.JOURNEY + D.JOURNEY_DOORS:
        if "Who does what, in order" not in text_of(T["st-" + st["n"]]): ERR.append(f"panel st-{st['n']}: no who-does-what story")
    for k in ("symbols", "actors"):
        if any(x in text_of(T[k]) for x in ("Starts when", "Acceptance checks", "Done when")): ERR.append(f"panel {k}: a reference panel carries activity fields")
    # one wording for who submits and who pays (team: the submit permission; the fee is paid by the client or by the firm for them)
    plain = text_of(re.sub(r"<script.*?</script>", " ", out, flags=re.S))
    for bad in ("submits and pays", "arranges payment", "approves, submits and pays"):
        if bad in plain: ERR.append(f"payment wording: '{bad}' on the page")
    for k in ("9.5", "st-8", "actors"):
        if "on the client's behalf" not in text_of(T[k]): ERR.append(f"panel {k}: fee payer not stated as the client or the firm on the client's behalf")

def preservation(out):
    """Every original string of every panel is shown word for word, or has a recorded disposition. Writes the ledger."""
    T = templates(out); rows, shown, errs = [], 0, []
    n = lambda x: re.sub(r"\s+", " ", x).strip()
    def blk_strings(blocks):
        for b in blocks:
            b = J_BLOCKS.get(b, b) if isinstance(b, str) else b
            if b[0] == "table": yield b[1]; yield from b[2]; yield from (c for r in b[3] for c in r)
            elif b[0] == "flow": yield b[1]; yield from b[2]
            elif b[0] == "exception": yield b[1]
    def judge(item, field, val, page, first, ret=None):
        nonlocal shown
        if not str(val).strip(): return
        if n(val) in page: shown += 1; return
        if (item, field) in PN.CHANGED: d, why = PN.CHANGED[(item, field)]
        elif field == "exception" and ret and dup(val, ret): d, why = "merged", "Same route as the 'If not' line, which is shown: " + ret
        elif field in ("human", "io1", "does", "who") and covered(val, first): d, why = "merged", "Its content words are in the first view (what this achieves, who acts, how it works or the story)."
        else: errs.append(f"panel {item}: '{val[:70]}' ({field}) is neither shown nor dispositioned"); return
        rows.append((item, field, val, d, why))
    for a, act in ACT.items():
        page = n(text_of(T[a])); first = text_of(T[a].split("<div class='supw'>")[0])
        for f, v in [("title", act["title"]), ("io0", act["io"][0]), ("io1", act["io"][1]), ("io2", act["io"][2]), ("io3", act["io"][3]), ("human", act["human"] or ""),
                     ("trigger", act["trigger"]), ("prereq", act["prereq"]), ("authority", act["authority"]), ("ready", act["ready"]), ("ret", act["ret"]),
                     ("transfer", act["transfer"]), ("receiving", act["receiving"]), ("screen", act["screen"]), ("mi", act["mi"] or ""), ("no_example", act["no_example"] or "")] + \
                    [("accept", x) for x in act["accept"]] + [("action", x) for x in act["actions"]] + [("rule", r[2:] if r[1:2] == "|" else r) for r in act["rules"]] + \
                    [("exception", x) for x in act["exceptions"]] + [("trace", x) for t in act["traces"] for x in t] + [("example", x) for x in blk_strings(act["example"] or [])] + \
                    [("build gap", x) for g, ref, acts in D.BUILD_GAPS if a in [y.strip() for y in acts.split("·")] for x in (g, ref)]:
            judge(a, f, v, page, first, act["ret"])
    for st in D.JOURNEY + D.JOURNEY_DOORS:
        k = "st-" + st["n"]; page = n(text_of(T[k])); first = text_of(T[k].split("<div class='supw'>")[0])
        for f, v in [("title", st["title"]), ("receives", st.get("receives", "")), ("does", st.get("does", "")), ("produces", st.get("produces", "")), ("to", st.get("to", ""))] + \
                    [("before", x) for x in st["before"]] + [("rule", r[2:] if r[1:2] == "|" else r) for r in j_rules(st)] + [("exception", x) for x in st["exceptions"]] + \
                    [("pointer", x) for x in st["pointers"]] + [("decision", x) for q, o in st["gates"] for x in [q] + [y for p_ in o for y in p_]] + \
                    [("runs", x) for x in (st["runs"] or [])] + [("who", v) for _, v in st["who"]] + [("example", x) for x in blk_strings(st["example"])]:
            judge(k, f, v, page, first)
    from collections import Counter
    c = Counter(d for *_, d, _ in rows)
    L = ["# One-pager detail panels: content-preservation record", "",
         "18 October 2026 · generated by `tools/s3/build_one_pager.py` at every build. Previous version archived whole as `archive/ai-workers/*-v3-draft3-final-2026-10-18.*`.", "",
         f"Every original string of the {len(ACT)} activity panels and {len(D.JOURNEY) + len(D.JOURNEY_DOORS)} stage panels (title, input, action, output, receiver, person line, start condition, prerequisite, authority, done-when, return route, record handed over, receiving condition, screen, acceptance, steps, rules, exceptions, traces, build gaps, examples, decisions, pointers) was checked against the built panel.",
         f"**{shown} shown word for word.** {len(rows)} not shown word for word: merged {c['merged']}, clarified {c['clarified']}. None removed. The build fails if any string is neither shown nor listed here.", "",
         "'Merged' means the panel carries the same content in another place (named); 'clarified' means it was reworded for the reason given. The automatic 'merged' test (at least 80% of the content words appear in the panel's first view, or an exception repeats the shown 'If not' route) is coverage evidence, not proof of equal meaning; each such row was read by the Lead.", "",
         "| Panel | Field | Original | Disposition | Where it is now, and why |", "|---|---|---|---|---|"]
    L += [f"| {i} | {f} | {v.replace('|', '/')} | {d} | {w.replace('|', '/')} |" for i, f, v, d, w in rows]
    with open(os.path.join(ROOT, "checks", "one-pager-detail-panels-preservation-2026-10-18.md"), "w") as fh: fh.write("\n".join(L) + "\n")
    return errs, shown, rows

if __name__ == "__main__":
    out, geos = build()
    plain = checks(out, geos)
    try:
        import s3_ledger
        ERR.extend(s3_ledger.run())
    except ImportError:
        ERR.append("ledger module missing")
    perr, pshown, prows = preservation(out)
    ERR.extend(perr)
    print(f"panel preservation: {pshown} strings shown word for word; {len(prows)} merged or clarified, each listed")
    nacts = len(ACT); nrules = sum(len(a["rules"]) for a in ACT.values())
    print(f"wrote {os.path.relpath(OUT, ROOT)} ({len(out)//1024} KB · {nacts} activities · {nrules} rules · "
          f"views " + ", ".join(f"{v['id']} {geos[v['id']]['W']}×{geos[v['id']]['H']}" for v in [V.OVERVIEW] + V.VIEWS) + ")")
    if ERR:
        print("CHECKS FAILED:"); [print("  - " + e) for e in ERR]; sys.exit(1)
    print("structural checks: all passed")
