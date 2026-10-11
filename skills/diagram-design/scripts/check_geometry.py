#!/usr/bin/env python3
"""Check §6 rule 6 geometry in a generated diagram HTML file, with no third-party deps.

    python3 <skill-dir>/scripts/check_geometry.py my-diagram.html [--json]

Rule 6: a label mask must not partially overlap a box painted after it — the
later box covers the mask and the label renders as a fragment on the border.

A *label mask* is an opaque, stroke-less rect at most 20px tall that is
immediately followed by a <text>. A *box* is a later rect at least 24x24 that
has a stroke or an opaque fill (node underlays count). A mask fully inside the
box is a badge chip and passes. Rects under <defs>/<pattern>/<symbol>/<marker>/
<mask>/<clipPath>, and rects under any transform other than translate, are not
checked; the report counts them so a silent pass is visible.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

MASK_MAX_HEIGHT = 20.0
BOX_MIN_SIZE = 24.0
NON_RENDERED = {"defs", "pattern", "symbol", "marker", "mask", "clippath"}
TRANSLATE_RE = re.compile(r"^\s*translate\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+))?\s*\)\s*$")
RGBA_RE = re.compile(r"^(?:rgba|hsla)\(.*,\s*([\d.]+%?)\s*\)$")


def _num(value: str | None) -> float | None:
    if value is None:
        return None
    try:
        return float(value.strip().removesuffix("px"))
    except ValueError:
        return None


def _paint_opaque(value: str | None, opacity: str | None) -> bool:
    if value is None:
        return False
    v = value.strip().lower()
    if v in {"", "none", "transparent"} or v.startswith("url("):
        return False
    m = RGBA_RE.match(v)
    if m:
        alpha = m.group(1)
        a = float(alpha[:-1]) / 100 if alpha.endswith("%") else float(alpha)
        if a < 1:
            return False
    op = _num(opacity)
    return op is None or op >= 1


def _has_stroke(attrs: dict[str, str]) -> bool:
    s = attrs.get("stroke")
    return s is not None and s.strip().lower() not in {"", "none", "transparent"}


class GeometryParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.elements: list[dict] = []
        self.skipped = 0
        self._stack: list[tuple[str, float, float, bool]] = []
        self._svg_depth = 0

    def _state(self) -> tuple[float, float, bool]:
        if not self._stack:
            return 0.0, 0.0, False
        _, dx, dy, blocked = self._stack[-1]
        return dx, dy, blocked

    def _push(self, tag: str, attrs: dict[str, str]) -> None:
        dx, dy, blocked = self._state()
        if tag.lower() in NON_RENDERED:
            blocked = True
        t = attrs.get("transform")
        if t:
            m = TRANSLATE_RE.match(t)
            if m:
                dx += float(m.group(1))
                dy += float(m.group(2) or 0)
            else:
                blocked = True
        self._stack.append((tag, dx, dy, blocked))

    def _record(self, tag: str, attrs: dict[str, str]) -> None:
        if self._svg_depth == 0:
            return
        dx, dy, blocked = self._state()
        if tag == "text":
            self.elements.append({"tag": "text"})
            return
        if tag != "rect":
            self.elements.append({"tag": tag})
            return
        x, y = _num(attrs.get("x", "0")), _num(attrs.get("y", "0"))
        w, h = _num(attrs.get("width")), _num(attrs.get("height"))
        if blocked or attrs.get("transform") or None in (x, y, w, h):
            self.skipped += 1
            self.elements.append({"tag": "rect-skipped"})
            return
        self.elements.append({
            "tag": "rect",
            "x": x + dx, "y": y + dy, "w": w, "h": h,
            "opaque": _paint_opaque(attrs.get("fill"), attrs.get("fill-opacity") or attrs.get("opacity")),
            "stroke": _has_stroke(attrs),
            "line": self.getpos()[0],
        })

    def handle_starttag(self, tag: str, attrs_list) -> None:
        attrs = {k.lower(): (v or "") for k, v in attrs_list}
        if tag == "svg":
            self._svg_depth += 1
        self._record(tag, attrs)
        self._push(tag, attrs)

    def handle_startendtag(self, tag: str, attrs_list) -> None:
        attrs = {k.lower(): (v or "") for k, v in attrs_list}
        self._record(tag, attrs)

    def handle_endtag(self, tag: str) -> None:
        for i in range(len(self._stack) - 1, -1, -1):
            if self._stack[i][0] == tag:
                del self._stack[i:]
                break
        if tag == "svg" and self._svg_depth:
            self._svg_depth -= 1


def _overlap(a: dict, b: dict) -> bool:
    return (min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"]) > 0
            and min(a["y"] + a["h"], b["y"] + b["h"]) - max(a["y"], b["y"]) > 0)


def _contains(outer: dict, inner: dict) -> bool:
    return (outer["x"] <= inner["x"] and outer["y"] <= inner["y"]
            and inner["x"] + inner["w"] <= outer["x"] + outer["w"]
            and inner["y"] + inner["h"] <= outer["y"] + outer["h"])


def check(html: str) -> dict:
    parser = GeometryParser()
    parser.feed(html)
    els = parser.elements
    masks, boxes = [], []
    for i, el in enumerate(els):
        if el["tag"] != "rect":
            continue
        nxt = els[i + 1]["tag"] if i + 1 < len(els) else None
        if el["opaque"] and not el["stroke"] and el["h"] <= MASK_MAX_HEIGHT and nxt == "text":
            masks.append((i, el))
        if el["w"] >= BOX_MIN_SIZE and el["h"] >= BOX_MIN_SIZE and (el["stroke"] or el["opaque"]):
            boxes.append((i, el))

    violations = []
    for mi, mask in masks:
        for bi, box in boxes:
            if bi > mi and _overlap(mask, box) and not _contains(box, mask):
                violations.append({
                    "rule": "§6.6 label mask overlaps a later box",
                    "mask_line": mask["line"],
                    "box_line": box["line"],
                    "mask": [mask["x"], mask["y"], mask["w"], mask["h"]],
                    "box": [box["x"], box["y"], box["w"], box["h"]],
                })
                break
    return {
        "masks_checked": len(masks),
        "boxes_checked": len(boxes),
        "rects_skipped": parser.skipped,
        "violations": violations,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    failed = False
    reports = {}
    for path in args.files:
        report = check(path.read_text(encoding="utf-8"))
        reports[str(path)] = report
        failed |= bool(report["violations"])
        if not args.json:
            status = "FAIL" if report["violations"] else "PASS"
            print(f"[{status}] {path}: {report['masks_checked']} masks, "
                  f"{report['boxes_checked']} boxes, {report['rects_skipped']} rects skipped")
            for v in report["violations"]:
                print(f"  - {v['rule']}: mask line {v['mask_line']} {v['mask']} "
                      f"vs box line {v['box_line']} {v['box']}")
    if args.json:
        print(json.dumps(reports, ensure_ascii=False, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
