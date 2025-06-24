import os
from typing import Any
import openai


def ask(prompt: str) -> str:
    """Return the LLM's response to *prompt* using GPT-4o.

    This function provides a very small wrapper around
    :func:`openai.ChatCompletion.create` configured to use the
    ``gpt-4o`` model.

    The OpenAI API key is read from the environment variable
    ``OPENAI_API_KEY`` on every call.  If the variable is missing
    an exception is raised.  Only the first completion message's
    content is returned.

    Parameters
    ----------
    prompt:
        The user prompt that will be sent to the model.

    Returns
    -------
    str
        The textual content of the model's response.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set")

    openai.api_key = api_key

    response: Any = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
    )
    return response["choices"][0]["message"]["content"].strip()
