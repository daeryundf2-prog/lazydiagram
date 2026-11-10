# Render-check codes and repair cap

Load this file when a render or geometry check reports failures on a diagram, or when you must define what "the check passed" means for a diagram deliverable. It is a vocabulary and a repair discipline. It does not ship a renderer: use it with whatever checker is at hand (`scripts/self_check.py`, a geometry checker, or a browser render you run yourself).

<!-- Adapted from hypercore (MIT, (c) 2026 alpoxdev), skills/hyper-diagram/rules/render-and-verify.md @ 2d305cb; rewritten, see NOTICE. -->

## 1. Exit codes

Any scripted render check should end with one of four codes, so a caller can tell a bad diagram from a bad command from a missing tool:

| Exit | Meaning | Next step |
|---|---|---|
| 0 | check passed, outputs written | open the image and do the visual check (§4) |
| 1 | check failed; files written only for inspection | repair (§3) |
| 2 | usage or spec error (bad flag, missing or malformed input) | fix the command or the input, then re-run |
| 3 | blocked (no browser, missing dependency, bake or export crashed, empty canvas) | report the blocker and the unblocking step; keep the input |

Never treat exit 3 as a diagram failure and never "repair" the diagram for it.

## 2. Error codes

| Code | Meaning |
|---|---|
| `TEXT_OVERFLOW` | text runs outside its box |
| `NODE_OVERLAP` | two node boxes intersect |
| `LABEL_OVERLAP` | two edge labels intersect |
| `LABEL_OVERLAPS_NODE` | an edge label sits on a node box |
| `EDGE_CROSSES_NODE` | an edge route runs through a box it does not touch |
| `NODE_CROSSES_GROUP` | a node straddles a group border |
| `GROUP_OVERLAP` | two group frames intersect |
| `PDF_MULTIPAGE` | a one-page export spilled onto more pages |

Warnings (do not fail the run, still read them): edge crossings, text rendered too small, dense or very wide diagram.

## 3. Usual repair per code

| Code | Usual fix |
|---|---|
| `TEXT_OVERFLOW`, `NODE_OVERLAP`, `LABEL_OVERLAP`, `LABEL_OVERLAPS_NODE` | shorten the text, move detail into a secondary line, widen spacing |
| `NODE_CROSSES_GROUP`, `GROUP_OVERLAP` | fix group membership, not coordinates |
| `EDGE_CROSSES_NODE` | reorder nodes, change flow direction, or regroup |
| `PDF_MULTIPAGE` | re-run once; shrink the canvas if it repeats |
| small text, dense, wide warnings | split the diagram (see `rules/diagram-selection.md` if present in your install) or change direction |

## 4. Repair cap and meaning first

- At most three repair passes after the first render. Count a pass as one edit followed by one re-check.
- Revert any pass that raises the error count.
- Fix meaning before looks. Never drop an element or a relation only to pass a check; if one must go, say so in the closing report.
- When the cap is hit with errors left, stop and report the remaining codes instead of looping.

## 5. What the checks cannot see

After the check passes, open the rendered image yourself and confirm:

- the main path reads in one direction without zig-zag;
- each label sits beside its own edge;
- the grouping matches what the source material says;
- nothing important is tiny or cut off.
