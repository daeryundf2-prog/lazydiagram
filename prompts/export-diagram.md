Export a generated diagram HTML file to standalone `.svg` and/or `.png`.

Thin wrapper over the export reference. Load `skills/diagram-design/references/export.md` and follow its procedure exactly: extract the `<svg>` for `.svg` output, or rasterize it with Playwright for `.png` output. Export is diagram-only (the `<svg>` node — no cards or headers) and manual-only — never run unprompted.

Input: path to the source `.html` file, plus an optional scale (1–3, default 2).
