import pytest

from agent.tools import ToolError, tool_calc


def test_calc_blocks_unsafe_expression():
    with pytest.raises(ToolError):
        tool_calc("__import__('os').system('rm -rf /')")


def test_calc_allows_basic_math():
    result = tool_calc("2 + 3 * 4")
    assert "14" in result.output
