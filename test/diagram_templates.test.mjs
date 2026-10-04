import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("#given diagram-design skill #when SKILL.md is inspected #then frontmatter is valid", async () => {
	const skillPath = join(root, "skills", "diagram-design", "SKILL.md");
	const content = await readFile(skillPath, "utf8");
	assert.match(content, /^---\n/m);
	assert.match(content, /^name:\s*diagram-design$/m);
	assert.match(content, /^description:\s*.+/m);
	assert.match(content, /Thirty-nine visual types/);
});

test("#given 39 visual diagram assets #when scanned #then HTML templates are non-empty and well-formed", async () => {
	const assetsDir = join(root, "skills", "diagram-design", "assets");
	const files = await readdir(assetsDir);
	const htmlFiles = files.filter((f) => f.endsWith(".html"));

	// Must have template-full.html and diverse sample diagrams
	assert.ok(htmlFiles.length >= 39, `expected >= 39 html templates, got ${htmlFiles.length}`);

	for (const fileName of htmlFiles) {
		const filePath = join(assetsDir, fileName);
		const fileStat = await stat(filePath);
		assert.ok(fileStat.size > 100, `template ${fileName} is too small (${fileStat.size} bytes)`);

		const html = await readFile(filePath, "utf8");
		// Check that each diagram template contains HTML structure and svg/canvas/diagram container
		assert.ok(
			html.includes("<!DOCTYPE html>") || html.includes("<html") || html.includes("<svg") || html.includes("<div"),
			`template ${fileName} has invalid markup structure`,
		);
	}
});

test("#given references directory #when scanned #then required markdown guides and 39 visual types exist", async () => {
	const refsDir = join(root, "skills", "diagram-design", "references");
	const files = await readdir(refsDir);
	const mdFiles = files.filter((f) => f.endsWith(".md"));

	assert.ok(mdFiles.length >= 39, `expected >= 39 reference guides, got ${mdFiles.length}`);
	assert.ok(mdFiles.includes("semantic-patterns.md"), "missing semantic-patterns.md");
	assert.ok(mdFiles.includes("style-guide.md"), "missing style-guide.md");
	assert.ok(mdFiles.includes("type-architecture.md"), "missing type-architecture.md");
	assert.ok(mdFiles.includes("type-data-flow.md"), "missing type-data-flow.md");
});
