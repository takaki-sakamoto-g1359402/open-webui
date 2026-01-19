"""Sandboxed tool implementations."""
from __future__ import annotations

import ast
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


class ToolError(ValueError):
    """Raised when a tool cannot safely execute."""


@dataclass
class ToolResult:
    name: str
    output: str


NOTES_FILE = Path("notes.txt")


def tool_note(text: str) -> ToolResult:
    """Append a note to the local notes file."""
    NOTES_FILE.write_text(
        NOTES_FILE.read_text() + f"{text}\n" if NOTES_FILE.exists() else f"{text}\n"
    )
    return ToolResult(name="note", output=f"Noted: {text}")


_ALLOWED_NODES = (
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.Num,
    ast.Constant,
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.Mod,
    ast.Pow,
    ast.USub,
    ast.UAdd,
    ast.Load,
    ast.FloorDiv,
)


def _safe_eval(node: ast.AST) -> float:
    if not isinstance(node, _ALLOWED_NODES):
        raise ToolError("Unsafe expression")
    if isinstance(node, ast.Expression):
        return _safe_eval(node.body)
    if isinstance(node, (ast.Num, ast.Constant)):
        if isinstance(node.value if isinstance(node, ast.Constant) else node.n, (int, float)):
            return node.value if isinstance(node, ast.Constant) else node.n
        raise ToolError("Only numeric constants allowed")
    if isinstance(node, ast.UnaryOp):
        operand = _safe_eval(node.operand)
        return -operand if isinstance(node.op, ast.USub) else operand
    if isinstance(node, ast.BinOp):
        left = _safe_eval(node.left)
        right = _safe_eval(node.right)
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            return left / right
        if isinstance(node.op, ast.FloorDiv):
            return left // right
        if isinstance(node.op, ast.Mod):
            return left % right
        if isinstance(node.op, ast.Pow):
            return left**right
    raise ToolError("Unsupported expression")


def tool_calc(expr: str) -> ToolResult:
    """Safely evaluate a math expression."""
    try:
        node = ast.parse(expr, mode="eval")
    except SyntaxError as exc:
        raise ToolError("Invalid expression") from exc
    result = _safe_eval(node)
    return ToolResult(name="calc", output=f"{expr.strip()} = {result}")


def tool_todo_add(conn, item: str) -> ToolResult:
    """Add a todo item to SQLite."""
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO todos (item, created_at) VALUES (?, ?)",
        (item, datetime.utcnow().isoformat()),
    )
    conn.commit()
    return ToolResult(name="todo_add", output=f"Added todo: {item}")


def tool_todo_list(conn) -> ToolResult:
    """List todo items."""
    cursor = conn.cursor()
    cursor.execute("SELECT id, item, created_at FROM todos ORDER BY id DESC")
    rows = cursor.fetchall()
    lines = [f"{row['id']}. {row['item']} ({row['created_at']})" for row in rows]
    output = "\n".join(lines) if lines else "No todos yet."
    return ToolResult(name="todo_list", output=output)
