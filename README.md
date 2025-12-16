# swarm_ew — SITL-Only Swarm Early Warning Research Platform

> **研究・教育用シミュレーション（SITL）に限定して利用してください。実機禁止・兵器化禁止・監視濫用禁止・人間による承認（HITL）必須です。**

`swarm_ew` は ROS 2 Humble と Gazebo を前提とした非武装・非威嚇の早期検知研究プラットフォームです。すべての活動はシミュレーション内で完結し、強制的なジオフェンス、速度/加速度上限、安全距離、フェイルセーフ、およびログ監査の整備を前提に設計されています。

## Quickstart (SITL Only)

```bash
make setup
make build
make test
# 以降のマイルストーンで有効化予定
make sim
```

- `make setup` — Python 仮想環境と依存関係を初期化します。
- `make build` — ROS 2 パッケージのコロンビルドを行います（現時点ではスケルトンのため no-op です）。
- `make test` — `pytest` によるテストラン（現時点ではプレースホルダ）。
- `make sim` / `make eval` — 今後のマイルストーンで実装予定のワークフローです。

## Repository Layout

```
packages/
  ew_agent/        # 個別エージェント制御ノード（SITLのみ）
  ew_coordinator/  # 群制御・タスク配分ノード（SITLのみ）
  ew_sim/          # Gazebo ベースのシミュレーション統合
  ew_eval/         # オフライン評価ワークフロー
  ew_msgs/         # 共有メッセージ定義プレースホルダ
src/common/
  safety_guard.py  # ジオフェンスやHITL確認の共通実装 (今後追加)
```

`docs/` ディレクトリには初期ドラフトの倫理・安全関連ドキュメント（ETHICS, COMPLIANCE, LIMITATIONS, SAFETY_CASE）が含まれます。リポジトリに変更を加える際は、これらの文書を常に参照し、必要に応じて更新してください。

## Development Environment

- Python 3.10
- ROS 2 Humble + Gazebo (SITL)
- 依存 Python ライブラリ: `numpy`, `scipy`, `networkx`, `matplotlib`, `pytest`, `ruff`, `mypy`, `pyyaml`, `pandas`

Docker を利用する場合は提供されている `Dockerfile` をビルドすることで、SITL 研究用の依存関係が整ったベースイメージを作成できます。実機へのデプロイや遠隔操作は一切サポートしません。

## Safety, Ethics, and Compliance

- [docs/ETHICS.md](docs/ETHICS.md) — 倫理指針
- [docs/COMPLIANCE.md](docs/COMPLIANCE.md) — 準拠事項チェックリスト
- [docs/LIMITATIONS.md](docs/LIMITATIONS.md) — 既知の制約と仮定
- [docs/SAFETY_CASE.md](docs/SAFETY_CASE.md) — 安全性主張アウトライン

これらの文書はシミュレーション専用の安全運用を保証するためのベースラインです。危険な変更要求があった場合は、HITL レビューにより拒否される場合があります。

## Continuous Integration

`.github/workflows/ci.yml` では以下を実行します。

- Ruff / mypy / pytest による lint・型チェック・単体テスト
- ROS 2 Humble 環境での `colcon build --packages-select "ew_*"`

## ライセンス

[Apache-2.0](LICENSE)

## Humanoid Fleet Management PoC

This repository now includes a minimal, extensible **Humanoid Fleet Management** loop for space-age humanoid robots. It couples a toy digital twin with a mock real-world adapter to demonstrate automated V→R→V cycles.

### Quickstart

```bash
# install lightweight dependencies for the PoC
pip install -r requirements.txt

# run the unit tests
pytest tests/test_models.py tests/test_orchestrator.py

# start the HTTP API
uvicorn api.server:app --reload

# run a short demo loop (three cycles)
python - <<'PY'
from fleet_core.models import RobotSpec
from fleet_core.orchestrator import Orchestrator
from real_r.adapters.mock import MockRealWorldAdapter
from sim_v.env import VirtualEnv

specs = [RobotSpec(robot_id=f"demo-{i}", max_velocity=1.0, payload_capacity=5.0) for i in range(2)]
env = VirtualEnv(specs)
orchestrator = Orchestrator(env=env, adapter=MockRealWorldAdapter(env))
for _ in range(3):
    state = orchestrator.run_cycle()
    print({r.robot_id: (r.position, r.status) for r in state.robots})
PY
```

The loop writes persistent JSONL logs to `runs/fleet_loop.jsonl` and the architecture is documented in `docs/overview.md`.
