"""Prompt generation utilities."""
from typing import Dict
from jinja2 import Template


def generate_prompt(template: str, context: Dict[str, object]) -> str:
    """Render a Jinja2 template with context values."""
    return Template(template).render(**context)
