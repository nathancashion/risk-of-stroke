<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Chart,
		BarController,
		BarElement,
		CategoryScale,
		LinearScale,
		Tooltip,
		Legend
	} from 'chart.js';

	Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

	// --- Defaults ---
	const DEFAULTS = {
		dc: 75_000,
		cmt: 20,
		days: 4,
		weeks: 48,
		riskDenom: 20_000,
		vadPer100k: 1,
		cadPer100k: 2,
		pop: 330_000_000
	};

	// --- Reactive state ---
	let dc = $state(DEFAULTS.dc);
	let cmt = $state(DEFAULTS.cmt);
	let days = $state(DEFAULTS.days);
	let weeks = $state(DEFAULTS.weeks);
	let riskDenom = $state(DEFAULTS.riskDenom);
	let vadPer100k = $state(DEFAULTS.vadPer100k);
	let cadPer100k = $state(DEFAULTS.cadPer100k);
	let pop = $state(DEFAULTS.pop);

	// --- Derived calculations ---
	let risk = $derived(riskDenom > 0 ? 1 / riskDenom : 0);
	let vad = $derived(vadPer100k / 100_000);
	let cad = $derived(cadPer100k / 100_000);
	let totalManipulations = $derived(dc * cmt * days * weeks);
	let claimedDissections = $derived(totalManipulations * risk);
	let totalVAD = $derived(vad * pop);
	let totalCAD = $derived(cad * pop);
	let totalCeAD = $derived((vad + cad) * pop);
	let ratio = $derived(totalCeAD > 0 ? claimedDissections / totalCeAD : 0);
	let claimedExceedsTotal = $derived(claimedDissections > totalCeAD);

	// --- Format helpers ---
	function fmt(n: number): string {
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
		if (n >= 1_000) return Math.round(n).toLocaleString();
		if (n >= 1) return n.toFixed(1).replace(/\.0$/, '');
		return n.toFixed(4);
	}

	function fmtInt(n: number): string {
		return Math.round(n).toLocaleString();
	}

	// --- Reset ---
	function resetDefaults() {
		dc = DEFAULTS.dc;
		cmt = DEFAULTS.cmt;
		days = DEFAULTS.days;
		weeks = DEFAULTS.weeks;
		riskDenom = DEFAULTS.riskDenom;
		vadPer100k = DEFAULTS.vadPer100k;
		cadPer100k = DEFAULTS.cadPer100k;
		pop = DEFAULTS.pop;
	}

	// --- Chart ---
	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;
	let sourcesOpen = $state(false);

	onMount(() => {
		chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels: [
					'Claimed from\nManipulation',
					'Total VAD\nCases',
					'Total CAD\nCases',
					'Total CeAD\nCases'
				],
				datasets: [
					{
						label: 'Estimated Annual Cases',
						data: [claimedDissections, totalVAD, totalCAD, totalCeAD],
						backgroundColor: [
							'rgba(220, 38, 38, 0.85)',
							'rgba(100, 116, 139, 0.65)',
							'rgba(148, 163, 184, 0.65)',
							'rgba(13, 148, 136, 0.75)'
						],
						borderColor: [
							'rgb(220, 38, 38)',
							'rgb(100, 116, 139)',
							'rgb(148, 163, 184)',
							'rgb(13, 148, 136)'
						],
						borderWidth: 2,
						borderRadius: 6
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: { duration: 400, easing: 'easeOutQuart' },
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (ctx) => `${fmtInt(ctx.parsed.y)} cases/year`
						}
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						title: { display: true, text: 'Estimated Annual Cases', font: { size: 13 } },
						ticks: {
							callback: (v) => {
								const n = Number(v);
								if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
								if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
								return String(n);
							}
						},
						grid: { color: 'rgba(0,0,0,0.06)' }
					},
					x: {
						ticks: { font: { size: 12 }, maxRotation: 0, autoSkip: false },
						grid: { display: false }
					}
				}
			}
		});

		return () => chart?.destroy();
	});

	// Update chart reactively
	$effect(() => {
		if (chart) {
			chart.data.datasets[0].data = [claimedDissections, totalVAD, totalCAD, totalCeAD];
			chart.update('active');
		}
	});
</script>

<svelte:head>
	<title>Stroke Risk from Spinal Manipulation — Interactive Calculator</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 text-gray-900">
	<!-- Hero -->
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
			<h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-4">
				Does the Claimed Stroke Risk from Spinal Manipulation Add Up?
			</h1>
			<p class="text-lg text-gray-600 max-w-3xl leading-relaxed">
				A commonly cited figure claims that cervical spinal manipulation carries a stroke risk of
				<strong class="text-gray-900">1 in 20,000</strong>. But when you multiply that rate by the
				volume of manipulations performed each year, the resulting number of
				<em>manipulation-caused</em> dissections
				<strong class="text-red-600">exceeds the total number of all cervical artery dissections in the entire US population</strong>.
				Explore the math yourself below.
			</p>
		</div>
	</header>

	<main class="max-w-4xl mx-auto px-4 py-8 space-y-10">
		<!-- Assumptions Panel -->
		<section>
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-2xl font-bold text-gray-900">Assumptions</h2>
				<button
					onclick={resetDefaults}
					class="text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors cursor-pointer"
				>
					Reset to defaults
				</button>
			</div>

			<div class="grid gap-8 md:grid-cols-2">
				<!-- Chiropractic Practice -->
				<div class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
					<h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">
						Chiropractic Practice
					</h3>

					<div>
						<label class="flex justify-between text-sm font-medium text-gray-700 mb-1">
							<span>Licensed chiropractors (US)</span>
							<span class="text-gray-900 font-semibold tabular-nums">{fmtInt(dc)}</span>
						</label>
						<input type="range" min="10000" max="200000" step="1000" bind:value={dc} class="w-full accent-blue-600" />
						<div class="flex justify-between text-xs text-gray-400 mt-0.5"><span>10K</span><span>200K</span></div>
					</div>

					<div>
						<label class="flex justify-between text-sm font-medium text-gray-700 mb-1">
							<span>Cervical manipulations / DC / day</span>
							<span class="text-gray-900 font-semibold tabular-nums">{cmt}</span>
						</label>
						<input type="range" min="1" max="50" step="1" bind:value={cmt} class="w-full accent-blue-600" />
						<div class="flex justify-between text-xs text-gray-400 mt-0.5"><span>1</span><span>50</span></div>
					</div>

					<div>
						<label class="flex justify-between text-sm font-medium text-gray-700 mb-1">
							<span>Treating days / week</span>
							<span class="text-gray-900 font-semibold tabular-nums">{days}</span>
						</label>
						<input type="range" min="1" max="7" step="1" bind:value={days} class="w-full accent-blue-600" />
						<div class="flex justify-between text-xs text-gray-400 mt-0.5"><span>1</span><span>7</span></div>
					</div>

					<div>
						<label class="flex justify-between text-sm font-medium text-gray-700 mb-1">
							<span>Work weeks / year</span>
							<span class="text-gray-900 font-semibold tabular-nums">{weeks}</span>
						</label>
						<input type="range" min="20" max="52" step="1" bind:value={weeks} class="w-full accent-blue-600" />
						<div class="flex justify-between text-xs text-gray-400 mt-0.5"><span>20</span><span>52</span></div>
					</div>
				</div>

				<!-- Epidemiological Data -->
				<div class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
					<h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">
						Epidemiological Data
					</h3>

					<div>
						<label class="flex justify-between text-sm font-medium text-gray-700 mb-1">
							<span>Claimed risk (1 in …)</span>
							<span class="text-gray-900 font-semibold tabular-nums">1 in {fmtInt(riskDenom)}</span>
						</label>
						<input type="range" min="1000" max="1000000" step="1000" bind:value={riskDenom} class="w-full accent-red-500" />
						<div class="flex justify-between text-xs text-gray-400 mt-0.5"><span>1 in 1K</span><span>1 in 1M</span></div>
					</div>

					<div>
						<label class="flex justify-between text-sm font-medium text-gray-700 mb-1">
							<span>VAD incidence (per 100K/yr)</span>
							<span class="text-gray-900 font-semibold tabular-nums">{vadPer100k}</span>
						</label>
						<input type="range" min="0.1" max="10" step="0.1" bind:value={vadPer100k} class="w-full accent-slate-500" />
						<div class="flex justify-between text-xs text-gray-400 mt-0.5"><span>0.1</span><span>10</span></div>
					</div>

					<div>
						<label class="flex justify-between text-sm font-medium text-gray-700 mb-1">
							<span>CAD incidence (per 100K/yr)</span>
							<span class="text-gray-900 font-semibold tabular-nums">{cadPer100k}</span>
						</label>
						<input type="range" min="0.1" max="10" step="0.1" bind:value={cadPer100k} class="w-full accent-slate-400" />
						<div class="flex justify-between text-xs text-gray-400 mt-0.5"><span>0.1</span><span>10</span></div>
					</div>

					<div>
						<label class="flex justify-between text-sm font-medium text-gray-700 mb-1">
							<span>US Population</span>
							<span class="text-gray-900 font-semibold tabular-nums">{fmtInt(pop)}</span>
						</label>
						<input type="range" min="100000000" max="500000000" step="1000000" bind:value={pop} class="w-full accent-slate-500" />
						<div class="flex justify-between text-xs text-gray-400 mt-0.5"><span>100M</span><span>500M</span></div>
					</div>
				</div>
			</div>

			<!-- Quick stats strip -->
			<div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
				<div class="bg-white rounded-lg border border-gray-200 p-3">
					<div class="text-xs text-gray-500 font-medium">Total Manipulations/yr</div>
					<div class="text-lg font-bold text-gray-900 tabular-nums">{fmt(totalManipulations)}</div>
				</div>
				<div class="bg-red-50 rounded-lg border border-red-200 p-3">
					<div class="text-xs text-red-600 font-medium">Claimed Dissections</div>
					<div class="text-lg font-bold text-red-700 tabular-nums">{fmtInt(Math.round(claimedDissections))}</div>
				</div>
				<div class="bg-white rounded-lg border border-gray-200 p-3">
					<div class="text-xs text-gray-500 font-medium">Total CeAD Cases</div>
					<div class="text-lg font-bold text-gray-900 tabular-nums">{fmtInt(Math.round(totalCeAD))}</div>
				</div>
				<div
					class="rounded-lg border p-3"
					class:bg-red-50={claimedExceedsTotal}
					class:border-red-200={claimedExceedsTotal}
					class:bg-green-50={!claimedExceedsTotal}
					class:border-green-200={!claimedExceedsTotal}
				>
					<div class="text-xs font-medium" class:text-red-600={claimedExceedsTotal} class:text-green-600={!claimedExceedsTotal}>
						Ratio (Claimed / Total)
					</div>
					<div class="text-lg font-bold tabular-nums" class:text-red-700={claimedExceedsTotal} class:text-green-700={!claimedExceedsTotal}>
						{ratio.toFixed(1)}×
					</div>
				</div>
			</div>
		</section>

		<!-- Visualization -->
		<section>
			<h2 class="text-2xl font-bold text-gray-900 mb-4">Visualization</h2>
			<div class="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
				<div class="h-[350px] sm:h-[420px]">
					<canvas bind:this={canvas}></canvas>
				</div>
				<div class="flex flex-wrap gap-4 justify-center mt-4 text-sm">
					<span class="flex items-center gap-1.5">
						<span class="w-3 h-3 rounded-sm bg-red-600 inline-block"></span>
						Claimed from Manipulation
					</span>
					<span class="flex items-center gap-1.5">
						<span class="w-3 h-3 rounded-sm bg-slate-500 inline-block"></span>
						Total VAD Cases
					</span>
					<span class="flex items-center gap-1.5">
						<span class="w-3 h-3 rounded-sm bg-slate-400 inline-block"></span>
						Total CAD Cases
					</span>
					<span class="flex items-center gap-1.5">
						<span class="w-3 h-3 rounded-sm bg-teal-600 inline-block"></span>
						Total CeAD Cases
					</span>
				</div>
			</div>
		</section>

		<!-- Dynamic Summary -->
		<section>
			<h2 class="text-2xl font-bold text-gray-900 mb-4">Summary</h2>
			<div
				class="rounded-xl border-2 p-6"
				class:border-red-300={claimedExceedsTotal}
				class:bg-red-50={claimedExceedsTotal}
				class:border-green-300={!claimedExceedsTotal}
				class:bg-green-50={!claimedExceedsTotal}
			>
				{#if claimedExceedsTotal}
					<p class="text-lg leading-relaxed text-gray-800">
						At these assumptions, cervical manipulation would cause an estimated
						<strong class="text-red-700">{fmtInt(Math.round(claimedDissections))}</strong>
						dissections per year — that is
						<strong class="text-red-700">{ratio.toFixed(1)}×</strong>
						the total estimated
						<strong class="text-gray-900">{fmtInt(Math.round(totalCeAD))}</strong>
						cervical artery dissections in the US from <em>all causes combined</em>.
					</p>
					<p class="mt-3 text-base text-red-700 font-semibold">
						The claimed risk implies more manipulation-caused dissections than actually exist in the entire population.
					</p>
				{:else}
					<p class="text-lg leading-relaxed text-gray-800">
						At these assumptions, cervical manipulation would cause an estimated
						<strong class="text-green-700">{fmtInt(Math.round(claimedDissections))}</strong>
						dissections per year — that is
						<strong class="text-green-700">{ratio.toFixed(1)}×</strong>
						of the total estimated
						<strong class="text-gray-900">{fmtInt(Math.round(totalCeAD))}</strong>
						cervical artery dissections in the US.
					</p>
					<p class="mt-3 text-base text-green-700 font-semibold">
						At these values, the claimed number does not exceed total CeAD cases.
					</p>
				{/if}
			</div>
		</section>

		<!-- Sources -->
		<section class="pb-12">
			<button
				onclick={() => (sourcesOpen = !sourcesOpen)}
				class="flex items-center gap-2 text-2xl font-bold text-gray-900 mb-4 cursor-pointer hover:text-gray-700 transition-colors"
			>
				<svg
					class="w-5 h-5 transition-transform duration-200"
					class:rotate-90={sourcesOpen}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2.5"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
				</svg>
				Sources &amp; Methodology
			</button>

			{#if sourcesOpen}
				<div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
					<div>
						<h4 class="font-semibold text-gray-900">Formula</h4>
						<p><strong>Total annual manipulations</strong> = Chiropractors × Manipulations/day × Days/week × Weeks/year</p>
						<p><strong>Claimed dissections</strong> = Total manipulations × Risk per manipulation</p>
						<p><strong>Total CeAD cases</strong> = (VAD incidence + CAD incidence) × Population</p>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900">Default Values</h4>
						<ul class="list-disc ml-5 space-y-1">
							<li><strong>75,000 chiropractors</strong> — Approximate number of licensed DCs in the US. <em>Source: American Chiropractic Association workforce estimates.</em></li>
							<li><strong>20 cervical manipulations/day</strong> — Conservative mid-range estimate of cervical-specific manipulative treatments per chiropractor per clinical day.</li>
							<li><strong>4 days/week, 48 weeks/year</strong> — Typical full-time chiropractic practice schedule.</li>
							<li><strong>1 in 20,000 risk</strong> — Commonly cited figure for stroke risk per cervical manipulation. <em>Source: Haldeman et al. (2001), among others. Note: more recent research suggests this figure significantly overstates any causal risk.</em></li>
							<li><strong>VAD incidence: 1 per 100,000/year</strong> — Vertebral artery dissection annual incidence. <em>Source: Schievink (2001), NEJM.</em></li>
							<li><strong>CAD incidence: 2 per 100,000/year</strong> — Carotid artery dissection annual incidence. <em>Source: Lee et al. (2006), Debette &amp; Leys (2009).</em></li>
							<li><strong>330,000,000 population</strong> — Approximate current US population (US Census Bureau).</li>
						</ul>
					</div>

					<div>
						<h4 class="font-semibold text-gray-900">Interpretation</h4>
						<p>
							This calculator does not attempt to determine the true risk of stroke from cervical manipulation.
							It demonstrates that the commonly cited "1 in 20,000" figure is arithmetically implausible:
							it would require more manipulation-caused dissections each year than the total number of
							cervical artery dissections observed in the entire US population from all causes combined.
						</p>
					</div>
				</div>
			{/if}
		</section>
	</main>

	<!-- Footer -->
	<footer class="border-t border-gray-200 bg-white">
		<div class="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
			<p>This tool is for educational purposes. It does not constitute medical advice. Adjust the assumptions to explore different scenarios.</p>
		</div>
	</footer>
</div>
