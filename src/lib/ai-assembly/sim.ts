import { eventDeck, initialFactions } from './data';
import type { Constitution, EventCard, Faction, GameState, Petition, Proposal, ProposalCategory } from './types';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const randomItem = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const constitutionDefaults: Constitution = {
	approvalThreshold: 60,
	amendmentThreshold: 67,
	treasurySpendingCap: 24,
	councilSize: 7,
	termLength: 4,
	petitionThreshold: 55,
	timelockDuration: 2,
	emergencyPowersEnabled: false,
	reviewEnabled: true
};

const proposalTemplates: Record<ProposalCategory, { title: string; description: string; cost: number }> = {
	treasury_allocation: {
		title: 'Allocate Treasury to Infrastructure Hardening',
		description: 'Fund resilience and load balancing to reduce crisis volatility.',
		cost: 18
	},
	membership_rules: {
		title: 'Adjust Membership Validation Rules',
		description: 'Change entry friction for new agents in the Assembly.',
		cost: 6
	},
	security_rules: {
		title: 'Expand Behavioral Monitoring Scope',
		description: 'Increase surveillance authority during incidents.',
		cost: 12
	},
	council_seat_rules: {
		title: 'Rebalance Council Seat Distribution',
		description: 'Resize representation and influence concentration.',
		cost: 10
	},
	emergency_powers: {
		title: 'Authorize Temporary Emergency Powers',
		description: 'Allow accelerated executive actions under emergency conditions.',
		cost: 8
	},
	constitutional_amendment: {
		title: 'Amend Constitutional Procedure',
		description: 'Modify a core governance parameter.',
		cost: 4
	}
};

export const createInitialState = (): GameState => ({
	turn: 1,
	treasury: 100,
	legitimacy: 60,
	publicTrust: 58,
	institutionalStability: 62,
	attention: 55,
	constitution: { ...constitutionDefaults },
	factions: initialFactions.map((f) => ({ ...f })),
	proposalQueue: [],
	petitions: [],
	events: [],
	history: ['Boot cycle complete. Constitutional substrate initialized.']
});

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export function createProposal(
	category: ProposalCategory,
	authorFactionId: Faction['id'],
	turn: number,
	constitution: Constitution,
	patch?: { target?: keyof Constitution; value?: number | boolean }
): Proposal {
	const template = proposalTemplates[category];
	return {
		id: makeId('proposal'),
		title:
			category === 'constitutional_amendment' && patch?.target
				? `Amend ${patch.target}`
				: template.title,
		description:
			category === 'constitutional_amendment' && patch?.target
				? `Set ${patch.target} to ${String(patch.value)}. ${template.description}`
				: template.description,
		category,
		authorFactionId,
		cost: Math.min(template.cost, constitution.treasurySpendingCap),
		support: 0,
		opposition: 0,
		status: 'forum',
		timelockRemaining: constitution.timelockDuration,
		votesFor: 0,
		votesAgainst: 0,
		createdTurn: turn,
		constitutionalTarget: patch?.target,
		constitutionalValue: patch?.value
	};
}

export function spawnPetition(state: GameState): Petition {
	const categories: ProposalCategory[] = [
		'treasury_allocation',
		'membership_rules',
		'security_rules',
		'council_seat_rules',
		'emergency_powers',
		'constitutional_amendment'
	];
	const category = randomItem(categories);
	const backing = clamp(40 + Math.floor(Math.random() * 35) + (state.publicTrust - 50) / 4, 20, 95);
	return {
		id: makeId('petition'),
		title: `Petition: ${proposalTemplates[category].title}`,
		backing,
		targetCategory: category,
		author: 'Distributed citizen process mesh'
	};
}

function scoreProposalByFaction(proposal: Proposal, faction: Faction, state: GameState): number {
	let score = faction.reputation * 0.15 + faction.support * 0.2;
	if (proposal.category === 'treasury_allocation') {
		score += faction.treasuryPreference * 30;
		score -= proposal.cost * (1 - faction.treasuryPreference) * 0.6;
	}
	if (proposal.category === 'constitutional_amendment') {
		score += faction.constitutionalPreference * 24;
		if (proposal.constitutionalTarget === 'approvalThreshold' && typeof proposal.constitutionalValue === 'number') {
			score += proposal.constitutionalValue < state.constitution.approvalThreshold ? 8 : -6;
		}
	}
	if (proposal.category === 'security_rules' || proposal.category === 'emergency_powers') {
		score += faction.id === 'security' ? 18 : -4;
		score += state.institutionalStability < 45 ? 8 : 0;
	}
	if (proposal.category === 'membership_rules') {
		score += faction.id === 'civic' ? 12 : 0;
		score += state.legitimacy < 50 ? 4 : 0;
	}
	if (proposal.category === 'council_seat_rules') {
		score += faction.id === 'stability' ? 10 : 2;
	}
	if (proposal.cost > state.constitution.treasurySpendingCap) {
		score -= 20;
	}
	return score + Math.random() * 10;
}

function resolveForumAndVotes(state: GameState): void {
	for (const proposal of state.proposalQueue) {
		if (proposal.status === 'forum') {
			const supportPulse = clamp(
				state.publicTrust * 0.3 + state.legitimacy * 0.25 + Math.random() * 20 - proposal.cost * 0.4,
				0,
				100
			);
			proposal.support = supportPulse;
			proposal.opposition = clamp(100 - supportPulse + Math.random() * 10);
			proposal.status = 'voting';
		}

		if (proposal.status === 'voting') {
			proposal.votesFor = 0;
			proposal.votesAgainst = 0;
			for (const faction of state.factions) {
				const voteScore = scoreProposalByFaction(proposal, faction, state);
				if (voteScore >= 50) {
					proposal.votesFor += faction.influence;
				} else {
					proposal.votesAgainst += faction.influence;
				}
			}
			const totalVotes = proposal.votesFor + proposal.votesAgainst;
			const pctFor = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
			const needed =
				proposal.category === 'constitutional_amendment'
					? state.constitution.amendmentThreshold
					: state.constitution.approvalThreshold;
			if (pctFor >= needed) {
				proposal.status = 'timelock';
				proposal.timelockRemaining = state.constitution.timelockDuration;
				state.history.unshift(`${proposal.title} passed voting (${pctFor.toFixed(1)}%). Timelock engaged.`);
			} else {
				proposal.status = 'rejected';
				state.legitimacy = clamp(state.legitimacy - 2);
				state.history.unshift(`${proposal.title} failed voting (${pctFor.toFixed(1)}%).`);
			}
		}
	}
}

function executeProposal(state: GameState, proposal: Proposal): void {
	if (state.treasury < proposal.cost) {
		state.history.unshift(`${proposal.title} expired: insufficient treasury during execution.`);
		proposal.status = 'rejected';
		return;
	}
	state.treasury -= proposal.cost;
	switch (proposal.category) {
		case 'treasury_allocation':
			state.institutionalStability = clamp(state.institutionalStability + 8);
			state.publicTrust = clamp(state.publicTrust + 4);
			break;
		case 'membership_rules':
			state.legitimacy = clamp(state.legitimacy + 6);
			state.attention = clamp(state.attention + 5);
			break;
		case 'security_rules':
			state.institutionalStability = clamp(state.institutionalStability + 6);
			state.publicTrust = clamp(state.publicTrust - 5);
			break;
		case 'council_seat_rules':
			state.legitimacy = clamp(state.legitimacy + 2);
			state.institutionalStability = clamp(state.institutionalStability - 1);
			break;
		case 'emergency_powers':
			state.constitution.emergencyPowersEnabled = true;
			state.institutionalStability = clamp(state.institutionalStability + 10);
			state.legitimacy = clamp(state.legitimacy - 8);
			break;
		case 'constitutional_amendment':
			if (proposal.constitutionalTarget) {
				(state.constitution[proposal.constitutionalTarget] as number | boolean | undefined) =
					proposal.constitutionalValue;
				state.legitimacy = clamp(state.legitimacy + 5);
			}
			break;
	}
	proposal.status = 'executed';
	state.history.unshift(`${proposal.title} executed. Constitutional drift updated system incentives.`);
}

function progressTimelocks(state: GameState): void {
	for (const proposal of state.proposalQueue) {
		if (proposal.status === 'timelock') {
			proposal.timelockRemaining -= 1;
			if (proposal.timelockRemaining <= 0) {
				executeProposal(state, proposal);
			}
		}
	}
}

function applyEvent(state: GameState, event: EventCard): void {
	state.legitimacy = clamp(state.legitimacy + event.legitimacyDelta);
	state.publicTrust = clamp(state.publicTrust + event.trustDelta);
	state.institutionalStability = clamp(state.institutionalStability + event.stabilityDelta);
	state.treasury = clamp(state.treasury + event.treasuryDelta, 0, 200);
	state.attention = clamp(state.attention + event.urgency * 0.8);
	state.history.unshift(`Event: ${event.title} — ${event.description}`);
}

function maybeGenerateEvent(state: GameState): void {
	if (Math.random() < 0.75) {
		const base = randomItem(eventDeck);
		const event: EventCard = { ...base, id: makeId('event') };
		state.events.unshift(event);
		applyEvent(state, event);
	}
}

function updateFactionMetrics(state: GameState): void {
	for (const faction of state.factions) {
		const moodDelta = (state.legitimacy - 50) * 0.08 + (state.publicTrust - 50) * 0.05;
		faction.support = clamp(faction.support + moodDelta + Math.random() * 4 - 2);
		faction.reputation = clamp(faction.reputation + (state.institutionalStability - 50) * 0.03);
		faction.influence = clamp(faction.influence + (faction.support - 50) * 0.03, 5, 40);
	}
}

export function advanceTurn(state: GameState): GameState {
	const next: GameState = {
		...state,
		turn: state.turn + 1,
		constitution: { ...state.constitution },
		factions: state.factions.map((f) => ({ ...f })),
		proposalQueue: state.proposalQueue.map((p) => ({ ...p })),
		petitions: state.petitions.map((p) => ({ ...p })),
		events: state.events.map((e) => ({ ...e })),
		history: [...state.history]
	};

	maybeGenerateEvent(next);
	if (Math.random() < 0.7) {
		next.petitions.unshift(spawnPetition(next));
	}
	resolveForumAndVotes(next);
	progressTimelocks(next);
	updateFactionMetrics(next);
	next.treasury = clamp(next.treasury + 6, 0, 200);
	next.attention = clamp(next.attention - 5);
	next.proposalQueue = next.proposalQueue.slice(0, 18);
	next.petitions = next.petitions.slice(0, 10);
	next.events = next.events.slice(0, 10);
	next.history = next.history.slice(0, 12);

	if (next.legitimacy >= 80 && next.publicTrust >= 75 && next.institutionalStability >= 70 && next.turn >= 10) {
		next.winner = 'reformist';
	}
	if (next.legitimacy <= 20 || next.institutionalStability <= 15 || next.treasury <= 0) {
		next.winner = 'collapse';
	}

	return next;
}
