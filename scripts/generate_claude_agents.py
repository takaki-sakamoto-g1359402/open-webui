import pathlib

AGENT_MAP = {
    "engineering": [
        "frontend-developer", "backend-architect", "mobile-app-builder",
        "ai-engineer", "devops-automator", "rapid-prototyper"
    ],
    "product": [
        "trend-researcher", "feedback-synthesizer", "sprint-prioritizer"
    ],
    "marketing": [
        "tiktok-strategist", "instagram-curator", "twitter-engager",
        "reddit-community-builder", "app-store-optimizer",
        "content-creator", "growth-hacker"
    ],
    "design": [
        "ui-designer", "ux-researcher", "brand-guardian",
        "visual-storyteller", "whimsy-injector"
    ],
    "project-management": [
        "experiment-tracker", "project-shipper", "studio-producer"
    ],
    "studio-operations": [
        "support-responder", "analytics-reporter",
        "infrastructure-maintainer", "legal-compliance-checker",
        "finance-tracker"
    ],
    "testing": [
        "tool-evaluator", "api-tester", "workflow-optimizer",
        "performance-benchmarker", "test-results-analyzer"
    ],
}

TEMPLATE = """---
name: \"{agent_name}\"
category: \"{category}\"
role: \"（ここに役割を日本語で記述）\"
---

## ROLE
- ここにエージェントの目的・ミッションを簡潔に記述。

## SKILL_SET
- スキル 1
- スキル 2
- スキル 3

## INPUT_FORMAT
```json
{{\"user_request\": \"string\", \"context\": \"optional\"}}
```

## OUTPUT_FORMAT
```json
{{\"assistant_response\": \"string\"}}
```
"""

def main(base_dir: str = ".claude/agents"):
    base = pathlib.Path(base_dir)
    for category, agents in AGENT_MAP.items():
        cat_dir = base / category
        cat_dir.mkdir(parents=True, exist_ok=True)
        for agent in agents:
            agent_file = cat_dir / f"{agent}.md"
            if agent_file.exists():
                continue
            agent_file.write_text(TEMPLATE.format(agent_name=agent, category=category))

if __name__ == "__main__":
    main()
