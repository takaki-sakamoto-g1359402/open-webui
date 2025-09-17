import os, json, requests

GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
REPO = os.environ["GITHUB_REPOSITORY"]
PR_NUMBER = os.environ["PR_NUMBER"]
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

GH = "https://api.github.com"
gh_headers = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json"
}

# 1) 変更ファイルとパッチ取得
files = []
url = f"{GH}/repos/{REPO}/pulls/{PR_NUMBER}/files?per_page=100"
while url:
    r = requests.get(url, headers=gh_headers); r.raise_for_status()
    files.extend(r.json())
    url = r.links.get('next', {}).get('url')

diff_snippets = []
total_chars = 0
limit = 30000  # トークン対策
for f in files:
    patch = f.get("patch") or ""
    if not patch:
        continue
    snippet = f"### {f['filename']}\n```\n{patch[:8000]}\n```\n"
    if total_chars + len(snippet) > limit:
        break
    diff_snippets.append(snippet)
    total_chars += len(snippet)

diff_text = "\n".join(diff_snippets) or "_No diff patch available_"

system = (
    "あなたは一流のシニアソフトウェアエンジニア兼セキュリティレビュワーです。\n"
    "- 重大バグ/設計不整合/セキュリティ/性能/テスト欠落を具体的に指摘\n"
    "- 修正パッチ例（抜粋）と影響範囲・追加テスト案を提示\n"
    "- 箇条書きで簡潔に、最後に“結論: approve/changes requested/blocker”を明記"
)
user = (
    f"対象PR: {REPO} #{PR_NUMBER}\n\n"
    f"変更差分（抜粋）:\n{diff_text}\n\n"
    "レビュー優先順位:\n"
    "1) セキュリティ重大 2) 仕様逸脱/例外/並行性 3) 性能 4) 可読性 5) テスト"
)

# 2) OpenAI Chat Completions
resp = requests.post(
    "https://api.openai.com/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    },
    data=json.dumps({
        "model": OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ],
        "temperature": 0.2
    })
)
resp.raise_for_status()
review_text = resp.json()["choices"][0]["message"]["content"]

# 3) PR へコメント投稿
comment = {"body": f"## 🤖 Codex Review\n\n{review_text}"}
post = requests.post(
    f"{GH}/repos/{REPO}/issues/{PR_NUMBER}/comments",
    headers=gh_headers,
    data=json.dumps(comment)
)
post.raise_for_status()
print("Posted Codex review comment.")
