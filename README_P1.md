# Innovator Agent P1 Swarm PoC

This proof of concept extends the P0 demo to a small swarm of
collaborating robots. Each robot runs its own agent and shares the best
policy via a simple pub/sub bus. Episodic memory is stored in PostgreSQL
with the pgvector extension.

## Prerequisites
- Docker (for PostgreSQL)
- Python 3.11

## Setup
Start the database:

```bash
docker-compose -f docker-compose.pgvector.yaml up -d
```

Set the database URL for the agents:

```bash
export PG_URL=postgresql://agent:agent@localhost:5432/agentdb
```

Install Python dependencies with Poetry (optional extras for vision):

```bash
cd innovator_agent
poetry install --with vision
```

## Launch the Swarm

Run the ROS2-style launch file which will start five robot threads:

```bash
ros2 launch innovator_agent swarm.launch.py
```

Press `Ctrl+C` to stop. If any robot misses three heartbeats the
supervisor prints `SAFE_SHUTDOWN` and exits.
