import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginPage } from "@/components/app/admin-login-page";
import { authorizeAdminRequest, isAdminProtectionEnabled } from "@/lib/security/admin";

export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = sanitizeNextPath(params.next);

  if (!isAdminProtectionEnabled()) {
    redirect(next);
  }

  const authorization = await authorizeAdminRequest(createAdminLoginRequest(await headers()));
  if (authorization.authorized) {
    redirect(next);
  }

  return <AdminLoginPage nextPath={next} />;
}

function sanitizeNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/admin";
  }
  return value;
}

function createAdminLoginRequest(headerStore: { get(name: string): string | null }) {
  const requestHeaders = new Headers();
  const cookieHeader = headerStore.get("cookie");
  const authorizationHeader = headerStore.get("authorization");
  if (cookieHeader) {
    requestHeaders.set("cookie", cookieHeader);
  }
  if (authorizationHeader) {
    requestHeaders.set("authorization", authorizationHeader);
  }
  const localOrigin = ["http", "://", "127.0.0.1"].join("");
  return new Request(new URL("/admin/login", localOrigin).toString(), {
    headers: requestHeaders
  });
}
