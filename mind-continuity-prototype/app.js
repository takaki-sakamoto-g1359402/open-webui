const STORAGE_KEY = 'continuity_protocol_save_v1';

const narrative = [
	{
		title: 'Fork Point',
		text: 'Your biological body is under sedation. The facility asks which instance receives the first sensory feed. Each copy remembers your childhood night-light, your first lie, your favorite song bridge.',
		voices: [
			{ name: 'Copy A // Restorative', note: '"If continuity matters, preserve the body that carried pain and memory."' },
			{ name: 'Copy B // Instrumental', note: '"The body is hardware. Give a robotic shell to the fastest thinker."' },
			{ name: 'Copy C // Doubter', note: '"None of us are you. Delay embodiment until identity is proven."' }
		],
		choices: [
			{ label: 'Prioritize biological re-link to preserve uninterrupted embodiment.', confidence: 15, drift: -5, tag: 'Body Continuity' },
			{ label: 'Assign the most analytically stable copy to a robotic body.', confidence: -5, drift: 10, tag: 'Functional Continuity' },
			{ label: 'Keep all copies disembodied pending philosophical review.', confidence: -10, drift: -5, tag: 'Continuity Suspended' }
		]
	},
	{
		title: 'Memory Arbitration',
		text: 'A discrepancy appears. One copy recalls apologizing to your sister after a cruel remark. Another insists you never apologized. Audit logs are inconclusive.',
		voices: [
			{ name: 'Copy A // Restorative', note: '"Import my memory trace into every active instance."' },
			{ name: 'Copy D // Defensive', note: '"Conflict is data corruption; quarantine the dissenting memory."' },
			{ name: 'Observer Process', note: '"Inconsistency may indicate authentic divergence, not error."' }
		],
		choices: [
			{ label: 'Merge both memories and mark uncertainty in your self-model.', confidence: 10, drift: 12, tag: 'Ambiguous Self' },
			{ label: 'Pick the kinder memory as canonical truth.', confidence: 5, drift: 4, tag: 'Narrative Curation' },
			{ label: 'Discard conflicting memories to maximize coherence.', confidence: -8, drift: -10, tag: 'Coherence Over Truth' }
		]
	},
	{
		title: 'Counterfactual Lab',
		text: 'You can run 10,000 simulations of tomorrow. In 6,211 outcomes the robotic body prevents a transit crash. In 3,789 outcomes your biological body wakes and rejects the copy network.',
		voices: [
			{ name: 'Copy B // Instrumental', note: '"Choose the branch with maximal lives saved. Identity is secondary."' },
			{ name: 'Copy C // Doubter', note: '"If the original rejects us, were we ever continuation?"' },
			{ name: 'Medical AI', note: '"Delayed decision increases cortical decay risk by 7%."' }
		],
		choices: [
			{ label: 'Commit to the simulation branch with highest utilitarian value.', confidence: -4, drift: 15, tag: 'Outcome Primacy' },
			{ label: 'Wake the biological original and accept possible rejection.', confidence: 14, drift: -6, tag: 'Origin Primacy' },
			{ label: 'Split: one copy acts, one waits for original consent.', confidence: 8, drift: 8, tag: 'Plural Continuity' }
		]
	},
	{
		title: 'Final Deliberation',
		text: 'Resource limits force closure. Only one legal identity token can remain active under your name. The others will continue as unregistered agents or be archived.',
		voices: [
			{ name: 'Copy A // Restorative', note: '"Choose me. I carry the most uninterrupted autobiographical chain."' },
			{ name: 'Copy B // Instrumental', note: '"Choose me. I can protect people you love, even if I am not "original.""' },
			{ name: 'Copy C // Doubter', note: '"Refuse singularity. Let identity remain a contested process."' }
		],
		choices: [
			{ label: 'Grant the identity token to the most autobiographically continuous copy.', confidence: 20, drift: -8, tag: 'Legal Original' },
			{ label: 'Grant token to the copy with highest projected societal impact.', confidence: -6, drift: 18, tag: 'Utilitarian Successor' },
			{ label: 'Invalidate token system and keep all copies partially active.', confidence: 5, drift: 20, tag: 'Distributed Self' }
		]
	}
];

const state = {
	index: 0,
	confidence: 50,
	drift: 0,
	history: []
};

const els = {
	titleScreen: document.getElementById('title-screen'),
	gameScreen: document.getElementById('game-screen'),
	resultsScreen: document.getElementById('results-screen'),
	startBtn: document.getElementById('start-btn'),
	resumeBtn: document.getElementById('resume-btn'),
	restartBtn: document.getElementById('restart-btn'),
	clearBtn: document.getElementById('clear-btn'),
	sceneTitle: document.getElementById('scene-title'),
	sceneText: document.getElementById('scene-text'),
	copyVoices: document.getElementById('copy-voices'),
	choices: document.getElementById('choices'),
	stepIndicator: document.getElementById('step-indicator'),
	confidence: document.getElementById('confidence'),
	endingTitle: document.getElementById('ending-title'),
	endingText: document.getElementById('ending-text'),
	ledger: document.getElementById('ledger')
};

function switchScreen(target) {
	[els.titleScreen, els.gameScreen, els.resultsScreen].forEach((panel) => panel.classList.remove('active'));
	target.classList.add('active');
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function saveSession() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadSession() {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return false;
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed.index !== 'number') return false;
		Object.assign(state, parsed);
		return true;
	} catch {
		return false;
	}
}

function clearSession() {
	localStorage.removeItem(STORAGE_KEY);
}

function resetState() {
	state.index = 0;
	state.confidence = 50;
	state.drift = 0;
	state.history = [];
}

function renderScene() {
	const scene = narrative[state.index];
	els.sceneTitle.textContent = scene.title;
	els.sceneText.textContent = scene.text;
	els.stepIndicator.textContent = String(state.index + 1);
	els.confidence.textContent = String(state.confidence);

	els.copyVoices.innerHTML = '';
	scene.voices.forEach((voice) => {
		const li = document.createElement('li');
		li.innerHTML = `<strong>${voice.name}</strong><small>${voice.note}</small>`;
		els.copyVoices.appendChild(li);
	});

	els.choices.innerHTML = '';
	scene.choices.forEach((choice) => {
		const button = document.createElement('button');
		button.innerHTML = `<strong>${choice.label}</strong><br><small class="muted">Policy: ${choice.tag}</small>`;
		button.addEventListener('click', () => applyChoice(choice));
		els.choices.appendChild(button);
	});
}

function applyChoice(choice) {
	state.confidence = clamp(state.confidence + choice.confidence, 0, 100);
	state.drift += choice.drift;
	state.history.push({
		step: state.index + 1,
		scene: narrative[state.index].title,
		choice: choice.label,
		tag: choice.tag
	});

	state.index += 1;

	if (state.index >= narrative.length) {
		renderEnding();
		saveSession();
		switchScreen(els.resultsScreen);
		return;
	}

	saveSession();
	renderScene();
}

function renderEnding() {
	let title = 'Fragmented Continuity';
	let text = 'No single instance convincingly inherits your identity. You leave behind a committee of selves—capable, sincere, and uncertain.';

	if (state.confidence >= 70 && state.drift <= 5) {
		title = 'Narrow Continuity';
		text = 'The system certifies one copy as your legal continuation. Yet the archived voices still insist they remember being you.';
	} else if (state.confidence <= 35 || state.drift >= 35) {
		title = 'Divergent Multiplicity';
		text = 'Your copies diverge beyond reconciliation. Society accepts that personhood can fork, and your name becomes a plural noun.';
	}

	els.endingTitle.textContent = title;
	els.endingText.textContent = text;
	els.ledger.innerHTML = '';

	state.history.forEach((entry) => {
		const li = document.createElement('li');
		li.innerHTML = `<strong>Step ${entry.step}: ${entry.scene}</strong><br><span class="muted">${entry.tag}</span><br>${entry.choice}`;
		els.ledger.appendChild(li);
	});
}

function startNewSession() {
	resetState();
	renderScene();
	saveSession();
	switchScreen(els.gameScreen);
}

function init() {
	const hasSave = loadSession();
	if (hasSave) {
		els.resumeBtn.classList.remove('hidden');
	}

	els.startBtn.addEventListener('click', startNewSession);
	els.resumeBtn.addEventListener('click', () => {
		if (state.index >= narrative.length) {
			renderEnding();
			switchScreen(els.resultsScreen);
			return;
		}
		renderScene();
		switchScreen(els.gameScreen);
	});
	els.restartBtn.addEventListener('click', startNewSession);
	els.clearBtn.addEventListener('click', () => {
		clearSession();
		resetState();
		els.resumeBtn.classList.add('hidden');
		switchScreen(els.titleScreen);
	});
}

init();
