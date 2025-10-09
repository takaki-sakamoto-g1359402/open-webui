"""Safe Python execution tool."""
from __future__ import annotations

import io
import math
from typing import Any, Dict

from . import BaseTool, ToolError, ToolResult

SAFE_BUILTINS: Dict[str, Any] = {
    "abs": abs,
    "min": min,
    "max": max,
    "sum": sum,
    "len": len,
    "range": range,
}


class PythonExecutionTool(BaseTool):
    name = "python_exec"
    description = "Execute sandboxed Python snippets"

    def __init__(self, safety):
        super().__init__(safety)
        self.allowed_modules = {"math"}

    def run(self, code: str, **_: Any) -> ToolResult:
        self.safety.ensure_python_code_safe(code, allowed_modules=self.allowed_modules)
        buffer = io.StringIO()

        def safe_print(*args: Any, **kwargs: Any) -> None:
            text = " ".join(str(arg) for arg in args)
            buffer.write(text + "\n")

        builtins_env = dict(SAFE_BUILTINS)
        builtins_env["print"] = safe_print
        env: Dict[str, Any] = {"__builtins__": builtins_env, "math": math}
        try:
            exec(compile(code, "<python_exec>", "exec"), env, env)
        except Exception as exc:  # pragma: no cover - depends on runtime code
            raise ToolError(str(exc)) from exc
        result_value = env.get("result")
        output = buffer.getvalue()
        if result_value is not None:
            output += f"result={result_value!r}"
        return ToolResult(success=True, output=output.strip())

