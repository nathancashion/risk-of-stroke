# Risk of Stroke from Spinal Manipulation

![Preview](2026-03-07_risk_of_stroke_screenshot1.png)

An interactive calculator that examines the arithmetic plausibility of the commonly cited "1 in 20,000" stroke risk figure for cervical spinal manipulation.

The tool multiplies the claimed per-manipulation risk by the estimated annual volume of cervical manipulations performed in the US, then compares the resulting number of supposed manipulation-caused dissections against the total number of cervical artery dissections (CeAD) observed across the entire US population from all causes. When the math is run, the claimed figure implies more manipulation-caused dissections than actually exist — making the cited risk rate epidemiologically implausible.

All assumptions are adjustable via interactive sliders so users can explore different scenarios.

## Stack

- [SvelteKit](https://kit.svelte.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Chart.js](https://www.chartjs.org/) for the bar chart visualization
- Static site output via `@sveltejs/adapter-static`

## Developing

Install dependencies and start the dev server:

```sh
npm install
npm run dev

# or open in a new browser tab automatically
npm run dev -- --open
```

## Building

```sh
npm run build
npm run preview  # preview the production build locally
```

## Type Checking

```sh
npm run check
```

## Citation summary charts

`make_summary_charts.py` draws the citation map's summary bar chart (papers that cite Haynes directly, trace back through intermediaries, cite a phantom source, or give no citation) in four aspect ratios: 16:9, 4:3, 1:1 and 9:16. The counts are read from the paper data in `static/citation-map.html`, so rerun it whenever papers are added or changed.

It needs Node (already required for the site) and Python 3 with matplotlib:

```sh
python3 -m pip install matplotlib
```

Run it from the repo root:

```sh
python3 make_summary_charts.py
```

This writes `citation-summary-chart-16x9.png`, `-4x3.png`, `-1x1.png` and `-9x16.png` to the current folder and prints the counts it used. Options:

- `--out <folder>` saves the PNGs somewhere else (the folder is created if needed).
- `--page <file>` reads a different copy of the map, such as the one in the Obsidian vault.
