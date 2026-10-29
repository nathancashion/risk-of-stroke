#!/usr/bin/env python3
"""Summary bar chart of the citation map, in four aspect ratios (16:9, 4:3, 1:1, 9:16).

Counts are read from the map's own data (the `nodes` and `extraEdges` arrays in
the page), so the chart always matches the map:

  python3 make_summary_charts.py                       # reads static/citation-map.html, writes here
  python3 make_summary_charts.py --out ~/Desktop       # choose where the PNGs go
  python3 make_summary_charts.py --page path/to/citation-map.html

Needs Node (to read the page's data) and matplotlib.
"""
import argparse
import json
import os
import subprocess

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))

# Evaluates the page's data section on its own (same as citation-map-layout/verify-layout.js)
# and prints the counts the chart needs. A paper "cites Haynes directly" if any of its
# citations, main or extra, is the original source.
COUNT_JS = r'''
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[1], "utf8");
const s = html.indexOf("const nodes = ["), x = html.indexOf("const extraEdges", s), e = html.indexOf("\n// ====", x);
if (s < 0 || x < 0 || e < 0) { console.error("Couldn't find the nodes / extraEdges data in the page."); process.exit(2); }
const { nodes, extraEdges } = vm.runInNewContext(html.slice(s, e) + "\n;({ nodes, extraEdges });");
const edges = [];
nodes.forEach(n => { if (n.cites) edges.push({ source: n.id, target: n.cites }); });
extraEdges.forEach(q => edges.push({ source: q.source, target: q.target }));
const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
const parents = {};
edges.forEach(q => (parents[q.source] = parents[q.source] || []).push(q.target));
const reaches = (id, type, seen = new Set()) => {
  if (byId[id] && byId[id].type === type) return true;
  if (seen.has(id)) return false;
  seen.add(id);
  return (parents[id] || []).some(p => reaches(p, type, seen));
};
const original = nodes.filter(n => n.type === "original").map(n => n.id);
const rest = nodes.filter(n => n.type !== "original");
const traced = rest.filter(n => reaches(n.id, "original"));
const direct = traced.filter(n => (parents[n.id] || []).some(p => original.includes(p))).length;
const phantom = rest.filter(n => !reaches(n.id, "original") && reaches(n.id, "phantom")).length;
console.log(JSON.stringify({
  total: nodes.length, excl: rest.length, direct,
  intermediaries: traced.length - direct, phantom, stray: rest.length - traced.length - phantom
}));
'''


def read_counts(page):
    out = subprocess.run(['node', '--input-type=commonjs', '-e', COUNT_JS, page],
                         check=True, capture_output=True, text=True)
    return json.loads(out.stdout)


def make_charts(c, outdir):
    categories = ['Cites Haynes\ndirectly', 'Traced through\nintermediaries', 'Phantom\ncitations', 'No citation\nprovided']
    values = [c['direct'], c['intermediaries'], c['phantom'], c['stray']]
    colors = ['#1a6b3c', '#2d2d2d', '#c0392b', '#e74c3c']
    reach = c['direct'] + c['intermediaries']

    title_text = '"One in 20,000 neck adjustments leads to a stroke."\nWhere does the number lead back to?'
    footnote = (f'Of {c["total"]} papers total; Haynes (1994) is the original source, excluded from bars.\n'
                'Source: claim-specific citation tracing (cf. Greenberg 2009).')

    # Value axis leaves room above the tallest bar for its number and the bracket
    vmax = max(values)
    lim = max(16, vmax + 6)
    brace_at = vmax + 3.5

    def finish(fig, ax, title_fs, foot_fs, rect, suffix):
        ax.set_title(title_text, fontsize=title_fs, fontweight='bold', color='#1a1a1a', pad=16, loc='left')
        fig.text(0.12, 0.01, footnote, fontsize=foot_fs, color='#666666', ha='left', va='bottom')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#cccccc')
        ax.spines['bottom'].set_color('#cccccc')
        plt.tight_layout(rect=rect)
        path = os.path.join(outdir, f'citation-summary-chart-{suffix}.png')
        fig.savefig(path, dpi=200, facecolor='white', bbox_inches='tight')
        plt.close(fig)
        print('saved', path)

    def vertical(figsize, title_fs, val_fs, foot_fs, rect, suffix, tick_fs=11):
        fig, ax = plt.subplots(figsize=figsize)
        fig.patch.set_facecolor('white')
        bars = ax.bar(categories, values, width=0.55, color=colors, edgecolor='none', zorder=3)
        for bar, val in zip(bars, values):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.3, str(val),
                    ha='center', va='bottom', fontsize=val_fs, fontweight='bold', color='#1a1a1a')
        ax.set_ylabel('Number of papers', fontsize=11, color='#444444')
        ax.set_ylim(0, lim)
        ax.yaxis.set_major_locator(plt.MultipleLocator(5))
        ax.tick_params(axis='x', labelsize=tick_fs, colors='#333333')
        ax.tick_params(axis='y', labelsize=tick_fs - 1, colors='#666666')
        ax.grid(axis='y', color='#e0e0e0', linewidth=0.6, zorder=0)
        ax.plot([0, 1], [brace_at, brace_at], color='#888888', lw=1, clip_on=False)
        ax.plot([0, 0], [brace_at - 0.3, brace_at], color='#888888', lw=1, clip_on=False)
        ax.plot([1, 1], [brace_at - 0.3, brace_at], color='#888888', lw=1, clip_on=False)
        ax.text(0.5, brace_at + 0.3, f'{reach} of {c["excl"]} reach Haynes (1994)',
                ha='center', va='bottom', fontsize=foot_fs, color='#666666', style='italic')
        finish(fig, ax, title_fs, foot_fs, rect, suffix)

    def horizontal(figsize, title_fs, val_fs, foot_fs, rect, suffix, tick_fs=10):
        fig, ax = plt.subplots(figsize=figsize)
        fig.patch.set_facecolor('white')
        bars = ax.barh(categories[::-1], values[::-1], height=0.5, color=colors[::-1], edgecolor='none', zorder=3)
        for bar, val in zip(bars, values[::-1]):
            ax.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height() / 2, str(val),
                    ha='left', va='center', fontsize=val_fs, fontweight='bold', color='#1a1a1a')
        ax.set_xlabel('Number of papers', fontsize=10, color='#444444')
        ax.set_xlim(0, lim)
        ax.xaxis.set_major_locator(plt.MultipleLocator(5))
        ax.tick_params(axis='y', labelsize=tick_fs, colors='#333333')
        ax.tick_params(axis='x', labelsize=tick_fs - 1, colors='#666666')
        ax.grid(axis='x', color='#e0e0e0', linewidth=0.6, zorder=0)
        # Reversed order: "Traced through intermediaries" is y=2, "Cites Haynes directly" y=3
        y_top, y_bot, bx = 2, 3, brace_at
        ax.plot([bx, bx], [y_top - 0.25, y_bot + 0.25], color='#888888', lw=1, clip_on=False)
        ax.plot([bx - 0.2, bx], [y_top - 0.25, y_top - 0.25], color='#888888', lw=1, clip_on=False)
        ax.plot([bx - 0.2, bx], [y_bot + 0.25, y_bot + 0.25], color='#888888', lw=1, clip_on=False)
        ax.text(bx + 0.3, (y_top + y_bot) / 2, f'{reach} of {c["excl"]}\nreach Haynes\n(1994)',
                ha='left', va='center', fontsize=foot_fs, color='#666666', style='italic')
        finish(fig, ax, title_fs, foot_fs, rect, suffix)

    vertical((9, 5), 14, 22, 9, [0, 0.07, 1, 1], '16x9')
    vertical((8, 6), 13, 20, 9, [0, 0.06, 1, 1], '4x3')
    vertical((7, 7), 13, 20, 9, [0, 0.05, 1, 1], '1x1')
    horizontal((5, 8.9), 12, 18, 8, [0, 0.04, 1, 1], '9x16')


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--page', default=os.path.join(HERE, 'static', 'citation-map.html'),
                    help='citation map page to read (default: static/citation-map.html)')
    ap.add_argument('--out', default='.', help='folder for the PNGs (default: current folder)')
    args = ap.parse_args()

    counts = read_counts(args.page)
    print('counts:', counts)
    os.makedirs(args.out, exist_ok=True)
    make_charts(counts, args.out)


if __name__ == '__main__':
    main()
