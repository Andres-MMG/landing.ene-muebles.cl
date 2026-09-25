import { describe, expect, it, vi } from "vitest";
import {
  ensureLegalPages,
  LEGAL_PAGE_SEEDS,
  LEGAL_PAGE_UID,
  registerLegalPageMiddleware,
} from "./legal-pages";

type Stored = { code: "terms" | "privacy"; status: "draft" | "published" };

function createStrapi(
  initial: Stored[] = [],
  createHook?: (data: Record<string, unknown>) => void,
) {
  const stored = [...initial];
  const create = vi.fn(
    async ({ data, status }: { data: Record<string, unknown>; status: "published" }) => {
      createHook?.(data);
      stored.push({ code: data.code as Stored["code"], status });
      return data;
    },
  );
  const legalDocuments = {
    findMany: vi.fn(
      async ({
        filters,
        status,
      }: {
        filters: { code: { $eq: Stored["code"] } };
        status: Stored["status"];
      }) => stored.filter((entry) => entry.code === filters.code.$eq && entry.status === status),
    ),
    create,
  };
  const siteDocuments = { findFirst: vi.fn(async () => null) };
  const use = vi.fn();
  const documents = Object.assign(
    vi.fn((uid: string) => (uid === LEGAL_PAGE_UID ? legalDocuments : siteDocuments)),
    { use },
  );
  return {
    strapi: { documents, log: { error: vi.fn() } },
    stored,
    create,
    findMany: legalDocuments.findMany,
    use,
  };
}

describe("legal page bootstrap", () => {
  it("creates and publishes both exact fixed-code documents when both are missing", async () => {
    const { strapi, create } = createStrapi();
    await ensureLegalPages(strapi as never);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls.map(([call]) => call.data.code)).toEqual(["terms", "privacy"]);
    expect(create.mock.calls.every(([call]) => call.status === "published")).toBe(true);
    expect(JSON.stringify(create.mock.calls[0][0].data)).toContain("{{siteName}}");
  });

  it("seeds each code independently when one already exists", async () => {
    const { strapi, create } = createStrapi([{ code: "terms", status: "draft" }]);
    await ensureLegalPages(strapi as never);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.code).toBe("privacy");
  });

  it.each(["draft", "published"] as const)(
    "never updates an existing %s counterpart",
    async (status) => {
      const { strapi, create } = createStrapi([
        { code: "terms", status },
        { code: "privacy", status },
      ]);
      await ensureLegalPages(strapi as never);
      expect(create).not.toHaveBeenCalled();
    },
  );

  it("leaves ambiguous duplicates untouched", async () => {
    const { strapi, create } = createStrapi([
      { code: "terms", status: "draft" },
      { code: "terms", status: "draft" },
      { code: "privacy", status: "published" },
    ]);
    await ensureLegalPages(strapi as never);
    expect(create).not.toHaveBeenCalled();
  });

  it("accepts a create race only after the expected code exists and continues", async () => {
    let race = true;
    const setup = createStrapi([], (data) => {
      if (race && data.code === "terms") {
        race = false;
        setup.stored.push({ code: "terms", status: "published" });
        throw new Error("duplicate race");
      }
    });
    await ensureLegalPages(setup.strapi as never);
    expect(setup.stored.some((entry) => entry.code === "privacy")).toBe(true);
    expect(setup.strapi.log.error).not.toHaveBeenCalled();
  });

  it("does not suppress a publish failure when only a draft appeared", async () => {
    let failed = false;
    const setup = createStrapi([], (data) => {
      if (!failed && data.code === "terms") {
        failed = true;
        setup.stored.push({ code: "terms", status: "draft" });
        throw new Error("published create partially failed");
      }
    });

    await ensureLegalPages(setup.strapi as never);

    expect(setup.stored).toContainEqual({ code: "terms", status: "draft" });
    expect(setup.stored).not.toContainEqual({ code: "terms", status: "published" });
    expect(setup.stored).toContainEqual({ code: "privacy", status: "published" });
    expect(setup.strapi.log.error).toHaveBeenCalledWith(
      expect.stringContaining("existing draft was left untouched"),
      expect.any(Error),
    );
  });

  it("logs an initial lookup failure and still processes the other code", async () => {
    const setup = createStrapi();
    const lookupError = new Error("transient read failure");
    setup.findMany.mockRejectedValueOnce(lookupError);

    await ensureLegalPages(setup.strapi as never);

    expect(setup.strapi.log.error).toHaveBeenCalledWith(
      "[bootstrap] Failed to seed legal page terms",
      lookupError,
    );
    expect(setup.findMany.mock.calls.some(([call]) => call.filters.code.$eq === "privacy")).toBe(
      true,
    );
    expect(setup.stored).toContainEqual({ code: "privacy", status: "published" });
  });

  it("logs an isolated create failure and still seeds the other code", async () => {
    const setup = createStrapi([], (data) => {
      if (data.code === "terms") throw new Error("database unavailable");
    });
    await ensureLegalPages(setup.strapi as never);
    expect(setup.strapi.log.error).toHaveBeenCalledTimes(1);
    expect(setup.stored).toContainEqual({ code: "privacy", status: "published" });
  });

  it("keeps the seed contract restricted to controlled tokens", () => {
    const serialized = JSON.stringify(LEGAL_PAGE_SEEDS);
    const tokens = serialized.match(/\{\{[^{}]+\}\}/g) ?? [];
    expect(new Set(tokens)).toEqual(
      new Set(["{{siteName}}", "{{contactEmail}}", "{{whatsappNumber}}"]),
    );
  });
});

describe("legal page identity middleware", () => {
  async function middlewareFor(initial: Stored[] = []) {
    const setup = createStrapi(initial);
    registerLegalPageMiddleware(setup.strapi as never);
    const middleware = setup.use.mock.calls[0][0] as (
      context: unknown,
      next: () => Promise<unknown>,
    ) => Promise<unknown>;
    return { ...setup, middleware };
  }

  it("rejects unknown and duplicate creates", async () => {
    const { middleware } = await middlewareFor([{ code: "terms", status: "draft" }]);
    await expect(
      middleware(
        { uid: LEGAL_PAGE_UID, action: "create", params: { data: { code: "other" } } },
        vi.fn(),
      ),
    ).rejects.toThrow("Unknown");
    await expect(
      middleware(
        { uid: LEGAL_PAGE_UID, action: "create", params: { data: { code: "terms" } } },
        vi.fn(),
      ),
    ).rejects.toThrow("already exists");
  });

  it("rejects code writes and deletes while allowing content-only updates", async () => {
    const { middleware } = await middlewareFor();
    await expect(
      middleware(
        { uid: LEGAL_PAGE_UID, action: "update", params: { data: { code: "privacy" } } },
        vi.fn(),
      ),
    ).rejects.toThrow("cannot be changed");
    await expect(
      middleware({ uid: LEGAL_PAGE_UID, action: "delete", params: {} }, vi.fn()),
    ).rejects.toThrow("deletion");
    const next = vi.fn(async () => "ok");
    await expect(
      middleware(
        { uid: LEGAL_PAGE_UID, action: "update", params: { data: { title: "Updated" } } },
        next,
      ),
    ).resolves.toBe("ok");
    expect(next).toHaveBeenCalledTimes(1);
  });
});
