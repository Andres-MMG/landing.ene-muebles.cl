import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/admin/session";
import { findAdminUserByDocumentId, type AdminUserRecord } from "@/lib/admin/strapi-admin";

/**
 * Route-handler auth guard for `/api/admin/*` endpoints.
 *
 * A valid session token only proves the bearer logged in within the
 * last 12h; it does NOT prove the admin user still exists or is still
 * active (the panel can deactivate users server-side). The
 * `(authenticated)` layout already enforces `user.active` for page
 * renders — API routes must apply the same rule, otherwise a
 * deactivated admin keeps write access through the JSON API.
 *
 * Returns the admin user ONLY when the session is valid AND the user
 * still exists AND is active; returns `null` otherwise. Callers answer
 * 401 on `null` (the admin client maps 401 to the login redirect).
 *
 * NOTE: pre-existing products/categories/other admin routes still use
 * a bare `getServerSession()` check. Migrating them to this guard is a
 * known pre-existing gap, intentionally out of scope for the leads
 * work.
 */
export async function requireAdmin(): Promise<AdminUserRecord | null> {
  const session = await getServerSession();
  if (!session) return null;
  const user = await findAdminUserByDocumentId(session.sub);
  if (!user || !user.active) return null;
  return user;
}

/**
 * Response for a Strapi-side 401 (missing/expired `STRAPI_ADMIN_TOKEN`).
 *
 * The route's OWN auth already passed at that point, so forwarding the
 * 401 would make the admin client log out a perfectly healthy session
 * (the client maps 401 to `/admin/login?expired=1`). Surface it as a
 * gateway error instead — only the route's own auth failure may be 401.
 */
export function strapiAuthFailure(): NextResponse {
  return NextResponse.json(
    {
      error:
        "El servidor de contenido rechazó la autenticación (token de administración inválido o expirado).",
    },
    { status: 502 },
  );
}
