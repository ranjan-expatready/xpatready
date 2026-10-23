"""Decode IRCC 2D barcodes (PDF417) from page images captured in Adobe, without extra image
libraries: macOS `sips` converts each image to BMP, Python reads the pixels, zxing-cpp decodes.
  .tools/solution-1-prototype/.venv/bin/python -I .../p1/decode_barcodes.py <image> [<image> ...]
Prints one JSON line per image: format, text length, text.
"""
import json
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

import zxingcpp


def gray_pixels(path):
    bmp = Path(tempfile.mkdtemp()) / "img.bmp"
    subprocess.run(["sips", "-s", "format", "bmp", str(path), "--out", str(bmp)], check=True, capture_output=True)
    b = bmp.read_bytes()
    off = struct.unpack_from("<I", b, 10)[0]
    w, h = struct.unpack_from("<ii", b, 18)
    bpp = struct.unpack_from("<H", b, 28)[0]
    step = bpp // 8
    row = (w * step + 3) & ~3
    top_down = h < 0
    h = abs(h)
    out = bytearray(w * h)
    for y in range(h):
        src = off + (y if top_down else h - 1 - y) * row
        for x in range(w):
            px = src + x * step
            bb, g, r = b[px], b[px + 1], b[px + 2]
            out[y * w + x] = (r * 299 + g * 587 + bb * 114) // 1000
    return memoryview(bytes(out)).cast("B", (h, w)), w, h


for p in sys.argv[1:]:
    img, w, h = gray_pixels(p)
    res = zxingcpp.read_barcodes(img, formats=zxingcpp.BarcodeFormat.PDF417)
    print(json.dumps({"image": Path(p).name, "size": [w, h], "found": len(res),
                      "results": [{"format": str(r.format), "length": len(r.text), "text": r.text} for r in res]}))
