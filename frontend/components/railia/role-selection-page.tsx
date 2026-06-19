"use client";

import { useRouter } from "next/navigation";
import { BriefcaseBusiness, ShieldCheck, UserCheck } from "lucide-react";

import { BrandMark, TrustNotice } from "@/components/railia/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRailia } from "@/lib/railia/state";
import type { UserRole } from "@/lib/railia/types";

const roles: Array<{
  role: UserRole;
  title: string;
  description: string;
  action: string;
  href: string;
  icon: typeof UserCheck;
}> = [
  {
    role: "worker",
    title: "ワーカー",
    description: "AI下書きを確認・修正し、小さなタスクで実績を積みます。",
    action: "ワーカーで入る",
    href: "/worker",
    icon: UserCheck
  },
  {
    role: "client",
    title: "クライアント",
    description: "小さな依頼を作成し、提出物を人の目で承認・差し戻しします。",
    action: "依頼者で入る",
    href: "/client",
    icon: BriefcaseBusiness
  },
  {
    role: "admin",
    title: "管理者",
    description: "確認待ち、フラグ、監査ログを見て品質と安全性を守ります。",
    action: "管理者で入る",
    href: "/admin",
    icon: ShieldCheck
  }
];

export function RoleSelectionPage() {
  const router = useRouter();
  const { selectRole } = useRailia();

  const choose = (role: UserRole, href: string) => {
    selectRole(role);
    router.push(href);
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/90">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <BrandMark />
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-normal">ロールを選択</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            このMVPでは認証を実装せず、ロールごとの画面遷移と権限イメージを確認します。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.role}>
                <CardHeader>
                  <span className="grid size-11 place-items-center rounded-lg bg-secondary text-primary">
                    <Icon />
                  </span>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                  <Button onClick={() => choose(item.role, item.href)}>{item.action}</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <TrustNotice />
      </section>
    </main>
  );
}
