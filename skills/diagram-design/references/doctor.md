# Environment doctor

Load this file when the user asks to run diagnostics, health checks, or first-run troubleshooting, or when they invoke `/diagram-design:doctor` or `/doctor`.

The goal is a one-shot report that checks local readiness for Diagram Design import/export and command routing, without mutating user files or installing dependencies.

Resolve the Diagram Design installation from this loaded reference, not from the
user's current working directory. A normal project directory is the expected
place to invoke the doctor and must not be treated as a repository-path error.

Use two diagnostic modes:

- **Installed-skill mode** (default): check the runtime and the resolved skill
  installation. Do not require maintainer-only repository files.
- **Maintainer-checkout mode**: use this only when the resolved installation
  root contains `plugin.json` and `skills/diagram-design/SKILL.md` — i.e., it
  is a checkout of this repository rather than an installed skill. Add the
  repository integrity checks below.
  Note: the repository-level gate scripts referenced by older docs
  (`verify-geometry.py`, `verify-motion.py`, `lint-skin.py`,
  `verify-drawio-import.py`, `verify-mermaid-import.py`, `verify-docs-sync.py`,
  `verify-plugin-package.py`, `test-verify-*.py`) are **not shipped in this
  repository**. Never require them; `scripts/self_check.py` is the only shipped
  verifier.

## Inputs

Optional flags:

- `--strict` — treat warnings as failures in the final summary.
- `--json` — print a machine-readable JSON report in addition to human summary.

If no flags are provided, run in standard mode.

## Required checks

Run all checks in this order and report each as `pass`, `warn`, or `fail`.

1. Python runtime
- Resolve `python3` first, then `python`.
- Require version >= 3.10.
- `fail` if no Python interpreter is found.
- `fail` if version is below 3.10.

2. Playwright availability for PNG export
- Check whether Playwright import works in the active Python interpreter (`import playwright`).
- Check whether Chromium is installed for Playwright (`playwright install --help` availability is sufficient for command presence; prefer also checking browser cache when practical).
- If missing, mark `warn` and print exact setup hint:
  - `pip install playwright && playwright install chromium`
- Never auto-install dependencies.

3. Shipped script presence
- Verify the scripts that ship with the skill exist beneath the resolved skill
  directory (`skills/diagram-design/` in a maintainer checkout, the skill root
  when installed):
  - `scripts/self_check.py`
  - `scripts/drawio_extract.py`
  - `scripts/mermaid_extract.py`
  - `scripts/fixtures/sample-flowchart.mmd`
  - `scripts/fixtures/sample-architecture.drawio`
- Missing shipped files are `fail`.
- The repository-level gate scripts (`verify-*.py`, `lint-skin.py`) are not
  shipped in this distribution; do not look for them and do not warn about
  their absence.

4. Plugin wiring surfaces (maintainer-checkout mode only)
- Verify Claude command files exist and point to their references:
  - `commands/export-diagram.md` -> `references/export.md`
  - `commands/import-drawio.md` -> `references/import-drawio.md`
  - `commands/import-mermaid.md` -> `references/import-mermaid.md`
  - `commands/profile.md` -> `references/profiles.md`
  - `commands/doctor.md` -> `references/doctor.md`
- Verify Pi prompt files exist and point to their references:
  - `prompts/export-diagram.md` -> `references/export.md`
  - `prompts/import-mermaid.md` -> `references/import-mermaid.md`
  - `prompts/profile.md` -> `references/profiles.md`
  - `prompts/doctor.md` -> `references/doctor.md`
- Missing files are `fail`.
- Mismatched reference routing is `fail`.
- In installed-skill mode, report that maintainer command/prompt wiring is not
  applicable; partial or absent repository routing trees are not failures.

5. Common path mistakes
- Verify `SKILL.md` beneath the resolved installation root. Do not search for it
  relative to the user's current project and do not instruct users to enter the
  maintainer repository.
- Detect Windows path quoting risk when paths contain spaces and the provided command examples omit quotes.
- Detect references to local installed skill paths that do not exist (if command output includes one).
- Mark these as `warn` with a precise fix suggestion.
- A missing resolved `SKILL.md` should suggest reinstalling or updating Diagram
  Design, not changing into a repository checkout.

## Output contract

Always print:

1. A compact summary line:
- `Doctor summary: <PASS|WARN|FAIL> (<pass_count> pass, <warn_count> warn, <fail_count> fail)`

2. A checklist with one line per check:
- `[PASS] Python 3.11.9 found at ...`
- `[WARN] Playwright not installed ...`
- `[FAIL] Missing scripts/self_check.py`

3. A `Next actions` section only when warn/fail exists.

4. If `--json` is present, append JSON object with:
- `status`, `counts`, `checks[]` (`name`, `status`, `message`, `fix` optional), `timestamp`.

## Safety and behavior rules

- Read-only diagnostics only: do not modify files, do not install packages, do not run destructive git commands.
- If any command fails unexpectedly, capture stderr and continue remaining checks.
- Never claim a check passed unless verified directly in this run.
- Prefer explicit, copy-pastable remediation commands.

## Example result

```text
Doctor summary: WARN (6 pass, 2 warn, 0 fail)
[PASS] Python 3.11.9 found at /usr/bin/python3
[WARN] Playwright package not found in active interpreter
[PASS] scripts/self_check.py present (shipped verifier)
...

Next actions
- Install PNG export dependencies: pip install playwright && playwright install chromium
- Re-run: /diagram-design:doctor --strict
```
