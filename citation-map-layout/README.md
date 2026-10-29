# Citation map layout kit

Everything needed to keep the citation map free of crossing lines and
overlapping labels, and to let Claude maintain it without breaking that.

| File | What it is |
|---|---|
| `citation-layout.js` | The layout code: lanes, line routing, label placement, and a checker. No dependencies. Upload it next to `citation-map.html`. |
| `citation-map.html` | Your latest page (all 33 papers, your wording and controls) using the module. Drop-in replacement for the live one. |
| `SKILL.md` | Instructions for Claude: the rules, how the pieces connect, how to check the result, and the mistakes to avoid. |
| `verify-layout.js` | `node verify-layout.js citation-map.html` checks the data lays out with no crossings, without opening a browser. |

## Use it on the site

Upload `citation-layout.js` and `citation-map.html` to the same folder as the
current page. The page loads the module with
`<script src="citation-layout.js"></script>`; if you'd rather keep a single
file, paste the module's contents into a `<script>` tag in its place.

## Use it with Claude

- **Claude Code:** copy this whole folder to `.claude/skills/citation-map-layout/`
  in your project (or `~/.claude/skills/` for every project). Claude picks it
  up automatically when you work on the map.
- **Claude.ai:** zip this folder and upload it under Settings → Capabilities →
  Skills, or attach `SKILL.md` and `citation-layout.js` to the conversation.

Then start with something like:

> Read SKILL.md before touching citation-map.html. Keep one paper per lane,
> lane-first routing and labels in each paper's own lane. After any change,
> run `node verify-layout.js citation-map.html` and the checkLayout console
> check from SKILL.md, and show me both results.

## Adding papers

Add them to `nodes` (and to `extraEdges` if a paper cites more than one
source), then run `node verify-layout.js citation-map.html`. Nothing else
needs changing; the layout re-solves on every page load.
