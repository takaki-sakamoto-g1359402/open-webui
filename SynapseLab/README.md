# SynapseLab

A deterministic neuron & synapse sandbox inspired by BDH ideas: **local interactions + Hebbian = emergent structure (toy)**.

## Features
- Interactive 2D neuron canvas with draggable rate-based units and directed synapses.
- Real-time simulation with leak, noise, Hebbian learning, and positive sparse activations.
- Player tools to add/remove neurons, wire synapses, inject pulses, and edit global parameters.
- Analytics overlay with activation/weight histograms, activation sparsity (Gini), and live network stats.
- Mini missions introducing routing and associative recall scenarios.
- JSON save/load for graphs and settings.

## Requirements
- Godot Engine 4.2 or newer.

## Running
1. Open the project folder:
   ```bash
   godot4 -e SynapseLab/project.godot
   ```
2. In the editor press **Run ▶**.
3. Export desktop builds via **Project → Export…** using the provided `export_presets.cfg` (Windows/macOS/Linux).
4. Optional HTML5 export is a stretch goal and not configured by default.

## Gameplay Loop
- Use the HUD buttons to choose a tool (add neuron, add synapse, remove, inject pulse, select).
- Adjust parameters (learning rate, decay, leak, noise, time scale) via sliders; toggle learning and pause.
- Observe neuron colors (activation intensity) and synapse thickness (weight) as activity propagates.
- Open the analytics drawer to view histograms, Gini coefficient, active neuron percentage, and edge count.
- Try the missions for guided experiments:
  1. **Route a Signal** – keep the highlighted goal neuron active for the target duration.
  2. **Recall a Pattern** – train with two pulses, then trigger a partial cue to observe completion.
- Save your creation to JSON and load it later to continue experimenting.

## Data Files
- `data/presets.json` – Default parameters and example graphs, including mission starting layouts.
- `data/sample_save.json` – Example save generated from the default sandbox.

## License
Apache License 2.0. See `LICENSE` for details.
