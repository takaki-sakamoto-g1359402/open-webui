import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminPage } from "@/components/app/admin-page";
import { authorizeAdminRequest, isAdminProtectionEnabled } from "@/lib/security/admin";

export default async function Page() {
  if (isAdminProtectionEnabled()) {
    const authorization = await authorizeAdminRequest(createAdminPageRequest(await headers()));
    if (!authorization.authorized) {
      redirect("/admin/login?next=/admin");
    }
  }

  return <AdminPage />;
}

function createAdminPageRequest(headerStore: { get(name: string): string | null }) {
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
  return new Request(new URL("/admin", localOrigin).toString(), {
    headers: requestHeaders
  });
}
