import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/session", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/admin/strapi-admin", () => ({ getStrapiAdminToken: vi.fn(() => "token") }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const session = await import("@/lib/admin/session");
const fetchMock = () => fetch as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
  (session.getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ sub: "admin" });
});

describe("product create and update payloads", () => {
  const attributes = {
    slug: "mesa-escolar",
    externalId: "CAT-001",
    productType: "Mesa",
    subcategory: "Aulas",
    usageEnvironment: "Sala de clases",
    observableColor: "Blanco",
    observableMaterial: "Melamina",
    catalogPage: 3,
    confidence: "alta",
    source: "Catalog",
    observation: "Verified",
  };

  it("persists slug and catalog attributes on create", async () => {
    fetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { documentId: "new" } }), { status: 201 }),
    );
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name: "Mesa escolar",
          description: "Mesa resistente",
          price: 1000,
          ...attributes,
        }),
      }) as never,
    );

    expect(response.status).toBe(201);
    const payload = JSON.parse(fetchMock().mock.calls[0][1].body).data;
    expect(payload).toMatchObject(attributes);
  });

  it("persists slug and catalog attributes on PATCH update", async () => {
    fetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { documentId: "existing" } }), { status: 200 }),
    );
    const { PATCH } = await import("./[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/admin/products/existing", {
        method: "PATCH",
        body: JSON.stringify(attributes),
      }) as never,
      { params: Promise.resolve({ id: "existing" }) },
    );

    expect(response.status).toBe(200);
    const payload = JSON.parse(fetchMock().mock.calls[0][1].body).data;
    expect(payload).toMatchObject(attributes);
  });

  it("clears category and optional fields with null on PATCH", async () => {
    fetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { documentId: "existing" } }), { status: 200 }),
    );
    const { PATCH } = await import("./[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/admin/products/existing", {
        method: "PATCH",
        body: JSON.stringify({
          category: null,
          subcategory: null,
          observableColor: null,
          observableMaterial: null,
          externalId: null,
          source: null,
          observation: null,
        }),
      }) as never,
      { params: Promise.resolve({ id: "existing" }) },
    );

    expect(response.status).toBe(200);
    const payload = JSON.parse(fetchMock().mock.calls[0][1].body).data;
    expect(payload).toMatchObject({
      category: null,
      subcategory: null,
      observableColor: null,
      observableMaterial: null,
      externalId: null,
      source: null,
      observation: null,
    });
  });

  it("fails loudly when a category documentId does not resolve on PATCH", async () => {
    fetchMock().mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    const { PATCH } = await import("./[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/admin/products/existing", {
        method: "PATCH",
        body: JSON.stringify({ category: "missing-category" }),
      }) as never,
      { params: Promise.resolve({ id: "existing" }) },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("missing-category");
  });

  it("fails loudly when a category documentId does not resolve on create", async () => {
    fetchMock().mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name: "Mesa escolar",
          slug: "mesa-escolar",
          description: "Mesa resistente",
          price: 1000,
          category: "missing-category",
        }),
      }) as never,
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("missing-category");
  });

  it("invalidates the catalog cache tag after a successful create", async () => {
    fetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { documentId: "new" } }), { status: 201 }),
    );
    const { revalidateTag } = await import("next/cache");
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name: "Mesa escolar",
          slug: "mesa-escolar",
          description: "Mesa resistente",
          price: 1000,
        }),
      }) as never,
    );

    expect(response.status).toBe(201);
    expect(revalidateTag).toHaveBeenCalledWith("catalog", { expire: 0 });
  });

  it("does not invalidate the cache when the Strapi create fails", async () => {
    fetchMock().mockResolvedValueOnce(new Response(JSON.stringify({ error: {} }), { status: 400 }));
    const { revalidateTag } = await import("next/cache");
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name: "Mesa escolar",
          slug: "mesa-escolar",
          description: "Mesa resistente",
          price: 1000,
        }),
      }) as never,
    );

    expect(response.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("invalidates the catalog cache tag after a successful PATCH", async () => {
    fetchMock().mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { documentId: "existing" } }), { status: 200 }),
    );
    const { revalidateTag } = await import("next/cache");
    const { PATCH } = await import("./[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/admin/products/existing", {
        method: "PATCH",
        body: JSON.stringify({ price: 99000 }),
      }) as never,
      { params: Promise.resolve({ id: "existing" }) },
    );

    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("catalog", { expire: 0 });
  });

  it("invalidates the catalog cache tag after a successful DELETE", async () => {
    fetchMock().mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { revalidateTag } = await import("next/cache");
    const { DELETE } = await import("./[id]/route");
    const response = await DELETE(
      new Request("http://localhost/api/admin/products/existing", { method: "DELETE" }) as never,
      { params: Promise.resolve({ id: "existing" }) },
    );

    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("catalog", { expire: 0 });
  });
});
