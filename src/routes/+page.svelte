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
		dc: 65_000,
		cmt: 20,
		days: 4,
		weeks: 48,
		riskDenom: 20_000,
		vadPer100k: 5.3,
		cadPer100k: 3.6,
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
	let pct = $derived(ratio * 100);

	// Graduated severity: red >100%, orange 80-100%, yellow 20-80%, green <20%
	type Severity = 'red' | 'orange' | 'yellow' | 'green';
	let severity: Severity = $derived(
		pct >= 100 ? 'red' : pct >= 80 ? 'orange' : pct >= 20 ? 'yellow' : 'green'
	);

	function sevBg(s: Severity) {
		return s === 'red' ? 'bg-red-50' : s === 'orange' ? 'bg-orange-50' : s === 'yellow' ? 'bg-yellow-50' : 'bg-green-50';
	}
	function sevBorder(s: Severity) {
		return s === 'red' ? 'border-red-300' : s === 'orange' ? 'border-orange-300' : s === 'yellow' ? 'border-yellow-300' : 'border-green-300';
	}
	function sevText(s: Severity) {
		return s === 'red' ? 'text-red-700' : s === 'orange' ? 'text-orange-700' : s === 'yellow' ? 'text-yellow-700' : 'text-green-700';
	}
	function sevTextLight(s: Severity) {
		return s === 'red' ? 'text-red-600' : s === 'orange' ? 'text-orange-600' : s === 'yellow' ? 'text-yellow-600' : 'text-green-600';
	}

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
	let assumptionsOpen = $state(false);

	onMount(() => {
		chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels: [
					'Claimed from\nManipulation',
					'Total CeAD\nCases (US)'
				],
				datasets: [
					{
						label: 'Claimed Dissections',
						data: [claimedDissections, 0],
						backgroundColor: 'rgba(220, 38, 38, 0.85)',
						borderColor: 'rgb(220, 38, 38)',
						borderWidth: 2,
						borderRadius: 6
					},
					{
						label: 'VAD Cases',
						data: [0, totalVAD],
						backgroundColor: 'rgba(100, 116, 139, 0.7)',
						borderColor: 'rgb(100, 116, 139)',
						borderWidth: 2,
						borderRadius: 0
					},
					{
						label: 'CAD Cases',
						data: [0, totalCAD],
						backgroundColor: 'rgba(13, 148, 136, 0.7)',
						borderColor: 'rgb(13, 148, 136)',
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
							label: (ctx) => `${ctx.dataset.label}: ${fmtInt(ctx.parsed.y)} cases/year`
						}
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						stacked: true,
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
						stacked: true,
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
			chart.data.datasets[0].data = [claimedDissections, 0];
			chart.data.datasets[1].data = [0, totalVAD];
			chart.data.datasets[2].data = [0, totalCAD];
			chart.update('active');
		}
	});
</script>

<svelte:head>
	<title>Risk of Stroke from Spinal Manipulation</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 text-gray-900">
	<!-- Hero -->
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
			<h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-1">
				Risk of Stroke
			</h1>
			<p class="text-lg text-gray-400 mb-4">Does the claimed stroke risk from spinal manipulation add up?</p>
			<p class="text-lg text-gray-600 max-w-3xl leading-relaxed">
				A commonly cited figure claims that cervical spinal manipulation carries a stroke risk of
				<strong class="text-gray-900">1 in 20,000</strong>. But when you multiply that rate by the
				volume of manipulations performed each year, the resulting number of
				<strong class="text-red-600">manipulation-caused dissections</strong>
				represents an implausible portion of all <strong>cervical (<span class="text-teal-600">carotid</span> + <span class="text-slate-500">vertebral</span>) artery dissections</strong> in the entire US population.
				Explore the math yourself below.
			</p>
		</div>
	</header>

	<main class="max-w-4xl mx-auto px-4 py-8 space-y-10">
		<!-- Visualization -->
		<section>
			<div class="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
				<div class="h-[350px] sm:h-[420px]">
					<canvas bind:this={canvas}></canvas>
				</div>
			</div>
		</section>

		<!-- Dynamic Summary -->
		<section>
			<h2 class="text-2xl font-bold text-gray-900 mb-4">Summary</h2>
			<div class="rounded-xl border-2 p-6 {sevBg(severity)} {sevBorder(severity)}">
				<p class="text-lg leading-relaxed text-gray-800">
					At these assumptions, cervical manipulation would cause an estimated
					<strong class={sevText(severity)}>{fmtInt(Math.round(claimedDissections))}</strong>
					dissections per year —
					<strong class={sevText(severity)}>{pct.toFixed(0)}%</strong>
					of the total estimated
					<strong class="text-gray-900">{fmtInt(Math.round(totalCeAD))}</strong>
					cervical artery dissections in the US from <em>all causes combined</em>.
				</p>
				{#if pct >= 100}
					<p class="mt-3 text-base {sevText(severity)} font-semibold">
						The claimed risk implies more manipulation-caused dissections than actually exist in the entire population.
					</p>
				{:else if pct >= 80}
					<p class="mt-3 text-base {sevText(severity)} font-semibold">
						Manipulation alone would account for nearly all cervical artery dissections — leaving almost none from other causes.
					</p>
				{:else if pct >= 20}
					<p class="mt-3 text-base {sevText(severity)} font-semibold">
						This would make manipulation a leading cause of cervical artery dissection — a proportion not supported by evidence.
					</p>
				{:else}
					<p class="mt-3 text-base {sevText(severity)} font-semibold">
						At this level, the claimed rate is within a more plausible range.
					</p>
				{/if}
			</div>
		</section>

		<!-- Quick stats strip -->
		<section>
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
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
				<div class="rounded-lg border p-3 {sevBg(severity)} {sevBorder(severity)}">
					<div class="text-xs font-medium {sevTextLight(severity)}">
						% of Total CeAD
					</div>
					<div class="text-lg font-bold tabular-nums {sevText(severity)}">
						{pct.toFixed(0)}%
					</div>
				</div>
			</div>
		</section>

		<!-- Assumptions Panel (collapsible) -->
		<section>
			<button
				onclick={() => (assumptionsOpen = !assumptionsOpen)}
				class="flex items-center gap-2 text-2xl font-bold text-gray-900 cursor-pointer hover:text-gray-700 transition-colors"
			>
				<svg
					class="w-5 h-5 transition-transform duration-200"
					class:rotate-90={assumptionsOpen}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2.5"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
				</svg>
				Adjust Assumptions
			</button>
			<p class="text-sm text-gray-500 mt-1 ml-7">Modify the underlying assumptions to explore different scenarios.</p>

			{#if assumptionsOpen}
				<div class="mt-6">
					<div class="flex justify-end mb-4">
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
									<span>Active chiropractors (US)</span>
									<span class="text-gray-900 font-semibold tabular-nums">{fmtInt(dc)}</span>
								</label>
								<input type="range" min="10000" max="200000" step="1000" bind:value={dc} class="w-full accent-blue-600" />
								<div class="flex justify-between text-xs text-gray-400 mt-0.5"><span>10K</span><span>200K</span></div>
							</div>

							<div>
								<label class="flex justify-between text-sm font-medium text-gray-700 mb-1">
									<span>Avg. cervical manips per provider per day</span>
									<span class="text-gray-900 font-semibold tabular-nums">{cmt}</span>
								</label>
								<input type="range" min="1" max="50" step="1" bind:value={cmt} class="w-full accent-blue-600" />
								<div class="flex justify-between text-xs text-gray-400 mt-0.5"><span>1</span><span>50</span></div>
							</div>

							<div>
								<label class="flex justify-between text-sm font-medium text-gray-700 mb-1">
									<span>Avg. treating days / week</span>
									<span class="text-gray-900 font-semibold tabular-nums">{days}</span>
								</label>
								<input type="range" min="1" max="7" step="1" bind:value={days} class="w-full accent-blue-600" />
								<div class="flex justify-between text-xs text-gray-400 mt-0.5"><span>1</span><span>7</span></div>
							</div>

							<div>
								<label class="flex justify-between text-sm font-medium text-gray-700 mb-1">
									<span>Avg. work weeks / year</span>
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
				</div>
			{/if}
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
							<li><strong>65,000 active chiropractors</strong> — Estimated number of actively practicing DCs in the US. <em>Source: American Chiropractic Association workforce estimates.</em></li>
							<li><strong>20 cervical manipulations/day</strong> — Conservative mid-range estimate of cervical-specific manipulative treatments per chiropractor per clinical day.</li>
							<li><strong>4 days/week, 48 weeks/year</strong> — Typical full-time chiropractic practice schedule.</li>
							<li><strong>1 in 20,000 risk</strong> — Commonly cited figure for stroke risk per cervical manipulation. <em>Source: Haldeman et al. (2001), among others. Note: more recent research suggests this figure significantly overstates any causal risk.</em></li>
							<li><strong>VAD incidence: ~5.3 per 100,000/year</strong> — Vertebral artery dissection annual incidence, most recent (2017–2020) period. <em>Source: Griffin et al. (2024), Stroke — estimated from Figure 2B, scaled to the paper's reported combined CeAD rate of 8.93/100,000 for 2017–2020.</em></li>
							<li><strong>CAD incidence: ~3.6 per 100,000/year</strong> — Carotid artery dissection annual incidence, most recent (2017–2020) period. <em>Source: Griffin et al. (2024), Stroke — estimated from Figure 2B, scaled to the paper's reported combined CeAD rate of 8.93/100,000 for 2017–2020.</em></li>
							<li><strong>330,000,000 population</strong> — Approximate current US population (US Census Bureau).</li>
						</ul>
					</div>

				</div>
			{/if}
		</section>

		<!-- Interpretation -->
		<section class="pb-8">
			<p class="text-sm text-gray-500 leading-relaxed">
				<span class="font-semibold text-gray-700">Interpretation:</span>
				This calculator does not attempt to determine the true risk of stroke from cervical manipulation.
				{#if pct >= 100}
					It demonstrates that the commonly cited "1 in 20,000" figure is arithmetically implausible at these assumptions:
					it would require more manipulation-caused dissections each year than the total number of
					cervical artery dissections observed in the entire US population from all causes combined.
				{:else if pct >= 20}
					It demonstrates that the commonly cited "1 in 20,000" figure implies an arithmetically implausible share of all
					cervical artery dissections at these assumptions: manipulation alone would account for
					{pct.toFixed(0)}% of every cervical artery dissection observed in the entire US population from all causes combined —
					far more than the proportion actually attributable to manipulation in the epidemiological literature.
				{:else}
					At these assumptions, the claimed rate does not exceed the total observed incidence of cervical artery dissection,
					though it still implies a share of cases that is difficult to reconcile with the epidemiological literature on causation.
					Adjust the sliders above to see how the underlying assumptions drive this conclusion.
				{/if}
			</p>
		</section>
	</main>

	<!-- Footer -->
	<footer class="border-t border-gray-200 bg-white">
		<div class="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
			<p>This tool is for educational purposes. It does not constitute medical advice. Adjust the assumptions to explore different scenarios.</p>
		</div>
	</footer>
</div>
