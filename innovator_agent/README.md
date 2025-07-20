# Innovator Agent

This is a lightweight demo of the "P0 Innovator Agent". The agent sorts
colored blocks in a PyBullet simulation using simple natural language
commands.

## Setup

```bash
cd innovator_agent
poetry install --without vision
```

For vision encoder support (requires PyTorch and timm):

```bash
poetry install --with vision
```

Set your OpenAI API key if you want to use GPT-4o for parsing:

```bash
export OPENAI_API_KEY=sk-...
```

## Running the Demo

```bash
python demo.py
```

Enter a command such as:

```
赤ブロックを左側へ
```

The agent will attempt to move the specified block and print `SUCCESS` on
completion. After each episode a suggestion is printed based on past
failures stored in `history.db`.

## Testing

```bash
poetry run pytest --cov=innovator_agent -q
```
