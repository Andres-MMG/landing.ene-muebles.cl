import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { readAdminLeads } from "@/lib/admin/strapi-admin";
import { LEAD_PAGE_SIZE, type LeadListResult, type LeadStatus } from "../_lib/leadsQuery";
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
  // Only a failed session guard redirects; a lookup transport failure is upstream.
  const user = await requireAdmin().catch(() => undefined);
  if (user === null) redirect("/admin/login?expired=1" as never);
  const params = await searchParams;

  const status = LEAD_STATUSES.includes(params.status as LeadStatus)
    ? (params.status as LeadStatus)
    : "";
  const rawPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const q = params.q ?? "";

  async function loadPage(requestedPage: number): Promise<LeadListResult> {
    const result = await readAdminLeads(
      new URLSearchParams({
        page: String(requestedPage),
        pageSize: String(LEAD_PAGE_SIZE),
        status,
        q,
      }),
    );
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`No se pudieron cargar los leads (${result.status}).`);
    }
    const envelope = result.data as {
      data?: LeadListResult["leads"];
      meta?: { pagination?: LeadListResult["pagination"] };
    } | null;
    if (!envelope?.data) throw new Error("Respuesta inválida del servidor de leads.");
    return {
      leads: envelope.data,
      pagination: envelope.meta?.pagination ?? {
        page: requestedPage,
        pageSize: LEAD_PAGE_SIZE,
        pageCount: 0,
        total: 0,
      },
    };
  }

  // Read directly through the internal CMS transport, never a public-origin hop.
  let initialData: LeadListResult | null = null;
  let initialError: string | null = null;
  try {
    if (!user) throw new Error("No se pudieron cargar los leads (502).");
    initialData = await loadPage(page);
    // Clamp out-of-range pages to the last valid one when the server
    // reports a page count (e.g. a deep link to a page that no longer
    // exists after deletions). Without a page count, `page >= 1` above
    // is the only bound we can enforce.
    if (initialData.pagination.pageCount > 0 && page > initialData.pagination.pageCount) {
      initialData = await loadPage(initialData.pagination.pageCount);
    }
  } catch (err) {
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
