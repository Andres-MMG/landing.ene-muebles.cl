"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  deleteLead,
  updateLeadStatus,
  type Lead,
  type LeadListResult,
  type LeadStatus,
} from "../_lib/leadsQuery";

const SEARCH_DEBOUNCE_MS = 400;

const dateTime = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" });

const FILTERS: { value: LeadStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "new", label: "Nuevo" },
  { value: "notified", label: "Gestionado" },
  { value: "failed", label: "Error" },
];

function statusBadgeClass(status: LeadStatus): string {
  switch (status) {
    case "new":
      return "border border-ink bg-cream-soft text-ink";
    case "notified":
      return "text-green-700";
    case "failed":
      return "text-red-700";
    default:
      // Unknown/future status: neutral badge instead of blank output.
      return "border border-ink-line bg-paper-pure text-ink-mute";
  }
}

function statusLabel(status: LeadStatus): string {
  switch (status) {
    case "new":
      return "Nuevo";
    case "notified":
      return "Gestionado";
    case "failed":
      return "Error";
    default:
      return "Desconocido";
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : dateTime.format(parsed);
}

function truncateMiddle(value: string | null | undefined, max = 28): string {
  if (!value) return "—";
  if (value.length <= max) return value;
  const head = Math.ceil((max - 1) / 2);
  return `${value.slice(0, head)}…${value.slice(-(max - head - 1))}`;
}

/**
 * Admin Leads inbox. The page component renders the first page
 * server-side; every filter/search/pagination change here rewrites
 * the URL via `router.replace` inside a transition, which makes the
 * server re-fetch through `/api/admin/leads` and stream new props
 * (`initialData`) back into this component.
 */
export function LeadsList({
  initialData,
  initialStatus,
  initialQuery,
  initialPage,
  initialError,
}: {
  initialData: LeadListResult | null;
  initialStatus: LeadStatus | "";
  initialQuery: string;
  initialPage: number;
  initialError: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState<LeadStatus | "">(initialStatus);
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [leads, setLeads] = useState<Lead[]>(initialData?.leads ?? []);
  const [pagination, setPagination] = useState(initialData?.pagination ?? null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  // Latest-value refs, synced in an effect after every commit (the
  // react-hooks/refs rule forbids writing refs during render). The
  // debounced search timer fires up to 400ms after the keystroke that
  // scheduled it; by then the user may have clicked a status pill or a
  // pagination button. navigate() must read the CURRENT status/page
  // through these refs — the closure values from the scheduling render
  // would rewrite the URL with stale filters.
  const statusRef = useRef<LeadStatus | "">(status);
  const pageRef = useRef(page);
  useEffect(() => {
    statusRef.current = status;
    pageRef.current = page;
  }, [status, page]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNavigatedQuery = useRef(initialQuery);

  // Keep the "last query we actually navigated to" marker in sync with
  // the server-provided prop (covers back/forward navigation, where the
  // URL changes without this component having initiated it).
  useEffect(() => {
    lastNavigatedQuery.current = initialQuery;
  }, [initialQuery]);

  // Resync local state whenever the server re-renders this component
  // with fresh props (after a router.replace navigation). This is the
  // render-phase adjustment pattern from the React docs: state is
  // updated only when the props snapshot actually changed, so local
  // mutations between navigations stay put.
  const [prevProps, setPrevProps] = useState({
    initialData,
    initialStatus,
    initialQuery,
    initialPage,
  });
  if (
    prevProps.initialData !== initialData ||
    prevProps.initialStatus !== initialStatus ||
    prevProps.initialQuery !== initialQuery ||
    prevProps.initialPage !== initialPage
  ) {
    setPrevProps({ initialData, initialStatus, initialQuery, initialPage });
    setStatus(initialStatus);
    setQuery(initialQuery);
    setPage(initialPage);
    setLeads(initialData?.leads ?? []);
    setPagination(initialData?.pagination ?? null);
  }

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  const navigate = (next: { status?: LeadStatus | ""; query?: string; page?: number }) => {
    const params = new URLSearchParams();
    // Read the latest values from the effect-synced refs so deferred
    // callers (the debounced search timer) never rewrite the URL with
    // stale status/page.
    const nextStatus = next.status !== undefined ? next.status : statusRef.current;
    const nextQuery = next.query !== undefined ? next.query : query;
    const nextPage = next.page !== undefined ? next.page : pageRef.current;
    if (nextStatus) params.set("status", nextStatus);
    if (nextQuery) params.set("q", nextQuery);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    startTransition(() => {
      router.replace((qs ? `${pathname}?${qs}` : pathname) as never);
    });
  };

  const onSearchChange = (value: string) => {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (value === lastNavigatedQuery.current) return;
      lastNavigatedQuery.current = value;
      navigate({ query: value, page: 1 });
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleStatusChange = async (lead: Lead) => {
    // Toggle only between the two managed states. An unknown status (a
    // future value the API started emitting) must NOT be rewritten to
    // "notified" — it is left untouched and LeadRow hides the toggle
    // button for it.
    if (lead.status !== "new" && lead.status !== "notified") {
      return;
    }
    const nextStatus: LeadStatus = lead.status === "notified" ? "new" : "notified";
    const result = await updateLeadStatus(lead.documentId, nextStatus);
    if (result.ok) {
      setLeads((current) =>
        current.map((item) =>
          item.documentId === lead.documentId ? { ...item, status: nextStatus } : item,
        ),
      );
      setAnnouncement(
        `Lead de ${lead.name} marcado como ${statusLabel(nextStatus).toLowerCase()}.`,
      );
    } else {
      setAnnouncement(result.error ?? "No se pudo actualizar el lead.");
    }
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`¿Eliminar el lead de ${lead.name}? Esta acción no se puede deshacer.`)) {
      return;
    }
    const result = await deleteLead(lead.documentId);
    if (result.ok) {
      setLeads((current) => current.filter((item) => item.documentId !== lead.documentId));
      setExpandedIds((current) => current.filter((id) => id !== lead.documentId));
      // Deleting the last row of a page past the first one would
      // strand the user on an empty page — move back one page (the
      // nearest valid page).
      if (leads.length === 1 && page > 1) {
        navigate({ page: page - 1 });
      }
      setAnnouncement(`Lead de ${lead.name} eliminado.`);
    } else {
      setAnnouncement(result.error ?? "No se pudo eliminar el lead.");
    }
  };

  const toggleExpanded = (documentId: string) => {
    setExpandedIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    );
  };

  const totalPages = pagination?.pageCount ?? 1;

  return (
    <section aria-label="Bandeja de leads" aria-busy={isPending} className="mt-10">
      {/* Screen-reader announcement for mutation results. */}
      <p role="alert" aria-live="assertive" className="sr-only">
        {announcement ?? ""}
      </p>

      <div
        role="group"
        aria-label="Filtrar por estado"
        className="flex flex-wrap items-center gap-2"
      >
        {FILTERS.map((filter) => (
          <button
            key={filter.value || "all"}
            type="button"
            aria-pressed={status === filter.value}
            onClick={() => navigate({ status: filter.value, page: 1 })}
            className={
              status === filter.value
                ? "min-h-11 border border-ink bg-ink px-4 text-sm font-medium text-paper"
                : "min-h-11 border border-ink-line bg-paper-pure px-4 text-sm text-ink hover:bg-cream-soft/60"
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      <label className="mt-6 block">
        <span className="t-label text-ink-mute">Buscar</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Nombre, correo o institución"
          className="mt-2 w-full border border-ink-line bg-paper-pure px-3 py-2 text-sm placeholder:text-ink-soft sm:max-w-md"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="t-mono text-[11px] uppercase tracking-[0.16em] text-ink-mute" aria-live="polite">
          {isPending ? "Cargando…" : `${pagination?.total ?? 0} leads`}
        </p>
      </div>

      {initialError ? (
        <div role="alert" className="mt-6 border border-red-700/40 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">No se pudieron cargar los leads.</p>
          <p className="mt-1">{initialError}</p>
        </div>
      ) : null}

      {!leads.length && !initialError ? (
        <div className="mt-10 border border-ink-line p-12 text-center">
          <p className="t-label text-ink-mute">{status || query ? "Sin resultados" : "Sin leads"}</p>
          <p className="mt-3 text-ink-mute">
            {status || query
              ? "Probá quitar filtros o buscar con otros términos."
              : "Aún no hay leads. Los formularios de contacto aparecerán acá."}
          </p>
        </div>
      ) : null}

      {leads.length ? (
        <div className="mt-5 overflow-x-auto border-t border-ink">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="t-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
              <tr>
                {["Recibido", "Nombre", "Institución", "Correo", "Teléfono", "Región", "Estado", ""].map(
                  (label) => (
                    <th key={label} className="border-b border-ink-line px-3 py-3 font-normal">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <LeadRow
                  key={lead.documentId}
                  lead={lead}
                  expanded={expandedIds.includes(lead.documentId)}
                  onToggle={() => toggleExpanded(lead.documentId)}
                  onStatusChange={() => handleStatusChange(lead)}
                  onDelete={() => handleDelete(lead)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {leads.length ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="t-mono text-[11px] uppercase tracking-[0.16em] text-ink-mute">
            Página {page} de {Math.max(totalPages, 1)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate({ page: page - 1 })}
              disabled={page <= 1}
              className="min-h-11 border border-ink px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => navigate({ page: page + 1 })}
              disabled={!pagination || page >= pagination.pageCount}
              className="min-h-11 border border-ink px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LeadRow({
  lead,
  expanded,
  onToggle,
  onStatusChange,
  onDelete,
}: {
  lead: Lead;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr className="border-b border-ink-line align-top">
        <td className="whitespace-nowrap px-3 py-4 text-xs text-ink-mute">
          {formatDate(lead.createdAt)}
        </td>
        <td className="px-3 py-4 font-medium text-ink">{lead.name}</td>
        <td className="px-3 py-4">{lead.institution || "—"}</td>
        <td className="px-3 py-4">
          <a
            href={`mailto:${lead.email}`}
            className="text-ink underline underline-offset-4 hover:text-taupe-deep"
          >
            {lead.email}
          </a>
        </td>
        <td className="whitespace-nowrap px-3 py-4">{lead.phone || "—"}</td>
        <td className="px-3 py-4">{lead.region || "—"}</td>
        <td className="px-3 py-4">
          <span className={statusBadgeClass(lead.status)}>{statusLabel(lead.status)}</span>
        </td>
        <td className="px-3 py-4 text-right">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="t-label underline underline-offset-4 hover:text-taupe-deep"
          >
            {expanded ? "Ocultar" : "Detalles"}
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-ink-line bg-cream-soft/40">
          <td colSpan={8} className="px-3 py-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="t-label text-ink-mute">Mensaje</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                  {lead.message || "—"}
                </p>
                {lead.product ? (
                  <p className="mt-3 text-xs text-ink-mute">
                    <span className="t-label">Producto:</span> {lead.product}
                  </p>
                ) : null}
                {lead.source ? (
                  <p className="mt-1 text-xs text-ink-mute">
                    <span className="t-label">Origen:</span> {lead.source}
                  </p>
                ) : null}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="t-label text-ink-mute">Consentimiento</p>
                  <p className="mt-1 text-sm text-ink">
                    {lead.consent ? "Aceptado" : "No aceptado"}
                    {lead.consentVersion ? ` · v${lead.consentVersion}` : ""}
                  </p>
                </div>
                <div>
                  <p className="t-label text-ink-mute">Clave de idempotencia</p>
                  <p className="mt-1 text-xs text-ink-mute" title={lead.idempotencyKey ?? undefined}>
                    {truncateMiddle(lead.idempotencyKey)}
                  </p>
                </div>
                <div>
                  <p className="t-label text-ink-mute">Actualizado</p>
                  <p className="mt-1 text-xs text-ink-mute">{formatDate(lead.updatedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  {lead.status === "new" || lead.status === "notified" ? (
                    <button
                      type="button"
                      onClick={onStatusChange}
                      className="min-h-11 border border-ink px-4 text-sm font-medium text-ink hover:bg-cream-soft/60"
                    >
                      {lead.status === "notified" ? "Reabrir" : "Marcar gestionado"}
                    </button>
                  ) : (
                    // Unknown status: no toggle button. The safe option
                    // is to leave the lead untouched rather than guess
                    // a state transition (handleStatusChange guards
                    // this too).
                    null
                  )}
                  <button
                    type="button"
                    onClick={onDelete}
                    className="min-h-11 px-4 text-sm font-medium text-red-700 underline underline-offset-4 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
