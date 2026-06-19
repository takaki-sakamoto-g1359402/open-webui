import { createHmac, timingSafeEqual } from "node:crypto";
import { isServerDemoModeEnabled } from "@/lib/security/demo-mode";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const adminSessionCookieName = "oshi_command_deck_admin";
export const adminAccountSessionCookieName = "oshi_command_deck_admin_account";

export type AdminRole = "owner" | "admin" | "reviewer";
export type AdminAuthSource = "none" | "admin_token" | "admin_session" | "supabase_auth";

export type AdminAuthorization = {
  authorized: boolean;
  source: AdminAuthSource;
  role?: AdminRole;
  userId?: string;
  reason?: string;
};

const adminRoles = new Set<AdminRole>(["owner", "admin", "reviewer"]);
const adminWriteRoles = new Set<AdminRole>(["owner", "admin"]);

export function isAdminRequest(request: Request) {
  return getStaticAdminAuthorization(request).authorized;
}

export function isAdminJobRequest(request: Request) {
  const bearer = getBearerToken(request);
  return Boolean(bearer && getExpectedJobBearerTokens().includes(bearer));
}

export async function authorizeAdminRequest(
  request: Request,
  options: { requireWrite?: boolean } = {}
): Promise<AdminAuthorization> {
  const staticAuthorization = getStaticAdminAuthorization(request);
  if (staticAuthorization.authorized) {
    if (staticAuthorization.source === "supabase_auth") {
      return revalidateSupabaseAccountAuthorization(staticAuthorization, options);
    }
    if (
      options.requireWrite &&
      staticAuthorization.role &&
      !canAdminRoleWrite(staticAuthorization.role)
    ) {
      return unauthorized("admin_write_role_required");
    }
    return staticAuthorization;
  }

  const bearerToken = getBearerToken(request);
  if (!bearerToken) {
    return unauthorized("missing_admin_credentials");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return unauthorized("supabase_service_unavailable");
  }

  try {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(bearerToken);

    if (userError || !user) {
      return unauthorized("invalid_supabase_jwt");
    }

    const { data, error } = await supabase
      .from("admin_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return unauthorized("admin_members_lookup_failed");
    }

    const role = normalizeAdminRole((data as { role?: unknown } | null)?.role);
    if (!role) {
      return unauthorized("admin_membership_required");
    }

    if (options.requireWrite && !canAdminRoleWrite(role)) {
      return unauthorized("admin_write_role_required");
    }

    return {
      authorized: true,
      source: "supabase_auth",
      role,
      userId: user.id
    };
  } catch {
    return unauthorized("supabase_auth_check_failed");
  }
}

export async function isAuthorizedAdminRequest(
  request: Request,
  options: { requireWrite?: boolean } = {}
) {
  return (await authorizeAdminRequest(request, options)).authorized;
}

export function canAdminRoleWrite(role: AdminRole) {
  return adminWriteRoles.has(role);
}

export function getAdminActorLabel(authorization: AdminAuthorization) {
  if (authorization.source === "supabase_auth" && authorization.userId) {
    return `supabase:${authorization.userId}`;
  }
  if (authorization.source === "admin_session") {
    return "admin-session";
  }
  if (authorization.source === "admin_token") {
    return "admin-token";
  }
  return "unknown-admin";
}

export function isAdminProtectionEnabled() {
  return Boolean(process.env.ADMIN_JOB_TOKEN?.trim()) || isProductionAdminProtectionRequired();
}

export function isProductionAdminProtectionRequired() {
  return process.env.NODE_ENV === "production" && !isServerDemoModeEnabled();
}

export function createAdminSessionValue(now = Date.now()) {
  const expected = process.env.ADMIN_JOB_TOKEN?.trim();
  if (!expected) {
    return undefined;
  }

  const payload = Buffer.from(
    JSON.stringify({
      v: 2,
      exp: now + 12 * 60 * 60 * 1000
    })
  ).toString("base64url");
  const signature = createHmac("sha256", expected).update(payload).digest("base64url");
  return `v2.${payload}.${signature}`;
}

export function isAdminSessionValue(value: string | undefined, now = Date.now()) {
  const secret = process.env.ADMIN_JOB_TOKEN?.trim();
  if (!secret || !value) {
    return false;
  }

  const [version, payload, signature] = value.split(".");
  if (version !== "v2" || !payload || !signature) {
    return false;
  }

  const expectedSignature = createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return false;
  }

  const parsed = parseExpiringPayload(payload, 2);
  return Boolean(parsed && parsed.exp > now);
}

export function createAdminAccountSessionValue(authorization: AdminAuthorization, now = Date.now()) {
  if (!authorization.userId || !authorization.role || authorization.source !== "supabase_auth") {
    return undefined;
  }

  const secret = getAdminAccountSessionSecret();
  if (!secret) {
    return undefined;
  }

  const payload = Buffer.from(
    JSON.stringify({
      v: 1,
      userId: authorization.userId,
      role: authorization.role,
      exp: now + 12 * 60 * 60 * 1000
    })
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `v1.${payload}.${signature}`;
}

export function readAdminAccountSessionValue(
  value: string | undefined,
  now = Date.now()
): AdminAuthorization | undefined {
  const secret = getAdminAccountSessionSecret();
  if (!secret || !value) {
    return undefined;
  }

  const [version, payload, signature] = value.split(".");
  if (version !== "v1" || !payload || !signature) {
    return undefined;
  }

  const expectedSignature = createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return undefined;
  }

  const parsed = parseAdminAccountSessionPayload(payload);
  if (!parsed || parsed.exp <= now) {
    return undefined;
  }

  return {
    authorized: true,
    source: "supabase_auth",
    role: parsed.role,
    userId: parsed.userId
  };
}

export function isAdminAccountSessionValue(value: string | undefined, now = Date.now()) {
  return Boolean(readAdminAccountSessionValue(value, now));
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60
  };
}

function parseCookieHeader(header: string | null) {
  const cookies = new Map<string, string>();
  if (!header) {
    return cookies;
  }

  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey || rawValue.length === 0) {
      continue;
    }
    try {
      cookies.set(rawKey, decodeURIComponent(rawValue.join("=")));
    } catch {
      continue;
    }
  }
  return cookies;
}

function getStaticAdminAuthorization(request: Request): AdminAuthorization {
  const expected = process.env.ADMIN_JOB_TOKEN?.trim();
  if (expected && getBearerToken(request) === expected) {
    return {
      authorized: true,
      source: "admin_token",
      role: "owner"
    };
  }

  const session = parseCookieHeader(request.headers.get("cookie")).get(adminSessionCookieName);
  if (isAdminSessionValue(session)) {
    return {
      authorized: true,
      source: "admin_session",
      role: "owner"
    };
  }

  const accountSession = parseCookieHeader(request.headers.get("cookie")).get(
    adminAccountSessionCookieName
  );
  const accountAuthorization = readAdminAccountSessionValue(accountSession);
  if (accountAuthorization) {
    return accountAuthorization;
  }

  if (!expected) {
    return unauthorized("admin_token_not_configured");
  }

  return unauthorized("admin_credentials_invalid");
}

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization")?.trim();
  if (!header) {
    return undefined;
  }

  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim();
}

function getExpectedJobBearerTokens() {
  return [
    process.env.ADMIN_JOB_TOKEN?.trim(),
    process.env.CRON_SECRET?.trim()
  ].filter((value): value is string => Boolean(value));
}

function normalizeAdminRole(role: unknown): AdminRole | undefined {
  if (typeof role !== "string") {
    return undefined;
  }
  return adminRoles.has(role as AdminRole) ? (role as AdminRole) : undefined;
}

function getAdminAccountSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_JOB_TOKEN?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

function parseAdminAccountSessionPayload(payload: string) {
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      v?: unknown;
      userId?: unknown;
      role?: unknown;
      exp?: unknown;
    };
    const role = normalizeAdminRole(parsed.role);
    if (parsed.v !== 1 || typeof parsed.userId !== "string" || !role || typeof parsed.exp !== "number") {
      return undefined;
    }
    return {
      userId: parsed.userId,
      role,
      exp: parsed.exp
    };
  } catch {
    return undefined;
  }
}

function parseExpiringPayload(payload: string, expectedVersion: number) {
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      v?: unknown;
      exp?: unknown;
    };
    if (parsed.v !== expectedVersion || typeof parsed.exp !== "number") {
      return undefined;
    }
    return { exp: parsed.exp };
  } catch {
    return undefined;
  }
}

async function revalidateSupabaseAccountAuthorization(
  authorization: AdminAuthorization,
  options: { requireWrite?: boolean }
): Promise<AdminAuthorization> {
  if (!authorization.userId) {
    return unauthorized("admin_membership_required");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return unauthorized("supabase_service_unavailable");
  }

  try {
    const { data, error } = await supabase
      .from("admin_members")
      .select("role")
      .eq("user_id", authorization.userId)
      .maybeSingle();

    if (error) {
      return unauthorized("admin_members_lookup_failed");
    }

    const role = normalizeAdminRole((data as { role?: unknown } | null)?.role);
    if (!role) {
      return unauthorized("admin_membership_required");
    }

    if (options.requireWrite && !canAdminRoleWrite(role)) {
      return unauthorized("admin_write_role_required");
    }

    return {
      authorized: true,
      source: "supabase_auth",
      role,
      userId: authorization.userId
    };
  } catch {
    return unauthorized("admin_members_lookup_failed");
  }
}

function unauthorized(reason: string): AdminAuthorization {
  return {
    authorized: false,
    source: "none",
    reason
  };
}
