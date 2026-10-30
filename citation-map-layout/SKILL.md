---
name: citation-map-layout
description: Rules and tools for laying out the riskofstroke.org citation map (citation-map.html) so lines never cross and dots, names and lines never overlap. Use whenever editing that page's layout, lanes, edge routing, labels, zoom, sort or orientation, or after adding or changing papers in its data.
---

# Citation map layout

The citation map is a timeline: one axis is publication year, the other is
**lanes**. The layout code lives in `citation-layout.js`, next to the page.
Use it; don't rewrite it inside the page. `citation-map.html` in this folder
is a working reference that uses it.

## The rules (don't break these)

1. **One paper per lane, always.** Never let two papers share a lane, even
   if they're in different years and it would save space. Shared lanes are
   what made lines run through other papers before.
2. **Papers citing a source sit right after it.** Lane order is a
   depth-first walk: source, then its citers in year order, each followed by
   its own citers. `CitationLayout.computeLanes` does this, plus a search for
   papers that cite more than one source.
3. **Route lane-first.** Every line runs along the *citing* paper's own lane
   to the cited year, turns once, then runs across lanes into the cited
   paper. Use `CitationLayout.routeEdge`. Never route "across first" and
   never add detours around dots: with rules 1–3 nothing is in the way.
4. **Labels go in the paper's own lane, on the side facing newer years.**
   Lines only ever head back towards older years, so that stretch is always
   empty. Use `CitationLayout.labelPlacement`. Never centre a label under or
   over its dot; lanes are narrower than names.
5. **Leave room for labels at the newest end of the time axis**, measured,
   not guessed: `CitationLayout.labelRoom`. With newest-first sorting that
   end is the start of the axis.
6. **Nothing is hardcoded.** No positions, lane numbers or per-paper offsets.
   Adding a paper means adding data; the layout re-solves on load.

## How the pieces connect

```js
// 1. Lanes: once, after the data and edge list are built.
//    edges must list each paper's main citation (n.cites) before its extras.
const { lanes, laneCount, crossings } = CitationLayout.computeLanes({
  nodes,                 // [{ id, year, ... }]
  edges: edgeList,       // [{ source, target }]  source cites target
  groupOf: getOutcome,   // keeps each bracket's papers in one unbroken run
  treeGap: 1             // spare lane between unconnected trees
});
// crossings must be 0. Lane numbers can be fractional at tree gaps.

// 2. Pixels: lane -> one axis, year -> the other (as the page already does).

// 3. Lines.
path.attr("d", CitationLayout.routeEdge(citingXY, citedXY, { horizontal: HORIZONTAL, cornerRadius: 12 }));

// 4. Labels: text inside each node's <g>, positioned relative to the dot.
const place = CitationLayout.labelPlacement({ horizontal: HORIZONTAL, newestFirst: REVERSED, gap: NODE_R + 8 });
label.attr("transform", place.transform).attr("text-anchor", place.anchor)
     .attr("dominant-baseline", "central");

// 5. Room past the newest year (distance = how far the paper is from it, in px).
const room = CitationLayout.labelRoom(nodes.map(n => ({ width: labelWidth(n), distance })), NODE_R + 8);
```

`labelPlacement` assumes the time axis increases to the right (horizontal) or
downwards (vertical) unless `newestFirst` is true. Measure label widths with
the real font (`600 15px "IBM Plex Sans Condensed"`) and wait for it to load
first (`document.fonts.load(...)`); the browser doesn't fetch it until asked.

## Papers that only list other papers

Some papers name other papers without citing them for the figure, for
example in a review table (Nunn et al. 2025). Add those links to
`extraEdges` with `type: "listed"`. They are left out of the lanes, the
outcome groups and the crossing count, and the page draws them as dotted
lines only while one of their two papers is hovered or selected (the card
lists them under "Also lists" / "Also listed by"). Use this when the paper's
other links would cross the layout; keep its `cites` to the source its own
figure rests on. `verify-layout.js`, `checkLayout()` and
`make_summary_charts.py` all ignore listed links.

## Checking your work (do this every time)

1. **Data check, no browser needed:**
   ```
   node verify-layout.js citation-map.html
   ```
   Prints the lane order and must end with `OK: no crossing lines`. Run it
   after any data change. It also warns about citations to missing papers and
   papers citing later ones.

2. **Drawing check, in the browser console on the page.** Runs every view
   (both orientations × both sorts × names on/off) and should print `true` for
   each:
   ```js
   for (const o of ["vertical", "horizontal"]) for (const so of ["newest", "oldest"]) for (const nm of ["show", "hide"]) {
     document.querySelector(`[data-orientation="${o}"]`).click(); await new Promise(r => setTimeout(r, 200));
     document.querySelector(`[data-sort="${so}"]`).click();       await new Promise(r => setTimeout(r, 200));
     document.querySelector(`[data-names="${nm}"]`).click();      await new Promise(r => setTimeout(r, 300));
     const res = CitationLayout.checkLayout();
     console.log(o, so, nm, res.ok, res.ok ? "" : res);
   }
   ```
   `checkLayout()` reports lines through dots, overlapping dots, overlapping
   labels, lines through labels, labels on dots and labels cut off at the
   edge. Also check `layoutStats.crossings === 0`. Don't call a layout change
   done until both checks pass.

## Mistakes that caused the earlier problems

- **"Compact" lanes** (papers in different years sharing a lane): lines run
  through other papers. Breaks rule 1.
- **Routing horizontal-then-vertical regardless of orientation**: correct on
  one view, wrong on the other, where lines stack along the cited paper's lane.
- **Detour code** (`hasIntermediateNode` and jogs around dots): a symptom of
  shared lanes. Delete it; rules 1–3 make it unnecessary.
- **Labels centred under dots**: names are wider than the lane spacing.
- **Fit-to-window zoom down to 0.12×**: everything becomes unreadable. Let
  the map scroll instead.
- **Sorting edges arbitrarily before `computeLanes`**: each paper's main
  citation must come first; it decides the paper's starting block.

## Limits (say so honestly if asked)

- Zero crossings is guaranteed for papers that cite a single source. For
  papers citing several, the search finds a crossing-free order for the
  current data, but a strange enough set of links could leave one. The page
  counts them (`layoutStats.crossings`) and `verify-layout.js` fails if any
  appear.
- Sibling lists longer than 7 papers aren't searched exhaustively (7! orders
  is the practical cap for an instant page load). They start in year order
  and improve by moving one paper at a time, which finds a crossing-free
  order in most cases but isn't guaranteed to.
- A paper citing a *later* paper (a data error) can cause a crossing;
  `verify-layout.js` warns about it.
