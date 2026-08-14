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

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
  (session.getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ sub: "admin" });
  (strapiAdmin.findAdminUserByDocumentId as ReturnType<typeof vi.fn>).mockResolvedValue(
    ACTIVE_ADMIN,
  );
});

describe("PATCH /api/admin/leads/[id]", () => {
  it("rejects unauthenticated requests with 401", async () => {
    (session.getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/admin/leads/lead-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "notified" }),
      }) as never,
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(401);
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("rejects an inactive admin user with 401 and never calls Strapi", async () => {
    (strapiAdmin.findAdminUserByDocumentId as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...ACTIVE_ADMIN,
      active: false,
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/admin/leads/lead-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "notified" }),
      }) as never,
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(401);
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("rejects an invalid status body with 400", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/admin/leads/lead-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "bogus" }),
      }) as never,
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(400);
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("sends a Strapi PUT with the status wrapped in the data envelope", async () => {
    fetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { documentId: "lead-1", status: "notified" } }), {
        status: 200,
      }),
    );
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/admin/leads/lead-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "notified" }),
      }) as never,
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(200);
    const [url, init] = fetchMock().mock.calls[0];
    expect(url).toContain("/api/leads/lead-1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ data: { status: "notified" } });
  });

  it("passes through a 404 from Strapi", async () => {
    fetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Not Found" } }), { status: 404 }),
    );
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/admin/leads/missing", {
        method: "PATCH",
        body: JSON.stringify({ status: "new" }),
      }) as never,
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 502 instead of forwarding a Strapi-side 401 (broken admin token)", async () => {
    fetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Invalid token" } }), { status: 401 }),
    );
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost/api/admin/leads/lead-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "new" }),
      }) as never,
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(502);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toContain("autenticación");
  });
});

describe("DELETE /api/admin/leads/[id]", () => {
  it("rejects unauthenticated requests with 401", async () => {
    (session.getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/admin/leads/lead-1", { method: "DELETE" }) as never,
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(401);
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("rejects an inactive admin user with 401 and never calls Strapi", async () => {
    (strapiAdmin.findAdminUserByDocumentId as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...ACTIVE_ADMIN,
      active: false,
    });
    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/admin/leads/lead-1", { method: "DELETE" }) as never,
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(401);
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("normalizes Strapi 204 to 200 for the admin client", async () => {
    fetchMock().mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/admin/leads/lead-1", { method: "DELETE" }) as never,
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(200);
    const [url, init] = fetchMock().mock.calls[0];
    expect(url).toContain("/api/leads/lead-1");
    expect(init.method).toBe("DELETE");
  });

  it("passes through a 404 from Strapi", async () => {
    fetchMock().mockResolvedValueOnce(new Response(null, { status: 404 }));
    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/admin/leads/missing", { method: "DELETE" }) as never,
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 502 instead of forwarding a Strapi-side 401 (broken admin token)", async () => {
    fetchMock().mockResolvedValueOnce(new Response(null, { status: 401 }));
    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/admin/leads/lead-1", { method: "DELETE" }) as never,
      { params: Promise.resolve({ id: "lead-1" }) },
    );

    expect(response.status).toBe(502);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toContain("autenticación");
  });
});
