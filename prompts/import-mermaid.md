Redraw a Mermaid `.mmd` source or fenced block as a branded editorial diagram.

Thin wrapper over the Mermaid import reference. Load `skills/diagram-design/references/import-mermaid.md` and follow it exactly: run `scripts/mermaid_extract.py` for the IR, set the four output dials, pick the target type, then redraw — never reproduce the renderer layout.

Input: path to a `.mmd`, `.mermaid`, or Markdown file containing a fenced `mermaid` block.
