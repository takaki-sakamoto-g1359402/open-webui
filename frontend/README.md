# Railia MVP

Railia（レイリア）は、AIが作った下書きを人が確認・修正し、品質確認を通して小さな報酬と実績を記録するクリック可能なMVPです。

## 技術構成

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 互換のローカルUIコンポーネント
- mock data + localStorage

実認証、DB、AI API、決済、本人確認、税務処理は未実装です。将来接続用の境界型は `lib/railia/ports.ts` に分離しています。

## 起動

通常のnpm環境:

```bash
npm install
npm run dev:local
```

この端末でNodeだけを直接使う場合:

```bash
/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/next/dist/bin/next dev -H 127.0.0.1 -p 3000
```

確認URL:

```text
http://127.0.0.1:3000
```

## 検証

```bash
npm run verify
npm run typecheck
npm run lint
npm run build
```

この端末でNodeだけを直接使う場合:

```bash
/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/verify-railia-mvp.mjs
/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
NEXT_TELEMETRY_DISABLED=1 /Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/next/dist/bin/next lint
NEXT_TELEMETRY_DISABLED=1 /Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/next/dist/bin/next build
```

## 完成確認済みの主要導線

1. ロール選択でワーカーとして入る
2. ワーカーダッシュボードからタスク作業ページを開く
3. AI下書きを編集し、品質チェックリストをすべて確認する
4. 提出して確認待ち報酬をウォレットで見る
5. クライアントとして提出物を承認する
6. 管理者としてモック支払い済みにする
7. 監査ログで提出、承認、報酬更新を確認する
