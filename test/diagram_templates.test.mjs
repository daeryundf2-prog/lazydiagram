import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillDir = join(root, "skills", "diagram-design");

async function listMarkdown(dir) {
	try {
		return (await readdir(dir)).filter((f) => f.endsWith(".md")).map((f) => join(dir, f));
	} catch {
		return [];
	}
}

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

test("#given docs reference local paths #when each path is resolved #then every referenced file exists", async () => {
	const docs = [
		join(skillDir, "SKILL.md"),
		...(await listMarkdown(join(skillDir, "references"))),
		...(await listMarkdown(join(root, "commands"))),
		...(await listMarkdown(join(root, "prompts"))),
	];

	const missing = [];
	for (const doc of docs) {
		const content = await readFile(doc, "utf8");
		const refs = new Set();

		// Markdown links: [text](target) — relative targets only.
		for (const match of content.matchAll(/\]\(([^)\s]+)\)/g)) {
			const target = match[1].split("#")[0];
			if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("~")) continue;
			refs.add(target);
		}

		// Bare path mentions rooted at a shipped top-level directory.
		for (const match of content.matchAll(
			/(?:^|[\s(`"'])((?:assets|references|scripts|commands|prompts)\/[A-Za-z0-9_][A-Za-z0-9_.\-/]*)/g,
		)) {
			refs.add(match[1].replace(/[.,;:)\]"'`]+$/g, ""));
		}

		for (const ref of refs) {
			if (ref.includes("<") || ref.endsWith("/")) continue; // placeholders and dir mentions
			const candidates = [join(dirname(doc), ref), join(skillDir, ref), join(root, ref)];
			let found = false;
			for (const candidate of candidates) {
				try {
					await stat(candidate);
					found = true;
					break;
				} catch {
					// try next candidate base
				}
			}
			if (!found) missing.push(`${relative(root, doc)} -> ${ref}`);
		}
	}

	assert.deepEqual(missing, [], `docs reference files that do not exist:\n${missing.join("\n")}`);
});
