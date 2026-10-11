import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillDir = join(root, "skills", "diagram-design");
const script = join(skillDir, "scripts", "check_geometry.py");
const python = process.platform === "win32" ? "python" : "python3";

function run(files) {
	const r = spawnSync(python, [script, "--json", ...files], { encoding: "utf8" });
	return { status: r.status, report: r.stdout ? JSON.parse(r.stdout) : null, stderr: r.stderr };
}

function svgFile(body) {
	const dir = mkdtempSync(join(tmpdir(), "lazydiagram-geom-"));
	const file = join(dir, "d.html");
	writeFileSync(file, `<!doctype html><svg viewBox="0 0 400 300">${body}</svg>`);
	return file;
}

const NODE = `<rect x="100" y="100" width="120" height="64" rx="6" fill="#f5f5f5"/>
<rect x="100" y="100" width="120" height="64" rx="6" fill="#fff" stroke="#2d3142"/>`;

test("#given shipped example diagrams #when geometry-checked #then none violate §6 rule 6", () => {
	const assets = readdirSync(join(skillDir, "assets"))
		.filter((f) => f.startsWith("example-") && f.endsWith(".html"))
		.map((f) => join(skillDir, "assets", f));
	const { status, report, stderr } = run(assets);
	assert.equal(status, 0, stderr || JSON.stringify(report));
	const masks = Object.values(report).reduce((n, r) => n + r.masks_checked, 0);
	assert.ok(masks > 0, "checker found no label masks at all — classification is broken");
});

test("#given a mask straddling a later node #when checked #then it fails", () => {
	const file = svgFile(`<rect x="80" y="94" width="48" height="12" fill="#f5f5f5"/><text x="104" y="103">HTTPS</text>${NODE}`);
	const { status, report } = run([file]);
	assert.equal(status, 1);
	assert.equal(report[file].violations.length, 1);
});

test("#given a mask fully inside a node (badge chip) #when checked #then it passes", () => {
	const file = svgFile(`<rect x="108" y="108" width="32" height="12" fill="#f5f5f5"/><text x="124" y="117">EDGE</text>${NODE}`);
	assert.equal(run([file]).status, 0);
});

test("#given a node drawn before the mask #when they overlap #then it passes", () => {
	const file = svgFile(`${NODE}<rect x="80" y="94" width="48" height="12" fill="#f5f5f5"/><text x="104" y="103">OK</text>`);
	assert.equal(run([file]).status, 0);
});

test("#given a translated group #when the mask lands on a later node #then the offset is applied", () => {
	const file = svgFile(`<g transform="translate(70, 84)"><rect x="10" y="10" width="48" height="12" fill="#f5f5f5"/><text x="34" y="19">LBL</text></g>${NODE}`);
	assert.equal(run([file]).status, 1);
});

test("#given a translucent label rect #when it overlaps a later node #then it is not treated as a mask", () => {
	const file = svgFile(`<rect x="80" y="94" width="48" height="12" fill="rgba(0,0,0,0.1)"/><text x="104" y="103">T</text>${NODE}`);
	assert.equal(run([file]).status, 0);
});

test("#given SKILL.md #when rule 6 is described #then it points to the shipped checker", () => {
	const skill = readFileSync(join(skillDir, "SKILL.md"), "utf8");
	assert.match(skill, /scripts\/check_geometry\.py/);
	assert.doesNotMatch(skill, /No geometry verifier ships with the skill/);
});
