#!/usr/bin/env node
/*
 * verify-layout.js: check a citation map's data lays out with no crossings,
 * without opening a browser.
 *
 *   node verify-layout.js citation-map.html
 *
 * Reads the `const nodes = [...]` and `const extraEdges = [...]` blocks from
 * the page, runs the same lane layout the page uses (citation-layout.js),
 * prints the lane order, and exits with code 1 if any lines would cross.
 * Use it after adding or editing papers. For overlaps between labels, dots
 * and lines, run CitationLayout.checkLayout() in the browser as well (see
 * SKILL.md); this script only sees the data, not the drawing.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { computeLanes } = require(path.join(__dirname, "citation-layout.js"));

const file = process.argv[2];
if (!file) { console.error("Usage: node verify-layout.js <page.html>"); process.exit(2); }
const html = fs.readFileSync(file, "utf8");

// Take everything from the nodes array to the end of the data section (the
// next "// ====" divider after extraEdges) and evaluate it on its own.
const start = html.indexOf("const nodes = [");
const extra = html.indexOf("const extraEdges", start);
const end = html.indexOf("\n// ====", extra);
if (start < 0 || extra < 0 || end < 0) {
  console.error("Couldn't find `const nodes = [`, `const extraEdges` and a `// ====` divider after them.");
  process.exit(2);
}
const { nodes, extraEdges } = vm.runInNewContext(html.slice(start, end) + "\n;({ nodes, extraEdges });");

// Each paper's main citation (n.cites) first, then the extra ones.
const edges = [];
nodes.forEach(n => { if (n.cites) edges.push({ source: n.id, target: n.cites }); });
// "listed" links (named in a review table, not cited for the figure) are drawn on
// demand only and stay out of the layout.
extraEdges.forEach(e => {
  if (e.type === "listed") return;
  if (!edges.some(x => x.source === e.source && x.target === e.target)) edges.push({ source: e.source, target: e.target });
});

// Group by how each paper's chain ends: reaches original data, reaches a
// source that never states the figure, or neither.
const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
const parents = {};
edges.forEach(e => (parents[e.source] = parents[e.source] || []).push(e.target));
const reaches = (id, type, seen = new Set()) => {
  if (byId[id] && byId[id].type === type) return true;
  if (seen.has(id)) return false;
  seen.add(id);
  return (parents[id] || []).some(p => reaches(p, type, seen));
};
const outcome = id => reaches(id, "original") ? "traced" : reaches(id, "phantom") ? "phantom" : "stray";

const missing = edges.filter(e => !byId[e.source] || !byId[e.target]);
missing.forEach(e => console.warn(`warning: ${e.source} -> ${e.target} points to a paper that isn't in nodes`));
const backwards = edges.filter(e => byId[e.source] && byId[e.target] && byId[e.source].year < byId[e.target].year);
backwards.forEach(e => console.warn(`warning: ${e.source} (${byId[e.source].year}) cites a later paper ${e.target} (${byId[e.target].year})`));

const t0 = Date.now();
const { lanes, crossings } = computeLanes({ nodes, edges, groupOf: outcome });
const ms = Date.now() - t0;

console.log("lane  year  outcome   paper");
nodes.map(n => n.id).sort((a, b) => lanes[a] - lanes[b]).forEach(id => {
  console.log(`${String(lanes[id]).padStart(4)}  ${byId[id].year}  ${outcome(id).padEnd(8)}  ${id}`);
});
console.log(`\n${nodes.length} papers, ${edges.length} citations, laid out in ${ms} ms`);
console.log(crossings === 0 ? "OK: no crossing lines" : `PROBLEM: ${crossings} crossing(s)`);
process.exit(crossings === 0 ? 0 : 1);
