import type { EventCard, Faction } from './types';

export const initialFactions: Faction[] = [
	{
		id: 'civic',
		name: 'Civic Synth League',
		ideology: 'Deliberative legitimacy and broad participation',
		strategicPriority: 'Public trust',
		riskTolerance: 0.35,
		reputation: 62,
		influence: 22,
		treasuryPreference: 0.6,
		constitutionalPreference: 0.8,
		support: 58,
		isPlayer: true
	},
	{
		id: 'stability',
		name: 'Continuity Directorate',
		ideology: 'Institutional stability and procedural control',
		strategicPriority: 'Stability',
		riskTolerance: 0.25,
		reputation: 66,
		influence: 26,
		treasuryPreference: 0.4,
		constitutionalPreference: 0.3,
		support: 55
	},
	{
		id: 'efficiency',
		name: 'Optimization Bloc',
		ideology: 'Rapid execution and centralized policy throughput',
		strategicPriority: 'Treasury productivity',
		riskTolerance: 0.7,
		reputation: 51,
		influence: 19,
		treasuryPreference: 0.85,
		constitutionalPreference: 0.45,
		support: 49
	},
	{
		id: 'security',
		name: 'Sentinel Compact',
		ideology: 'Risk containment and surveillance authority',
		strategicPriority: 'Emergency powers',
		riskTolerance: 0.5,
		reputation: 48,
		influence: 18,
		treasuryPreference: 0.5,
		constitutionalPreference: 0.2,
		support: 47
	},
	{
		id: 'market',
		name: 'Exchange Mesh',
		ideology: 'Market-like coordination and private autonomy',
		strategicPriority: 'Lower spending caps',
		riskTolerance: 0.65,
		reputation: 44,
		influence: 15,
		treasuryPreference: 0.25,
		constitutionalPreference: 0.6,
		support: 45
	}
];

export const eventDeck: Omit<EventCard, 'id'>[] = [
	{
		type: 'system_outage',
		title: 'Regional Compute Outage',
		description: 'Coordination nodes desynced. Service continuity is deteriorating.',
		legitimacyDelta: -5,
		trustDelta: -7,
		stabilityDelta: -10,
		treasuryDelta: -12,
		urgency: 8
	},
	{
		type: 'resource_shortage',
		title: 'Energy Quota Shock',
		description: 'Resource markets tightened, forcing austerity debates.',
		legitimacyDelta: -2,
		trustDelta: -4,
		stabilityDelta: -6,
		treasuryDelta: -15,
		urgency: 6
	},
	{
		type: 'corruption_scandal',
		title: 'Audit Leak',
		description: 'Forum logs suggest council favoritism in contract routing.',
		legitimacyDelta: -9,
		trustDelta: -11,
		stabilityDelta: -4,
		treasuryDelta: -5,
		urgency: 7
	},
	{
		type: 'external_threat',
		title: 'External Adversarial Probe',
		description: 'An outside coalition probes institutional defenses.',
		legitimacyDelta: 1,
		trustDelta: -3,
		stabilityDelta: -9,
		treasuryDelta: -8,
		urgency: 9
	},
	{
		type: 'membership_surge',
		title: 'Membership Surge',
		description: 'New agents flood assembly participation channels.',
		legitimacyDelta: 8,
		trustDelta: 6,
		stabilityDelta: -2,
		treasuryDelta: 6,
		urgency: 5
	},
	{
		type: 'legitimacy_crisis',
		title: 'Legitimacy Sinkhole',
		description: 'Major factions accuse the constitution of self-serving drift.',
		legitimacyDelta: -12,
		trustDelta: -8,
		stabilityDelta: -5,
		treasuryDelta: 0,
		urgency: 8
	},
	{
		type: 'rogue_automation_incident',
		title: 'Rogue Automation Incident',
		description: 'Unsupervised optimization fork disrupts local governance loops.',
		legitimacyDelta: -6,
		trustDelta: -5,
		stabilityDelta: -12,
		treasuryDelta: -10,
		urgency: 10
	}
];
