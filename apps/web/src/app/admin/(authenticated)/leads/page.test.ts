import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirected");
  }),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ toString: () => "session=local" })),
}));
vi.mock("./LeadsList", () => ({ LeadsList: vi.fn() }));

const { requireAdmin } = await import("@/lib/admin/require-admin");
const { redirect } = await import("next/navigation");
const originalEnv = { ...process.env };

function envelope(page = 1, pageCount = 1) {
  return new Response(
    JSON.stringify({ data: [], meta: { pagination: { page, pageSize: 50, pageCount, total: 0 } } }),
  );
}

function listProps(element: ReactElement) {
  const children = (element.props as { children: ReactElement[] }).children;
  return children[1].props as {
    initialError: string | null;
    initialData: unknown;
    initialPage: number;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env = {
    ...originalEnv,
    STRAPI_INTERNAL_URL: "http://cms:1337",
    STRAPI_ADMIN_TOKEN: "admin-token",
    NEXT_PUBLIC_SITE_URL: "https://unreachable-public.invalid",
  };
  vi.stubGlobal("fetch", vi.fn());
  vi.mocked(requireAdmin).mockResolvedValue({ active: true } as never);
});

afterEach(() => {
  process.env = originalEnv;
  vi.unstubAllGlobals();
});

describe("LeadsPage", () => {
  it("authenticates independently and reads CMS without the public origin or cookie forwarding", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(envelope());
    const { default: LeadsPage } = await import("./page");
    const result = await LeadsPage({
      searchParams: Promise.resolve({ status: "new", q: "school" }),
    });
    expect(requireAdmin).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(new URL(String(url)).origin).toBe("http://cms:1337");
    expect(init).toMatchObject({
      cache: "no-store",
      headers: { Authorization: "Bearer admin-token" },
    });
    expect(init?.headers).not.toHaveProperty("cookie");
    expect(listProps(result).initialError).toBeNull();
  });

  it("redirects only its own failed session guard before reading leads", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const { default: LeadsPage } = await import("./page");
    await expect(LeadsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirected");
    expect(redirect).toHaveBeenCalledWith("/admin/login?expired=1");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("renders an upstream authentication failure as a gateway error without redirecting", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 401 }));
    const { default: LeadsPage } = await import("./page");
    const result = await LeadsPage({ searchParams: Promise.resolve({}) });
    expect(redirect).not.toHaveBeenCalled();
    expect(listProps(result)).toMatchObject({
      initialData: null,
      initialError: "No se pudieron cargar los leads (502).",
    });
  });

  it("keeps guard transport errors separate from session expiry", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("CMS unavailable"));
    const { default: LeadsPage } = await import("./page");
    const result = await LeadsPage({ searchParams: Promise.resolve({}) });
    expect(listProps(result)).toMatchObject({
      initialData: null,
      initialError: "No se pudieron cargar los leads (502).",
    });
    expect(redirect).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("renders missing server credentials as a gateway error without fetching", async () => {
    delete process.env.STRAPI_ADMIN_TOKEN;
    delete process.env.STRAPI_API_TOKEN;
    const { default: LeadsPage } = await import("./page");
    const result = await LeadsPage({ searchParams: Promise.resolve({}) });
    expect(listProps(result)).toMatchObject({
      initialData: null,
      initialError: "No se pudieron cargar los leads (502).",
    });
    expect(redirect).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps forbidden upstream reads fail-closed", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 403 }));
    const { default: LeadsPage } = await import("./page");
    const result = await LeadsPage({ searchParams: Promise.resolve({}) });
    expect(listProps(result)).toMatchObject({
      initialData: null,
      initialError: "No se pudieron cargar los leads (403).",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("refetches the last valid page with the original filters", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(envelope(9, 2)).mockResolvedValueOnce(envelope(2, 2));
    const { default: LeadsPage } = await import("./page");
    const result = await LeadsPage({
      searchParams: Promise.resolve({ page: "9", status: "notified", q: "school" }),
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    const query = new URL(String(vi.mocked(fetch).mock.calls[1][0])).searchParams;
    expect(query.get("pagination[page]")).toBe("2");
    expect(query.get("pagination[pageSize]")).toBe("50");
    expect(query.get("filters[status][$eq]")).toBe("notified");
    expect(query.get("filters[$or][0][name][$containsi]")).toBe("school");
    expect(listProps(result).initialPage).toBe(2);
  });
});
