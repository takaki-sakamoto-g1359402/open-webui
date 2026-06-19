import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = process.cwd();
const fail = [];

function assert(condition, message) {
  if (!condition) fail.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

async function loadSeedState() {
  const seedPath = path.join(root, "lib/railia/seed.ts");
  const source = fs.readFileSync(seedPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false
    },
    fileName: seedPath
  }).outputText;
  const tempFile = path.join(os.tmpdir(), `railia-seed-${Date.now()}.mjs`);
  fs.writeFileSync(tempFile, output, "utf8");
  try {
    const mod = await import(pathToFileURL(tempFile).href);
    return mod.initialRailiaState;
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
}

const requiredRoutes = [
  "app/page.tsx",
  "app/roles/page.tsx",
  "app/worker/page.tsx",
  "app/worker/tasks/page.tsx",
  "app/worker/tasks/[taskId]/page.tsx",
  "app/worker/wallet/page.tsx",
  "app/worker/levels/page.tsx",
  "app/client/page.tsx",
  "app/admin/page.tsx"
];

for (const route of requiredRoutes) {
  assert(exists(route), `必須ルートがありません: ${route}`);
}

const packageJson = JSON.parse(read("package.json"));
assert(packageJson.scripts?.typecheck === "tsc --noEmit", "typecheck script がありません。");
assert(packageJson.scripts?.verify === "node scripts/verify-railia-mvp.mjs", "verify script がありません。");
assert(!exists("pnpm-lock.yaml"), "npm構成にpnpm-lock.yamlが混在しています。");
assert(!exists("pnpm-workspace.yaml"), "npm構成にpnpm-workspace.yamlが混在しています。");

const appText = [
  "components/railia/landing-page.tsx",
  "components/railia/common.tsx",
  "components/railia/task-work-page.tsx",
  "components/railia/client-dashboard-page.tsx",
  "components/railia/admin-dashboard-page.tsx",
  "components/railia/wallet-page.tsx",
  "components/railia/level-page.tsx",
  "lib/railia/view.ts"
].map(read).join("\n");

assert(appText.includes("AIで小さく働き、小さく稼ぎ、実績を積む"), "指定されたランディング見出しがありません。");
assert(appText.includes("ワーカーとして始める"), "ワーカーCTAがありません。");
assert(appText.includes("仕事を依頼する"), "クライアントCTAがありません。");
assert(appText.includes("これは一攫千金ではなく、AI支援で小さく働きながら実績を積む仕組みです。"), "安全性メッセージがありません。");
assert(appText.includes("誤字脱字はないか") && appText.includes("個人情報は含まれていないか"), "品質チェックリストが不足しています。");
assert(exists("lib/railia/ports.ts"), "将来API接続用のports.tsがありません。");

const protectedRoutes = [
  ["app/worker/page.tsx", 'RequireRole role="worker"'],
  ["app/worker/tasks/page.tsx", 'RequireRole role="worker"'],
  ["app/worker/tasks/[taskId]/page.tsx", 'RequireRole role="worker"'],
  ["app/worker/wallet/page.tsx", 'RequireRole role="worker"'],
  ["app/worker/levels/page.tsx", 'RequireRole role="worker"'],
  ["app/client/page.tsx", 'RequireRole role="client"'],
  ["app/admin/page.tsx", 'RequireRole role="admin"']
];

for (const [route, marker] of protectedRoutes) {
  assert(read(route).includes(marker), `ロールガードが不足しています: ${route}`);
}

const state = await loadSeedState();
const users = state.users ?? [];
const tasks = state.tasks ?? [];
const submissions = state.submissions ?? [];
const rewards = state.rewards ?? [];
const auditLogs = state.auditLogs ?? [];
const flags = state.flags ?? [];
const clientJobs = state.clientJobs ?? [];

assert(tasks.length >= 8, "seed task は8件以上必要です。");
assert(users.filter((user) => user.role === "worker").length >= 3, "worker seed は3名以上必要です。");
assert(users.filter((user) => user.role === "client").length >= 2, "client seed は2名以上必要です。");
assert(users.some((user) => user.role === "admin"), "admin seed が必要です。");
assert(submissions.length >= 6, "submission seed は6件以上必要です。");
assert(rewards.length >= 5, "reward history seed が不足しています。");
assert(auditLogs.length >= 6, "audit log seed が不足しています。");
assert(flags.length >= 2, "flag seed が不足しています。");
assert(clientJobs.length >= 2, "client job seed が不足しています。");

const requiredCategories = ["文章修正", "商品説明作成", "SNS投稿案", "字幕修正", "口コミ要約", "問い合わせ返信案", "データ確認", "リサーチ整理"];
const taskCategories = new Set(tasks.map((task) => task.category));
for (const category of requiredCategories) {
  assert(taskCategories.has(category), `必須カテゴリのseed taskがありません: ${category}`);
}

const taskById = new Map(tasks.map((task) => [task.id, task]));
const submissionById = new Map(submissions.map((submission) => [submission.id, submission]));
const userById = new Map(users.map((user) => [user.id, user]));

for (const submission of submissions) {
  const task = taskById.get(submission.taskId);
  assert(Boolean(task), `submission ${submission.id} の taskId が不正です。`);
  assert(Boolean(userById.get(submission.workerId)), `submission ${submission.id} の workerId が不正です。`);
  if (!task) continue;
  assert(task.clientId === submission.clientId, `submission ${submission.id} の clientId が task と一致しません。`);
  assert(task.assignedWorkerId === submission.workerId, `submission ${submission.id} の worker 割当が task と一致しません。`);
  if (submission.status === "under_review") {
    assert(
      task.status === "under_review" || task.status === "submitted",
      `submission ${submission.id} は確認待ちですが task が提出済み/確認待ちではありません。`
    );
  }
  if (submission.status === "approved") assert(task.status === "approved", `submission ${submission.id} は承認済みですが task が承認済みではありません。`);
  if (submission.status === "rejected") assert(task.status === "rejected", `submission ${submission.id} は差し戻しですが task が差し戻しではありません。`);
  if (submission.status === "paid") assert(task.status === "paid", `submission ${submission.id} は支払い済みですが task が支払い済みではありません。`);
}

for (const reward of rewards) {
  const submission = submissionById.get(reward.submissionId);
  assert(Boolean(taskById.get(reward.taskId)), `reward ${reward.id} の taskId が不正です。`);
  assert(Boolean(submission), `reward ${reward.id} の submissionId が不正です。`);
  if (!submission) continue;
  assert(reward.workerId === submission.workerId, `reward ${reward.id} の workerId が submission と一致しません。`);
  assert(reward.amount === submission.rewardAmount, `reward ${reward.id} の金額が submission と一致しません。`);
  if (reward.status === "pending") assert(submission.status === "under_review", `reward ${reward.id} は確認待ちですが submission が確認待ちではありません。`);
  if (reward.status === "available") assert(submission.status === "approved", `reward ${reward.id} は利用可能ですが submission が承認済みではありません。`);
  if (reward.status === "paid") assert(submission.status === "paid", `reward ${reward.id} は支払い済みですが submission が支払い済みではありません。`);
  if (reward.status === "cancelled") assert(submission.status === "rejected", `reward ${reward.id} は取消ですが submission が差し戻しではありません。`);
}

if (fail.length > 0) {
  console.error(["Railia MVP verify failed:", ...fail.map((item) => `- ${item}`)].join("\n"));
  process.exit(1);
}

console.log("Railia MVP verify passed.");
