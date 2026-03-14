export type FactionId =
	| 'stability'
	| 'efficiency'
	| 'civic'
	| 'security'
	| 'market';

export type ProposalCategory =
	| 'treasury_allocation'
	| 'membership_rules'
	| 'security_rules'
	| 'council_seat_rules'
	| 'emergency_powers'
	| 'constitutional_amendment';

export type ProposalStatus = 'forum' | 'voting' | 'timelock' | 'executed' | 'rejected';

export type EventType =
	| 'system_outage'
	| 'resource_shortage'
	| 'corruption_scandal'
	| 'external_threat'
	| 'membership_surge'
	| 'legitimacy_crisis'
	| 'rogue_automation_incident';

export interface Constitution {
	approvalThreshold: number;
	amendmentThreshold: number;
	treasurySpendingCap: number;
	councilSize: number;
	termLength: number;
	petitionThreshold: number;
	timelockDuration: number;
	emergencyPowersEnabled: boolean;
	reviewEnabled: boolean;
}

export interface Faction {
	id: FactionId;
	name: string;
	ideology: string;
	strategicPriority: string;
	riskTolerance: number;
	reputation: number;
	influence: number;
	treasuryPreference: number;
	constitutionalPreference: number;
	support: number;
	isPlayer?: boolean;
}

export interface Proposal {
	id: string;
	title: string;
	description: string;
	category: ProposalCategory;
	authorFactionId: FactionId;
	cost: number;
	support: number;
	opposition: number;
	status: ProposalStatus;
	timelockRemaining: number;
	votesFor: number;
	votesAgainst: number;
	createdTurn: number;
	constitutionalTarget?: keyof Constitution;
	constitutionalValue?: number | boolean;
}

export interface Petition {
	id: string;
	title: string;
	backing: number;
	targetCategory: ProposalCategory;
	author: string;
}

export interface EventCard {
	id: string;
	type: EventType;
	title: string;
	description: string;
	legitimacyDelta: number;
	trustDelta: number;
	stabilityDelta: number;
	treasuryDelta: number;
	urgency: number;
}

export interface GameState {
	turn: number;
	treasury: number;
	legitimacy: number;
	publicTrust: number;
	institutionalStability: number;
	attention: number;
	constitution: Constitution;
	factions: Faction[];
	proposalQueue: Proposal[];
	petitions: Petition[];
	events: EventCard[];
	history: string[];
	winner?: 'reformist' | 'collapse';
}
