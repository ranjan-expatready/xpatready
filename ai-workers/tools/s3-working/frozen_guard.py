"""Write guard for the prototype working edition (AIW-D246 (2), D256 baseline B0).

The working builder may write only inside the paths in ALLOWED. Anything under a frozen path (the accepted
draft 4.3 page, the original authoring home tools/s3/, its generated records, and every archive) is refused, even
when the target sits inside an allowed folder by way of a symlink. Usage: guarded_write(path, text)."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
AW = os.path.abspath(os.path.join(HERE, "..", ".."))           # ai-workers/
PROJECT = os.path.dirname(AW)
P1 = os.path.join(AW, "problem-1-pathway-setup-and-form-filling")

FROZEN = [
    os.path.join(P1, "solution-1-one-pager.html"),               # accepted draft 4.3 (AIW-D249)
    os.path.join(AW, "tools", "s3") + os.sep,                     # original authoring home, builder, checks, publish copy
    os.path.join(PROJECT, "archive") + os.sep,                    # B0 and every other archive
]
FROZEN_PREFIX_FILES = [os.path.join(AW, "checks", "one-pager-")]  # draft 4.x ledgers, preservation records, check outputs
ALLOWED = [
    os.path.join(P1, "solution-1-one-pager-working.html"),
    os.path.join(AW, "checks", "working-edition") + os.sep,
]


class FrozenWriteError(RuntimeError):
    pass


def check(path):
    real = os.path.realpath(os.path.abspath(path))
    for f in FROZEN:
        if real == os.path.realpath(f.rstrip(os.sep)) or (f.endswith(os.sep) and real.startswith(os.path.realpath(f.rstrip(os.sep)) + os.sep)):
            raise FrozenWriteError(f"refused: {real} is frozen ({f})")
    for p in FROZEN_PREFIX_FILES:
        if real.startswith(os.path.realpath(os.path.dirname(p)) + os.sep + os.path.basename(p)):
            raise FrozenWriteError(f"refused: {real} is a frozen draft 4.x record")
    if not any(real == os.path.realpath(a) or (a.endswith(os.sep) and real.startswith(os.path.realpath(a.rstrip(os.sep)) + os.sep)) for a in ALLOWED):
        raise FrozenWriteError(f"refused: {real} is outside the working edition's allowed outputs")
    return real


def guarded_write(path, text):
    real = check(path)
    os.makedirs(os.path.dirname(real), exist_ok=True)
    with open(real, "w") as fh:
        fh.write(text)
    return real
