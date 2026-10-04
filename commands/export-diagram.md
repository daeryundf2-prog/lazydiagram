---
description: Export a generated diagram HTML file to standalone .svg and/or .png
argument-hint: <html-file> [scale]
---

Thin wrapper over the export reference. Load `skills/diagram-design/references/export.md` and follow its procedure exactly for the file given as `$ARGUMENTS`: extract the `<svg>` for `.svg` output, or rasterize it with Playwright for `.png` output. Export is diagram-only (the `<svg>` node — no cards or headers) and manual-only — never run unprompted.
