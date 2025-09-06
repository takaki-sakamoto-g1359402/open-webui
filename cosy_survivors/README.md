# コージーサバイバーズ (MVP)

## セットアップ
1. [Godot 4.3](https://godotengine.org) をインストール。
2. この `cosy_survivors` フォルダをプロジェクトとして開く。
3. `project.godot` のメインシーンは `scenes/Main.tscn` に設定済み。

## エクスポート
- **Android (ARMv8)**: Godot エディタのエクスポートプリセットから Android を選択。
- **Windows / macOS**: 同様にそれぞれのプリセットでエクスポート。

## 調整
- ゲームバランスは `res://data/*.json` を編集。
  - `waves.json` 敵出現
  - `weapons.json` 武器パラメータ
  - `upgrades.json` レベルアップ選択肢

## モバイル最適化メモ
- オブジェクトプールで GC を削減。
- 描画は簡易シェイプのみでバッチ数を最小化。
- RNG は `Globals.gd` でシード設定可能。

## TODO
- オンライン協力プレイ
- シーズンイベント
- コスメティックスキン
