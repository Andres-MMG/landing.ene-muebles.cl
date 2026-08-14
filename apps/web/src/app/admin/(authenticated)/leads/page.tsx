import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  fetchLeads,
  LeadFetchUnauthorizedError,
  LEAD_PAGE_SIZE,
  type LeadListResult,
  type LeadStatus,
} from "../_lib/leadsQuery";
import { LeadsList } from "./LeadsList";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Leads · Ene Muebles",
  robots: { index: false, follow: false },
};

const LEAD_STATUSES: LeadStatus[] = ["new", "notified", "failed"];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const params = await searchParams;

  const status = LEAD_STATUSES.includes(params.status as LeadStatus)
    ? (params.status as LeadStatus)
    : "";
  const rawPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const q = params.q ?? "";

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );

  // The first page is fetched here (server-side) so the inbox renders
  // immediately. The browser session cookie is forwarded explicitly:
  // a server fetch() never carries it otherwise. Filter/pagination
  // changes re-enter this component through the URL (router.replace)
  // and re-fetch server-side.
  let initialData: LeadListResult | null = null;
  let initialError: string | null = null;
  try {
    initialData = await fetchLeads(
      { page, pageSize: LEAD_PAGE_SIZE, status, q },
      { baseUrl, cookie: (await cookies()).toString() },
    );
    // Clamp out-of-range pages to the last valid one when the server
    // reports a page count (e.g. a deep link to a page that no longer
    // exists after deletions). Without a page count, `page >= 1` above
    // is the only bound we can enforce.
    if (initialData.pagination.pageCount > 0 && page > initialData.pagination.pageCount) {
      initialData = await fetchLeads(
        { page: initialData.pagination.pageCount, pageSize: LEAD_PAGE_SIZE, status, q },
        { baseUrl, cookie: (await cookies()).toString() },
      );
    }
  } catch (err) {
    if (err instanceof LeadFetchUnauthorizedError) {
      // The layout guard normally catches a stale session before this
      // page renders, but the internal fetch re-checks the cookie in a
      // fresh request — a 401 there means the session is gone.
      redirect("/admin/login?expired=1" as never);
    }
    initialError = err instanceof Error ? err.message : "No se pudieron cargar los leads.";
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
      <header className="border-b border-ink-line pb-8">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe">
          Bandeja de entrada
        </p>
        <h1 className="t-display mt-3 text-4xl">Leads</h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-mute">
          Solicitudes de cotización recibidas desde el formulario de contacto.
        </p>
      </header>
      <LeadsList
        initialData={initialData}
        initialStatus={status}
        initialQuery={q}
        initialPage={initialData?.pagination.page ?? page}
        initialError={initialError}
      />
    </div>
  );
}
