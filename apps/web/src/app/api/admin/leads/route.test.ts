import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/session", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/admin/strapi-admin", () => ({
  getStrapiAdminToken: vi.fn(() => "token"),
  findAdminUserByDocumentId: vi.fn(),
}));

const session = await import("@/lib/admin/session");
const strapiAdmin = await import("@/lib/admin/strapi-admin");
const fetchMock = () => fetch as unknown as ReturnType<typeof vi.fn>;

const ACTIVE_ADMIN = {
  id: 1,
  documentId: "admin-1",
  email: "admin@ene-muebles.cl",
  name: "Admin",
  role: "owner",
  active: true,
  passwordHash: "hash",
};

const LEAD = {
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

function strapiEnvelope(overrides: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({
      data: [LEAD],
      meta: { pagination: { page: 1, pageSize: 50, pageCount: 1, total: 1 } },
      ...overrides,
    }),
    { status: 200 },
  );
}

function request(url: string) {
  return new Request(url) as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
  (session.getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ sub: "admin" });
  (strapiAdmin.findAdminUserByDocumentId as ReturnType<typeof vi.fn>).mockResolvedValue(
    ACTIVE_ADMIN,
  );
});

describe("GET /api/admin/leads", () => {
  it("rejects unauthenticated requests with 401 and never calls Strapi", async () => {
    (session.getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { GET } = await import("./route");
    const response = await GET(request("http://localhost/api/admin/leads"));

    expect(response.status).toBe(401);
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("rejects an admin that no longer exists with 401 and never calls Strapi", async () => {
    (strapiAdmin.findAdminUserByDocumentId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { GET } = await import("./route");
    const response = await GET(request("http://localhost/api/admin/leads"));

    expect(response.status).toBe(401);
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("rejects an inactive admin user with 401 and never calls Strapi", async () => {
    (strapiAdmin.findAdminUserByDocumentId as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...ACTIVE_ADMIN,
      active: false,
    });
    const { GET } = await import("./route");
    const response = await GET(request("http://localhost/api/admin/leads"));

    expect(response.status).toBe(401);
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("uses default pagination, newest-first sort and passes the envelope through", async () => {
    fetchMock().mockResolvedValueOnce(strapiEnvelope());
    const { GET } = await import("./route");
    const response = await GET(request("http://localhost/api/admin/leads"));

    expect(response.status).toBe(200);
    const url = decodeURIComponent(fetchMock().mock.calls[0][0]);
    expect(url).toContain("pagination[page]=1");
    expect(url).toContain("pagination[pageSize]=50");
    expect(url).toContain("sort=createdAt:desc");
    expect(await response.json()).toEqual({
      data: [LEAD],
      meta: { pagination: { page: 1, pageSize: 50, pageCount: 1, total: 1 } },
    });
  });

  it("parses page/status/q and clamps pageSize to 100", async () => {
    fetchMock().mockResolvedValueOnce(strapiEnvelope());
    const { GET } = await import("./route");
    const response = await GET(
      request("http://localhost/api/admin/leads?page=3&pageSize=500&status=new&q=colegio"),
    );

    expect(response.status).toBe(200);
    const url = decodeURIComponent(fetchMock().mock.calls[0][0]);
    expect(url).toContain("pagination[page]=3");
    expect(url).toContain("pagination[pageSize]=100");
    expect(url).toContain("filters[status][$eq]=new");
    expect(url).toContain("filters[$or][0][name][$containsi]=colegio");
    expect(url).toContain("filters[$or][1][email][$containsi]=colegio");
    expect(url).toContain("filters[$or][2][institution][$containsi]=colegio");
  });

  it("rejects an invalid status filter with 400", async () => {
    const { GET } = await import("./route");
    const response = await GET(request("http://localhost/api/admin/leads?status=bogus"));

    expect(response.status).toBe(400);
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("passes through Strapi error statuses and bodies", async () => {
    fetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "boom" } }), { status: 500 }),
    );
    const { GET } = await import("./route");
    const response = await GET(request("http://localhost/api/admin/leads"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: { message: "boom" } });
  });

  it("returns 502 instead of forwarding a Strapi-side 401 (broken admin token)", async () => {
    fetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Invalid token" } }), { status: 401 }),
    );
    const { GET } = await import("./route");
    const response = await GET(request("http://localhost/api/admin/leads"));

    expect(response.status).toBe(502);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toContain("autenticación");
  });
});
