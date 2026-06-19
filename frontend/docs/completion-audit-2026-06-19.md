# Railia MVP Completion Audit

## 現在の判定

Railia MVPは、クリック可能な初期MVPとして主要受け入れ条件を満たしています。

確認URL:

```text
http://127.0.0.1:3000
```

## 実装済み

- ブランド名をRailiaに統一
- ランディング、ロール選択、ワーカー、タスク一覧、タスク作業、ウォレット、レベル、クライアント、管理者の各ページ
- ワーカー、クライアント、管理者のmock role selector
- mock dataとlocalStorageのみの状態管理
- 8カテゴリのタスクseed
- 3 workers、2 clients、admin、6 submissions、reward history、audit logs、flags
- AI下書き、編集可能な最終回答、5項目品質チェックリスト
- 提出、確認待ち報酬、承認、差し戻し、管理者モック支払い
- 差し戻し理由表示と1回までの再提出
- レベル進捗、次レベル要件、品質スコア表示
- クライアント依頼作成フォーム
- 管理者の確認待ち提出、フラグ、不審活動placeholder、ユーザー、全タスク履歴、監査ログ
- ロールガード
- 将来のSupabase、OpenAI API、決済、本人確認、税務対応のためのport型
- seed整合性とMVP要件の検証スクリプト

## 検証結果

2026-06-19に以下を確認しました。

```text
node scripts/verify-railia-mvp.mjs
Railia MVP verify passed.
```

```text
tsc --noEmit --incremental false --pretty false
exit 0
```

```text
next lint
No ESLint warnings or errors
```

```text
next build
Compiled successfully. 11 routes generated.
```

ブラウザ操作でも、seed状態から以下の導線を確認しました。

```text
roles -> worker -> task-7 -> submit -> wallet -> client approve -> admin paid -> audit log
passed: true
console issues: []
```

## 次の完成度引き上げ項目

- npmが通常PATHにない端末向けに、Node/npm環境を整備する
- GitHub PR用にRailiaだけを切り出したbranch/commitを作る
- Playwrightのブラウザバイナリを入れてスクリーンショット付きE2Eを追加する
- `submitted` と `under_review` を別状態として見せるか、仕様文言を確認待ちに統一する
- Supabase/OpenAI/決済/本人確認/税務の実装設計をportごとにissue化する
