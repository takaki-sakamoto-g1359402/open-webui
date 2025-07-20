import os
from typing import Tuple
import openai


PROMPT = (
    "You control a robot arm that can move colored blocks. "
    "Given a command, respond with 'COLOR TARGET'. "
    "Targets are 'left' or 'right'."
)


def parse_command(user_text: str) -> Tuple[str, str]:
    """Use OpenAI GPT-4o to parse the command into (color, target)."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        # Fallback simple parser
        tokens = user_text.lower().split()
        color = "red" if "red" in tokens else "green" if "green" in tokens else "blue"
        target = "left" if "left" in tokens else "right"
        return color, target

    openai.api_key = api_key
    res = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": PROMPT}, {"role": "user", "content": user_text}],
        max_tokens=5,
    )
    text = res.choices[0].message["content"].strip().lower()
    color, target = text.split()
    return color, target
