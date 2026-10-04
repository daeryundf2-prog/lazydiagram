---
description: Run Diagram Design environment diagnostics (Python, Playwright, skill install)
argument-hint: [--strict] [--json]
---

Thin wrapper over the doctor reference. Load `skills/diagram-design/references/doctor.md` and run its read-only diagnostic checklist, honoring the flags given as `$ARGUMENTS` (`--strict`, `--json`). Do not modify files or install dependencies — report and suggest remediation commands only.
