"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  Coins,
  Gauge,
  Home,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useRailia } from "@/lib/railia/state";
import type { Task, TaskStatus, UserRole } from "@/lib/railia/types";
import { auditActionLabel, shortDate, taskStatusLabel, yen } from "@/lib/railia/view";
import { cn } from "@/lib/utils";

const roleLabels: Record<UserRole, string> = {
  worker: "ワーカー",
  client: "クライアント",
  admin: "管理者"
};

const workerNav = [
  { href: "/worker", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/worker/tasks", label: "タスク一覧", icon: ListChecks },
  { href: "/worker/wallet", label: "ウォレット", icon: WalletCards },
  { href: "/worker/levels", label: "レベル", icon: Gauge }
];

const clientNav = [{ href: "/client", label: "依頼管理", icon: ClipboardCheck }];
const adminNav = [{ href: "/admin", label: "運営確認", icon: ShieldCheck }];

function getNav(role: UserRole | null) {
  if (role === "client") return clientNav;
  if (role === "admin") return adminNav;
  return workerNav;
}

export function RequireRole({
  role,
  children
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const { state, hasHydrated } = useRailia();
  const selectedRole = state.selectedRole;
  const canView = selectedRole === role;

  if (!hasHydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <BrandMark />
            <CardTitle>デモ状態を確認しています</CardTitle>
            <CardDescription>
              保存済みのロールと作業状態を読み込んでいます。
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <BrandMark />
            <CardTitle>{roleLabels[role]}用の画面です</CardTitle>
            <CardDescription>
              現在のロールではこの画面を表示できません。ロールを選び直してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/roles">ロール選択へ</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">トップへ戻る</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
        R
      </span>
      {!compact ? (
        <span className="min-w-0">
          <span className="block text-base font-bold leading-tight">Railia</span>
          <span className="block truncate text-xs text-muted-foreground">
            AIで小さく働き、実績を積む
          </span>
        </span>
      ) : null}
    </Link>
  );
}

export function RailiaShell({
  children,
  title,
  description,
  action
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { activeUser, state, resetDemo } = useRailia();
  const role = state.selectedRole ?? activeUser?.role ?? "worker";
  const nav = getNav(role);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/roles">
                <UserRound data-icon="inline-start" />
                ロール変更
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={resetDemo}>
              デモを初期化
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b bg-primary text-primary-foreground lg:min-h-[calc(100vh-65px)] lg:border-b-0 lg:border-r">
          <div className="flex gap-2 overflow-x-auto px-4 py-3 lg:flex-col lg:overflow-visible lg:p-4">
            <div className="hidden px-2 pb-3 text-sm text-primary-foreground/75 lg:block">
              {activeUser ? `${activeUser.name} / ${roleLabels[role]}` : "デモユーザー"}
            </div>
            {nav.map((item) => {
              const Icon = item.icon;
              const selected = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-primary-foreground/82 transition-colors hover:bg-primary-foreground/12",
                    selected && "bg-primary-foreground text-primary"
                  )}
                >
                  <Icon />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-primary-foreground/82 transition-colors hover:bg-primary-foreground/12"
            >
              <Home />
              トップ
            </Link>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-6 lg:px-6 lg:py-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-normal md:text-3xl">{title}</h1>
              {description ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  progress
}: {
  title: string;
  value: string;
  description?: string;
  icon: typeof Sparkles;
  progress?: number;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 pb-3">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        <Icon className="text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        {typeof progress === "number" ? <Progress value={progress} className="mt-4" /> : null}
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const variant =
    status === "approved" || status === "paid"
      ? "default"
      : status === "rejected"
        ? "destructive"
        : status === "under_review" || status === "submitted"
          ? "secondary"
          : "outline";
  return <Badge variant={variant}>{taskStatusLabel[status]}</Badge>;
}

export function TaskCard({
  task,
  actionLabel = "作業する",
  href
}: {
  task: Task;
  actionLabel?: string;
  href: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{task.category}</Badge>
          <StatusBadge status={task.status} />
        </div>
        <CardTitle className="leading-6">{task.title}</CardTitle>
        <CardDescription>{task.instructions}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">目安</p>
            <p className="font-semibold">{task.estimatedMinutes}分</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">報酬</p>
            <p className="font-semibold">{yen(task.rewardAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">難易度</p>
            <p className="font-semibold">{task.difficulty}</p>
          </div>
        </div>
        {task.rejectionReason ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {task.rejectionReason}
          </p>
        ) : null}
        <Button asChild className="w-full">
          <Link href={href}>{actionLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function AuditLogList({ limit = 8 }: { limit?: number }) {
  const { state } = useRailia();
  const logs = [...state.auditLogs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>監査ログ</CardTitle>
        <CardDescription>タスク操作、承認、報酬更新を追跡します。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {logs.map((log) => (
          <div key={log.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-[120px_120px_minmax(0,1fr)]">
            <span className="text-xs text-muted-foreground">{shortDate(log.createdAt)}</span>
            <Badge variant="muted">{auditActionLabel[log.action]}</Badge>
            <span className="text-sm leading-6">{log.detail}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TrustNotice() {
  return (
    <div className="rounded-lg border bg-card p-4 text-sm leading-6 text-muted-foreground">
      これは一攫千金ではなく、AI支援で小さく働きながら実績を積む仕組みです。提出物は人間の確認を通り、報酬・差し戻し・監査ログが記録されます。
    </div>
  );
}

export function BalanceStrip({
  available,
  pending,
  paid
}: {
  available: number;
  pending: number;
  paid: number;
}) {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-5 md:grid-cols-3">
        <div>
          <p className="text-sm text-muted-foreground">利用可能残高</p>
          <p className="mt-1 text-2xl font-bold">{yen(available)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">確認待ち報酬</p>
          <p className="mt-1 text-2xl font-bold">{yen(pending)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">支払い済み</p>
          <p className="mt-1 text-2xl font-bold">{yen(paid)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <Separator className="mt-4" />
    </div>
  );
}

export { Coins, Gauge, LayoutDashboard, ListChecks, ShieldCheck, Sparkles, WalletCards };
