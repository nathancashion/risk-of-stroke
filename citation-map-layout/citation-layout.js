/*!
 * citation-layout.js
 *
 * Crossing-free lane layout for a citation timeline: one axis is time
 * (publication year), the other is "lanes", and every paper gets a lane of
 * its own. No dependencies; works in the browser (window.CitationLayout)
 * and in Node (require("./citation-layout.js")).
 *
 * How it works, in one paragraph:
 *   A cited source sits first in a block of lanes, and the papers citing it
 *   fill the lanes right after it (each followed by its own citers). Every
 *   citation line runs along the citing paper's OWN lane back to the cited
 *   year, then turns once and runs across lanes into the source. That run
 *   across lanes only passes through the source's own block, where every
 *   paper is newer than the source, so nothing is in its way. This alone
 *   makes papers that cite one source crossing-free. A paper citing several
 *   sources can only sit in one block, so a small search picks its block and
 *   the order of siblings and trees: fewest crossings first, then keeping
 *   same-group papers together, then year order, then shorter lines.
 *
 * API
 *   computeLanes({ nodes, edges, groupOf, treeGap })   -> { lanes, laneCount, crossings }
 *   countCrossings({ nodes, edges, lanes })            -> number
 *   routeEdge(sp, tp, { horizontal, cornerRadius })    -> SVG path "d"
 *   labelPlacement({ horizontal, newestFirst, gap })   -> { transform, anchor }
 *   labelRoom(items, gap)                              -> px to reserve past the newest year
 *   checkLayout(options)                               -> { ok, ...issue lists } (browser only)
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CitationLayout = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const ROOT = "\u0000root";
  const between = (v, a, b) => v > Math.min(a, b) + 1e-6 && v < Math.max(a, b) - 1e-6;

  // Keep only edges whose both ends exist, and drop self-citations.
  function liveEdges(nodes, edges) {
    const ids = new Set(nodes.map(n => n.id));
    return edges.filter(e => ids.has(e.source) && ids.has(e.target) && e.source !== e.target);
  }

  /**
   * Count crossings for a lane assignment under lane-first routing: each line
   * runs along the citing lane (citing year -> cited year), then across lanes
   * at the cited year.
   * Counts: a lane run cutting through another line's run across lanes; two
   * different sources' runs across lanes lying on top of each other (same
   * year, overlapping lanes); and a run across lanes passing through the dot
   * of a paper it doesn't belong to.
   */
  function countCrossings({ nodes, edges, lanes }) {
    const year = Object.fromEntries(nodes.map(n => [n.id, n.year]));
    const segs = liveEdges(nodes, edges).map(e => ({
      src: e.source, tgt: e.target,
      sl: lanes[e.source], tl: lanes[e.target],
      sy: year[e.source], ty: year[e.target]
    }));
    let n = 0;
    for (const a of segs) {
      for (const b of segs) {
        if (a === b) continue;
        if (between(a.sl, b.sl, b.tl) && between(b.ty, a.ty, a.sy)) n++;
        if (a.tgt < b.tgt && a.ty === b.ty &&
            Math.min(Math.max(a.sl, a.tl), Math.max(b.sl, b.tl)) >
            Math.max(Math.min(a.sl, a.tl), Math.min(b.sl, b.tl)) + 1e-6) n++;
      }
      for (const m of nodes) {
        if (m.year === a.ty && m.id !== a.tgt && m.id !== a.src && between(lanes[m.id], a.sl, a.tl)) n++;
      }
    }
    return n;
  }

  /**
   * Give every paper its own lane, ordered so citation lines don't cross.
   *
   * @param {Object}   o
   * @param {Array<{id:string, year:number}>} o.nodes
   * @param {Array<{source:string, target:string}>} o.edges
   *        "source cites target". A paper's FIRST edge in this list is its
   *        main citation and decides its starting block.
   * @param {(id:string)=>string} [o.groupOf]
   *        Optional grouping (e.g. how the chain ends). Papers in the same
   *        group are kept in one unbroken run of lanes where possible, so a
   *        bracket per group never overlaps another.
   * @param {number}   [o.treeGap=1]   extra lanes between unconnected trees
   * @param {number}   [o.maxPermute=7] sibling lists up to this size are
   *        searched exhaustively (7! = 5040 orders); larger ones start in year
   *        order and improve by moving one sibling at a time
   * @param {number}   [o.passes=5]    search passes (it usually settles in 2-3)
   * @returns {{lanes:Object<string,number>, laneCount:number, crossings:number}}
   *        Lane numbers start at 0 and can be fractional at tree gaps. Map
   *        them to pixels with lane / (laneCount - 1) across the lane axis.
   */
  function computeLanes({ nodes, edges, groupOf = () => "", treeGap = 1, maxPermute = 7, passes = 5 }) {
    const byId = new Map(nodes.map(n => [n.id, n]));
    const live = liveEdges(nodes, edges);
    const parents = {}, children = {};
    live.forEach(e => {
      (parents[e.source] = parents[e.source] || []).push(e.target);
      (children[e.target] = children[e.target] || []).push(e.source);
    });
    const group = Object.fromEntries(nodes.map(n => [n.id, groupOf(n.id)]));
    const byYear = (a, b) => byId.get(a).year - byId.get(b).year || (a < b ? -1 : 1);

    // Tree: each paper hangs under one source (its main citation to start).
    const treeParent = {};
    const ancestorOf = (p, id) => { for (let x = p; x !== ROOT; x = treeParent[x]) if (x === id) return true; return false; };
    nodes.forEach(n => { treeParent[n.id] = ROOT; });
    nodes.forEach(n => {
      const p = (parents[n.id] || [])[0];
      if (p !== undefined && !ancestorOf(p, n.id)) treeParent[n.id] = p;   // never let a citation loop form a cycle
    });
    const kids = {};
    nodes.forEach(n => (kids[treeParent[n.id]] = kids[treeParent[n.id]] || []).push(n.id));
    Object.values(kids).forEach(list => list.sort(byYear));

    // Connected components (direction ignored): the tree gap only goes
    // where nothing at all links two trees.
    const comp = {};
    nodes.forEach(n => {
      if (comp[n.id] !== undefined) return;
      const stack = [n.id];
      while (stack.length) {
        const id = stack.pop();
        if (comp[id] !== undefined) continue;
        comp[id] = n.id;
        (parents[id] || []).forEach(p => stack.push(p));
        (children[id] || []).forEach(c => stack.push(c));
      }
    });

    function place() {
      const lanes = {};
      let next = 0;
      const visit = id => { lanes[id] = next++; (kids[id] || []).forEach(visit); };
      (kids[ROOT] || []).forEach((id, i, roots) => {
        if (i && comp[id] !== comp[roots[i - 1]]) next += treeGap;
        visit(id);
      });
      return { lanes, laneCount: next };
    }

    function cost() {
      const { lanes } = place();
      let inversions = 0, rootInversions = 0, length = 0, breaks = 0;
      Object.entries(kids).forEach(([p, list]) => {
        for (let i = 0; i < list.length; i++)
          for (let j = i + 1; j < list.length; j++)
            if (byId.get(list[i]).year > byId.get(list[j]).year) p === ROOT ? rootInversions++ : inversions++;
      });
      live.forEach(e => { length += Math.abs(lanes[e.source] - lanes[e.target]); });
      const order = nodes.map(n => n.id).sort((a, b) => lanes[a] - lanes[b]);
      order.forEach((id, i) => { if (i && group[id] !== group[order[i - 1]]) breaks++; });
      return countCrossings({ nodes, edges: live, lanes }) * 1000 + breaks * 200 + inversions * 20 + length + rootInversions * 0.5;
    }

    function* permutations(list) {
      if (list.length <= 1) { yield list.slice(); return; }
      for (let i = 0; i < list.length; i++) {
        const rest = list.slice(0, i).concat(list.slice(i + 1));
        for (const p of permutations(rest)) yield [list[i], ...p];
      }
    }

    let best = cost();
    for (let pass = 0; pass < passes; pass++) {
      let improved = false;

      // Which block should a multi-citation paper live in?
      nodes.forEach(n => {
        (parents[n.id] || []).forEach(p => {
          const prev = treeParent[n.id];
          if (p === prev || ancestorOf(p, n.id)) return;
          const prevKids = kids[prev].slice(), nextKids = (kids[p] || []).slice();
          kids[prev].splice(kids[prev].indexOf(n.id), 1);
          treeParent[n.id] = p;
          (kids[p] = kids[p] || []).push(n.id);
          kids[p].sort(byYear);
          const c = cost();
          if (c < best) { best = c; improved = true; }
          else { treeParent[n.id] = prev; kids[prev] = prevKids; kids[p] = nextKids; }
        });
      });

      // Order of siblings within each block, and of the trees themselves.
      Object.keys(kids).forEach(p => {
        const list = kids[p];
        if (list.length < 2) return;
        if (list.length > maxPermute) {
          // Too many to try every order: from year order, keep moving one
          // sibling to whichever position lowers the cost, until none does.
          let moved = true;
          while (moved) {
            moved = false;
            for (let i = 0; i < list.length; i++) {
              for (let j = 0; j < list.length; j++) {
                if (i === j) continue;
                const cur = kids[p], trial = cur.slice();
                trial.splice(j, 0, trial.splice(i, 1)[0]);
                kids[p] = trial;
                const c = cost();
                if (c < best) { best = c; improved = true; moved = true; }
                else kids[p] = cur;
              }
            }
          }
          return;
        }
        let bestOrder = list.slice();
        for (const perm of permutations(list)) {
          kids[p] = perm;
          const c = cost();
          if (c < best) { best = c; bestOrder = perm; improved = true; }
        }
        kids[p] = bestOrder;
      });

      if (!improved) break;
    }

    const { lanes, laneCount } = place();
    return { lanes, laneCount, crossings: countCrossings({ nodes, edges: live, lanes }) };
  }

  /**
   * Path for one citation: along the citing paper's lane to the cited year,
   * one rounded corner, then across lanes into the cited paper.
   * sp / tp are the citing and cited papers' {x, y} in pixels.
   * horizontal: true when time runs along x (lanes along y).
   * Never route across first: that runs through other papers' lanes.
   */
  function routeEdge(sp, tp, { horizontal, cornerRadius = 12 } = {}) {
    const L = p => horizontal ? p.y : p.x, T = p => horizontal ? p.x : p.y;
    const P = (l, t) => horizontal ? `${t},${l}` : `${l},${t}`;
    const sL = L(sp), sT = T(sp), tL = L(tp), tT = T(tp);
    if (Math.abs(tL - sL) < 1 || Math.abs(tT - sT) < 1) return `M${P(sL, sT)} L${P(tL, tT)}`;
    const gL = Math.sign(tL - sL), gT = Math.sign(tT - sT);
    const r = Math.min(cornerRadius, Math.abs(tL - sL) / 2, Math.abs(tT - sT) / 2);
    return `M${P(sL, sT)} L${P(sL, tT - gT * r)} Q${P(sL, tT)} ${P(sL + gL * r, tT)} L${P(tL, tT)}`;
  }

  /**
   * Where a paper's label goes: in its own lane, on the side facing NEWER
   * years. Lines only ever head back towards older years, so nothing else is
   * drawn there. Assumes the time axis increases to the right / downwards
   * unless newestFirst is true.
   * Returns an SVG transform (relative to the dot) and a text-anchor.
   */
  function labelPlacement({ horizontal, newestFirst, gap = 14 }) {
    const s = newestFirst ? -1 : 1;
    return horizontal
      ? { transform: `translate(${s * gap},0)`, anchor: s > 0 ? "start" : "end" }
      : { transform: `translate(0,${s * gap}) rotate(-90)`, anchor: s > 0 ? "end" : "start" };
  }

  /**
   * How much room to leave past the newest year so no label is cut off.
   * items: [{ width, distance }] where width is the label's pixel width and
   * distance is how far (px) the paper sits from the newest year's position.
   */
  function labelRoom(items, gap = 14, pad = 12) {
    return Math.max(0, ...items.map(i => i.width + gap - i.distance)) + pad;
  }

  /**
   * Check the drawn map in the browser. Everything is measured in screen
   * pixels, so zoom and transforms don't matter. A good layout returns
   * ok: true with every list empty.
   */
  function checkLayout({
    nodeSelector = ".node",
    dotSelector = "circle:not(.hit)",
    edgeSelector = "path.edge",
    labelSelector = ".node-label",
    nodeId = el => el.dataset.id,
    edgeEnds = el => [el.dataset.source, el.dataset.target],
    container = null,
    step = 2
  } = {}) {
    const scope = container || document;
    const visible = el => {
      if (getComputedStyle(el).visibility === "hidden" || getComputedStyle(el).display === "none") return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 || r.height > 0;
    };
    const dots = [...scope.querySelectorAll(nodeSelector)].map(n => {
      const c = n.querySelector(dotSelector);
      const r = c.getBoundingClientRect();
      return { id: nodeId(n), x: r.x + r.width / 2, y: r.y + r.height / 2, r: r.width / 2 };
    });
    const pts = [];
    scope.querySelectorAll(edgeSelector).forEach(p => {
      const [s, t] = edgeEnds(p);
      const m = p.getScreenCTM();
      const len = p.getTotalLength();
      for (let d = 0; d <= len; d += step) {
        const q = p.getPointAtLength(d);
        pts.push({ x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f, s, t });
      }
    });
    const labels = [...scope.querySelectorAll(labelSelector)].filter(visible)
      .map(l => ({ id: nodeId(l.closest(nodeSelector)), b: l.getBoundingClientRect() }));
    const svgBox = (scope.querySelector(nodeSelector) || {}).ownerSVGElement?.getBoundingClientRect();

    const out = { linesThroughDots: [], overlappingDots: [], overlappingLabels: [], linesThroughLabels: [], labelsOnDots: [], labelsCutOff: [] };
    dots.forEach(d => {
      const hit = pts.find(p => Math.hypot(p.x - d.x, p.y - d.y) < d.r && p.s !== d.id && p.t !== d.id);
      if (hit) out.linesThroughDots.push(`${d.id} (line ${hit.s} -> ${hit.t})`);
    });
    for (let i = 0; i < dots.length; i++)
      for (let j = i + 1; j < dots.length; j++)
        if (Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y) < dots[i].r + dots[j].r) out.overlappingDots.push(`${dots[i].id} / ${dots[j].id}`);
    for (let i = 0; i < labels.length; i++)
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i].b, b = labels[j].b;
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.overlappingLabels.push(`${labels[i].id} / ${labels[j].id}`);
      }
    labels.forEach(({ id, b }) => {
      const hit = pts.find(p => p.x > b.left + 1 && p.x < b.right - 1 && p.y > b.top + 2 && p.y < b.bottom - 2);
      if (hit) out.linesThroughLabels.push(`${id} (line ${hit.s} -> ${hit.t})`);
      dots.forEach(d => {
        if (d.id !== id && d.x > b.left - d.r && d.x < b.right + d.r && d.y > b.top - d.r && d.y < b.bottom + d.r) out.labelsOnDots.push(`${id} on ${d.id}`);
      });
      if (svgBox && (b.left < svgBox.left - 1 || b.top < svgBox.top - 1 || b.right > svgBox.right + 1 || b.bottom > svgBox.bottom + 1)) out.labelsCutOff.push(id);
    });
    out.ok = Object.values(out).every(v => !v.length);
    return out;
  }

  return { computeLanes, countCrossings, routeEdge, labelPlacement, labelRoom, checkLayout };
});
