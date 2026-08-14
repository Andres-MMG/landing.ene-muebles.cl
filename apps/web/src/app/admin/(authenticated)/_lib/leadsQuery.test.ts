import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildLeadsQuery,
  deleteLead,
  fetchLeads,
  LEAD_PAGE_SIZE,
  LeadFetchUnauthorizedError,
  updateLeadStatus,
  type Lead,
} from "./leadsQuery";

const LEAD: Lead = {
  id: 1,
  documentId: "lead-1",
  name: "María Pérez",
  institution: "Colegio San Andrés",
  email: "maria@example.com",
  phone: "+56911112222",
  region: "Región Metropolitana",
  message: "Quiero cotizar 40 mesas.",
  consent: true,
  consentVersion: "1.0",
  source: "form",
  product: "Mesa escolar",
  status: "new",
  idempotencyKey: "key-123",
  createdAt: "2026-08-14T10:00:00.000Z",
  updatedAt: "2026-08-14T10:00:00.000Z",
};

const fetchMock = () => fetch as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("buildLeadsQuery", () => {
  it("returns an empty string for the default pagination", () => {
    expect(buildLeadsQuery({})).toBe("");
    expect(buildLeadsQuery({ page: 1, pageSize: LEAD_PAGE_SIZE })).toBe("");
  });

  it("serializes non-default page, pageSize, status and q", () => {
    const query = buildLeadsQuery({ page: 3, pageSize: 25, status: "new", q: "colegio san" });
    expect(query).toContain("page=3");
    expect(query).toContain("pageSize=25");
    expect(query).toContain("status=new");
    expect(query).toContain("q=colegio+san");
  });
});

describe("fetchLeads", () => {
  it("forwards baseUrl and the session cookie to the admin API and maps the envelope", async () => {
    fetchMock().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [LEAD],
          meta: { pagination: { page: 1, pageSize: 50, pageCount: 1, total: 1 } },
        }),
        { status: 200 },
      ),
    );

    const result = await fetchLeads(
      { page: 2, status: "new" },
      { baseUrl: "https://admin.example.cl", cookie: "ene_admin_session=abc" },
    );

    expect(result.leads).toEqual([LEAD]);
    expect(result.pagination).toEqual({ page: 1, pageSize: 50, pageCount: 1, total: 1 });
    const [url, init] = fetchMock().mock.calls[0];
    expect(url).toBe("https://admin.example.cl/api/admin/leads?page=2&status=new");
    expect(init.headers).toEqual({ cookie: "ene_admin_session=abc" });
  });

  it("maps an empty Strapi envelope to an empty list with default pagination", async () => {
    fetchMock().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [],
          meta: { pagination: { page: 1, pageSize: 50, pageCount: 0, total: 0 } },
        }),
        { status: 200 },
      ),
    );

    const result = await fetchLeads({});

    expect(result.leads).toEqual([]);
    expect(result.pagination).toEqual({ page: 1, pageSize: 50, pageCount: 0, total: 0 });
  });

  it("throws on non-OK responses", async () => {
    fetchMock().mockResolvedValueOnce(new Response(JSON.stringify({ error: {} }), { status: 500 }));

    await expect(fetchLeads({})).rejects.toThrow();
  });

  it("throws a typed LeadFetchUnauthorizedError on 401 so the page can redirect", async () => {
    fetchMock().mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(fetchLeads({})).rejects.toBeInstanceOf(LeadFetchUnauthorizedError);
  });

  it("throws when the payload is not the expected envelope", async () => {
    fetchMock().mockResolvedValueOnce(new Response(JSON.stringify({ nope: true }), { status: 200 }));

    await expect(fetchLeads({})).rejects.toThrow();
  });
});

describe("client mutations", () => {
  it("PATCHes the lead status with the right verb and body", async () => {
    fetchMock().mockResolvedValueOnce(new Response(JSON.stringify({ data: {} }), { status: 200 }));

    const result = await updateLeadStatus("lead-1", "notified");

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock().mock.calls[0];
    expect(url).toBe("/api/admin/leads/lead-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ status: "notified" });
  });

  it("DELETEs the lead with the right verb", async () => {
    fetchMock().mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await deleteLead("lead-1");

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock().mock.calls[0];
    expect(url).toBe("/api/admin/leads/lead-1");
    expect(init.method).toBe("DELETE");
  });

  it("surfaces API errors without throwing", async () => {
    fetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "No se pudo actualizar" }), { status: 400 }),
    );

    const result = await updateLeadStatus("lead-1", "failed");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("No se pudo actualizar");
  });
});

describe("module boundaries", () => {
  it("never imports the client-only admin helpers", () => {
    const source = readFileSync(
      join(process.cwd(), "apps/web/src/app/admin/(authenticated)/_lib/leadsQuery.ts"),
      "utf8",
    );
    expect(source).not.toContain("@/lib/admin/client");
    expect(source).not.toContain('"use client"');
  });
});
