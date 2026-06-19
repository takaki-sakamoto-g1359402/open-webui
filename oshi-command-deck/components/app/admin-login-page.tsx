"use client";

import { useState } from "react";
import { LockKeyhole, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AppShell, PageHeader } from "./app-shell";
import { useApp } from "./app-provider";

export function AdminLoginPage({ nextPath }: { nextPath: string }) {
  const { t } = useApp();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tokenState, setTokenState] = useState<"idle" | "submitting" | "failed" | "disabled">("idle");
  const [supabaseState, setSupabaseState] = useState<
    "idle" | "submitting" | "failed" | "disabled"
  >("idle");

  async function submitToken(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTokenState("submitting");

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ token })
      });
      const body = (await response.json().catch(() => ({}))) as { disabled?: boolean };
      if (body.disabled) {
        setTokenState("disabled");
        return;
      }
      if (!response.ok) {
        setTokenState("failed");
        return;
      }
      window.location.assign(nextPath);
    } catch {
      setTokenState("failed");
    }
  }

  async function submitSupabase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSupabaseState("submitting");

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setSupabaseState("disabled");
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error || !data.session?.access_token) {
        setSupabaseState("failed");
        return;
      }

      const response = await fetch("/api/admin/supabase-session", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          accessToken: data.session.access_token
        })
      });

      await supabase.auth.signOut().catch(() => undefined);

      if (!response.ok) {
        setSupabaseState("failed");
        return;
      }
      window.location.assign(nextPath);
    } catch {
      setSupabaseState("failed");
    }
  }

  return (
    <AppShell>
      <PageHeader title={t("admin.loginTitle")} subtitle={t("admin.loginSubtitle")} />
      <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LockKeyhole size={20} className="text-[var(--app-cyan)]" aria-hidden="true" />
              <CardTitle>{t("admin.loginCardTitle")}</CardTitle>
            </div>
            <CardDescription>{t("admin.loginHelp")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={submitToken}>
              <label className="flex flex-col gap-1 text-sm font-bold text-[var(--app-muted)]">
                {t("admin.loginToken")}
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  required
                />
              </label>
              <Button
                type="submit"
                disabled={tokenState === "submitting" || token.trim().length === 0}
              >
                {tokenState === "submitting" ? t("admin.loginSubmitting") : t("admin.loginSubmit")}
              </Button>
              {tokenState === "failed" ? (
                <p className="rounded-[8px] bg-[var(--app-red-soft)] px-3 py-2 text-sm font-semibold text-[var(--app-red)]">
                  {t("admin.loginFailed")}
                </p>
              ) : null}
              {tokenState === "disabled" ? (
                <p className="rounded-[8px] bg-[var(--app-amber-soft)] px-3 py-2 text-sm font-semibold text-[var(--app-amber)]">
                  {t("admin.loginDisabled")}
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserRoundCheck size={20} className="text-[var(--app-cyan)]" aria-hidden="true" />
              <CardTitle>{t("admin.loginSupabaseTitle")}</CardTitle>
            </div>
            <CardDescription>{t("admin.loginSupabaseHelp")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={submitSupabase}>
              <label className="flex flex-col gap-1 text-sm font-bold text-[var(--app-muted)]">
                {t("admin.loginEmail")}
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-bold text-[var(--app-muted)]">
                {t("admin.loginPassword")}
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <Button
                type="submit"
                disabled={
                  supabaseState === "submitting" ||
                  email.trim().length === 0 ||
                  password.length === 0
                }
              >
                {supabaseState === "submitting"
                  ? t("admin.loginSubmitting")
                  : t("admin.loginSupabaseSubmit")}
              </Button>
              {supabaseState === "failed" ? (
                <p className="rounded-[8px] bg-[var(--app-red-soft)] px-3 py-2 text-sm font-semibold text-[var(--app-red)]">
                  {t("admin.loginSupabaseFailed")}
                </p>
              ) : null}
              {supabaseState === "disabled" ? (
                <p className="rounded-[8px] bg-[var(--app-amber-soft)] px-3 py-2 text-sm font-semibold text-[var(--app-amber)]">
                  {t("admin.loginSupabaseDisabled")}
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
