"""Entry point for Lambda-Founder."""

from .workflow import BusinessLoop
from .output_formatter import markdown_report


def main(iterations: int = 1) -> None:
    """Run Lambda-Founder for a number of iterations and print a report."""
    loop = BusinessLoop()
    results = loop.run(iterations)
    for res in results:
        print(markdown_report(res))


if __name__ == "__main__":
    main()
