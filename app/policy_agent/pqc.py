import re
from typing import Dict, List


PATTERNS = {
    "RSA": re.compile(r"rsa", re.IGNORECASE),
    "ECDSA": re.compile(r"ecdsa|secp256r1|p-256|p256|secp384r1", re.IGNORECASE),
    "Ed25519": re.compile(r"ed25519", re.IGNORECASE),
    "X25519": re.compile(r"x25519", re.IGNORECASE),
    "TLS1.2": re.compile(r"tls1\.2", re.IGNORECASE),
    "TLS1.3": re.compile(r"tls1\.3", re.IGNORECASE),
}


def scan_text(text: str) -> Dict[str, List[str]]:
    findings: List[str] = []
    for name, pattern in PATTERNS.items():
        if pattern.search(text):
            findings.append(name)
    return {"findings": findings}


def checklist(findings: List[str]) -> str:
    bullets = ["- 目的: 量子計算への備えとして暗号の在庫を可視化する"]
    if findings:
        bullets.append(f"- 現在検出された要素: {', '.join(findings)}")
    bullets.extend(
        [
            "- インベントリ: TLS/SSH/VPN の設定で RSA/ECDSA/Ed25519 を一覧化",
            "- 可能であれば TLS1.3 と最新ライブラリを有効化",
            "- ハイブリッド鍵交換（PQC + 既存楕円曲線）を検討",
            "- ベンダーの PQC ロードマップを確認し、移行テスト計画を作成",
            "- 証跡: 設定ファイルと変更履歴を記録",
        ]
    )
    return "\n".join(bullets)

