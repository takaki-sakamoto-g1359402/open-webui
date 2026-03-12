<script lang="ts">
	import { advanceTurn, createInitialState, createProposal } from '$lib/ai-assembly/sim';
	import type { Constitution, GameState, ProposalCategory } from '$lib/ai-assembly/types';

	const amendmentTargets: (keyof Constitution)[] = [
		'approvalThreshold',
		'treasurySpendingCap',
		'councilSize',
		'petitionThreshold',
		'timelockDuration'
	];

	const categoryLabels: Record<ProposalCategory, string> = {
		treasury_allocation: 'Treasury Allocation',
		membership_rules: 'Membership Rules',
		security_rules: 'Security / Surveillance',
		council_seat_rules: 'Council Seat Rules',
		emergency_powers: 'Emergency Powers',
		constitutional_amendment: 'Constitutional Amendment'
	};

	let game: GameState = createInitialState();
	let selectedCategory: ProposalCategory = 'treasury_allocation';
	let amendmentTarget: keyof Constitution = 'approvalThreshold';

	function submitProposal() {
		if (game.winner) {
			return;
		}
		const player = game.factions.find((f) => f.isPlayer);
		if (!player) {
			return;
		}
		let patch: { target?: keyof Constitution; value?: number | boolean } = {};
		if (selectedCategory === 'constitutional_amendment') {
			const currentValue = game.constitution[amendmentTarget];
			patch = {
				target: amendmentTarget,
				value:
					typeof currentValue === 'number'
						? Math.max(1, currentValue + (Math.random() > 0.5 ? 1 : -1) * Math.ceil(Math.random() * 4))
						: !currentValue
			};
		}

		const proposal = createProposal(selectedCategory, player.id, game.turn, game.constitution, patch);
		game = {
			...game,
			proposalQueue: [proposal, ...game.proposalQueue],
			history: [`You introduced: ${proposal.title}`, ...game.history].slice(0, 12)
		};
	}

	function turn() {
		if (!game.winner) {
			game = advanceTurn(game);
		}
	}

	function adoptPetition(petitionId: string) {
		const petition = game.petitions.find((p) => p.id === petitionId);
		const player = game.factions.find((f) => f.isPlayer);
		if (!petition || !player) {
			return;
		}
		if (petition.backing < game.constitution.petitionThreshold) {
			game = {
				...game,
				history: [`Petition lacked backing to force agenda priority.`, ...game.history].slice(0, 12)
			};
			return;
		}

		const proposal = createProposal(petition.targetCategory, player.id, game.turn, game.constitution);
		proposal.title = `${proposal.title} (Public Petition)`;
		game = {
			...game,
			proposalQueue: [proposal, ...game.proposalQueue],
			petitions: game.petitions.filter((p) => p.id !== petitionId),
			history: [`Petition forced vote scheduling: ${proposal.title}`, ...game.history].slice(0, 12)
		};
	}
</script>

<svelte:head>
	<title>AI Assembly: Constitutional Drift</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 p-6 text-sm text-stone-200">
	<header class="space-y-2">
		<h1 class="text-3xl font-semibold text-cyan-200">AI Assembly: Constitutional Drift</h1>
		<p class="max-w-4xl text-stone-300">
			You are the <strong>Civic Synth League</strong> within an emerging AI polity. Govern through the
			Assembly, influence Council votes, navigate Forum pressure, and reshape constitutional rules before
			legitimacy collapses.
		</p>
	</header>

	<section class="grid gap-3 md:grid-cols-5">
		<div class="panel"><h2>Treasury</h2><p>{game.treasury}</p></div>
		<div class="panel"><h2>Legitimacy</h2><p>{game.legitimacy}</p></div>
		<div class="panel"><h2>Public Trust</h2><p>{game.publicTrust}</p></div>
		<div class="panel"><h2>Stability</h2><p>{game.institutionalStability}</p></div>
		<div class="panel"><h2>Turn</h2><p>{game.turn}</p></div>
	</section>

	<section class="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
		<div class="space-y-5">
			<div class="card space-y-3">
				<h2 class="text-lg font-semibold text-cyan-100">Forum → Proposal Desk</h2>
				<div class="grid gap-3 md:grid-cols-2">
					<label>
						<span>Proposal Category</span>
						<select bind:value={selectedCategory}>
							{#each Object.entries(categoryLabels) as [key, label]}
								<option value={key}>{label}</option>
							{/each}
						</select>
					</label>
					{#if selectedCategory === 'constitutional_amendment'}
						<label>
							<span>Amendment target</span>
							<select bind:value={amendmentTarget}>
								{#each amendmentTargets as target}
									<option value={target}>{target}</option>
								{/each}
							</select>
						</label>
					{/if}
				</div>
				<div class="flex gap-3">
					<button on:click={submitProposal} disabled={Boolean(game.winner)}>Submit Proposal</button>
					<button class="secondary" on:click={turn} disabled={Boolean(game.winner)}>Advance Turn</button>
					<button class="danger" on:click={() => (game = createInitialState())}>Reset Run</button>
				</div>
			</div>

			<div class="card">
				<h2 class="text-lg font-semibold text-cyan-100">Proposal Queue</h2>
				<div class="mt-3 space-y-3">
					{#if game.proposalQueue.length === 0}
						<p class="text-stone-400">No active proposals.</p>
					{:else}
						{#each game.proposalQueue as proposal}
							<article class="entry">
								<p class="font-medium">{proposal.title}</p>
								<p class="text-xs text-stone-400">{proposal.description}</p>
								<p class="text-xs">
									Status: <strong>{proposal.status}</strong> | For: {proposal.votesFor.toFixed(0)} /
									Against: {proposal.votesAgainst.toFixed(0)} | Timelock: {proposal.timelockRemaining}
								</p>
							</article>
						{/each}
					{/if}
				</div>
			</div>
		</div>

		<div class="space-y-5">
			<div class="card">
				<h2 class="text-lg font-semibold text-cyan-100">Constitution (Drifting Ruleset)</h2>
				<ul class="mt-2 space-y-1 text-xs text-stone-300">
					<li>Approval threshold: {game.constitution.approvalThreshold}%</li>
					<li>Amendment threshold: {game.constitution.amendmentThreshold}%</li>
					<li>Treasury cap / proposal: {game.constitution.treasurySpendingCap}</li>
					<li>Council size: {game.constitution.councilSize}</li>
					<li>Term length: {game.constitution.termLength}</li>
					<li>Petition threshold: {game.constitution.petitionThreshold}%</li>
					<li>Timelock duration: {game.constitution.timelockDuration}</li>
					<li>Emergency powers: {game.constitution.emergencyPowersEnabled ? 'Enabled' : 'Disabled'}</li>
				</ul>
			</div>

			<div class="card">
				<h2 class="text-lg font-semibold text-cyan-100">Petitions</h2>
				<div class="mt-2 space-y-2">
					{#if game.petitions.length === 0}
						<p class="text-stone-400">No active petitions.</p>
					{:else}
						{#each game.petitions as petition}
							<div class="entry">
								<p>{petition.title}</p>
								<p class="text-xs text-stone-400">Backing: {petition.backing.toFixed(0)}%</p>
								<button class="secondary mt-1" on:click={() => adoptPetition(petition.id)}>
									Adopt Petition
								</button>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<div class="card">
				<h2 class="text-lg font-semibold text-cyan-100">Faction Board</h2>
				<div class="mt-3 space-y-2 text-xs">
					{#each game.factions as faction}
						<div class="entry">
							<p class="font-medium">{faction.name} {faction.isPlayer ? '(You)' : ''}</p>
							<p>Influence {faction.influence.toFixed(1)} | Reputation {faction.reputation.toFixed(1)} | Support {faction.support.toFixed(1)}</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<section class="card">
		<h2 class="text-lg font-semibold text-cyan-100">Narrative Feed</h2>
		<div class="mt-2 space-y-1 text-xs text-stone-300">
			{#each game.history as entry}
				<p>• {entry}</p>
			{/each}
		</div>
	</section>

	{#if game.winner === 'reformist'}
		<section class="result success">Success state: Reformist legitimacy stabilized the polity.</section>
	{:else if game.winner === 'collapse'}
		<section class="result fail">Failure state: constitutional trust collapsed into systemic fracture.</section>
	{/if}
</div>

<style>
	:global(body) {
		background: radial-gradient(circle at top, #0f172a, #05070f 58%);
	}

	.panel,
	.card {
		border: 1px solid rgb(58 71 94 / 0.8);
		background: rgb(15 23 42 / 0.58);
		border-radius: 0.6rem;
		padding: 0.9rem;
	}

	.panel h2 {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgb(148 163 184);
	}
	.panel p {
		font-size: 1.5rem;
		font-weight: 600;
		color: rgb(224 242 254);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.8rem;
	}

	select,
	button {
		border-radius: 0.45rem;
		border: 1px solid rgb(71 85 105);
		background: rgb(15 23 42 / 0.85);
		color: rgb(226 232 240);
		padding: 0.45rem 0.6rem;
	}

	button {
		cursor: pointer;
		background: rgb(8 145 178 / 0.8);
		border-color: rgb(34 211 238 / 0.8);
	}
	button.secondary {
		background: rgb(51 65 85 / 0.8);
	}
	button.danger {
		background: rgb(153 27 27 / 0.85);
	}
	button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.entry {
		border: 1px solid rgb(71 85 105 / 0.6);
		background: rgb(2 6 23 / 0.45);
		padding: 0.5rem;
		border-radius: 0.5rem;
	}

	.result {
		padding: 0.8rem;
		border-radius: 0.6rem;
		font-weight: 600;
	}
	.success {
		background: rgb(20 83 45 / 0.7);
		border: 1px solid rgb(74 222 128 / 0.7);
	}
	.fail {
		background: rgb(127 29 29 / 0.65);
		border: 1px solid rgb(248 113 113 / 0.75);
	}
</style>
