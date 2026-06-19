"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, CheckCircle2, ClipboardCheck, UserRound } from "lucide-react";

import { BrandMark, TrustNotice } from "@/components/railia/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRailia } from "@/lib/railia/state";

const steps = [
  { title: "AIが下書きを作る", description: "入力内容から、まずAIが確認しやすい初稿を作ります。", icon: Bot },
  { title: "人間が確認・修正する", description: "ワーカーが事実、表現、個人情報を確認して整えます。", icon: UserRound },
  { title: "品質が通れば報酬が入る", description: "クライアントまたは運営の承認後、報酬が記録されます。", icon: CheckCircle2 }
];

export function LandingPage() {
  const router = useRouter();
  const { selectRole } = useRailia();

  const choose = (role: "worker" | "client") => {
    selectRole(role);
    router.push(role === "worker" ? "/worker" : "/client");
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
          <BrandMark />
          <Button variant="outline" asChild>
            <Link href="/roles">ロールを選ぶ</Link>
          </Button>
        </div>
      </header>

      <section className="rail-grid">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:px-6 lg:py-14">
          <div className="flex flex-col justify-center gap-6">
            <Badge variant="secondary" className="w-fit">
              Railia（レイリア）
            </Badge>
            <div>
              <h1 className="text-4xl font-bold leading-tight tracking-normal md:text-5xl">
                AIで小さく働き、小さく稼ぎ、実績を積む
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Railiaは、AIの下書きを人が確認・修正し、品質確認を通して小さな報酬と実績を積み上げるマイクロワークMVPです。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => choose("worker")}>
                ワーカーとして始める
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => choose("client")}>
                仕事を依頼する
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
            <TrustNotice />
          </div>

          <div className="grid content-start gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <Card key={step.title}>
                    <CardHeader>
                      <span className="grid size-10 place-items-center rounded-lg bg-secondary text-primary">
                        <Icon />
                      </span>
                      <CardTitle className="text-sm leading-5">{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>ワーカーダッシュボードの例</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    報酬、品質、確認待ち、次のレベルを一画面で確認します。
                  </p>
                </div>
                <ClipboardCheck className="text-primary" />
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    ["累計報酬", "¥12,800"],
                    ["完了", "12件"],
                    ["品質", "91%"],
                    ["確認待ち", "1件"]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md border bg-background p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 text-xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-semibold">確認待ちタスク</p>
                    <Badge variant="secondary">品質レビュー中</Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <p>商品レビュー3件の要約</p>
                    <p>報酬 ¥500 / 目安 10分 / 個人情報チェック済み</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
