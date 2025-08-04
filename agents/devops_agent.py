"""DevOps agent that checks GitHub Actions and triggers upgrades."""

import os
import subprocess
import requests

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO = os.getenv("GITHUB_REPO", "user/repo")


def main() -> None:
    if not GITHUB_TOKEN:
        raise SystemExit("GITHUB_TOKEN not set")
    headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github+json"}
    url = f"https://api.github.com/repos/{REPO}/actions/runs"
    resp = requests.get(url, params={"branch": "main"}, headers=headers, timeout=30)
    data = resp.json()
    runs = data.get("workflow_runs", [])
    if runs and runs[0].get("conclusion") == "success":
        print("CI green, running upgrade script")
        subprocess.run(["npx", "hardhat", "run", "scripts/upgrade.js"], check=True)
    else:
        print("CI not green or no runs found")


if __name__ == "__main__":
    main()
