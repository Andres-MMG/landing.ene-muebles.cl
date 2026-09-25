import { createLegalRoute } from "../_lib/legal-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const route = createLegalRoute("terms");
export const GET = route.GET;
export const PUT = route.PUT;
