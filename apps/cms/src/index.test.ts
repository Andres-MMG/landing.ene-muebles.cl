import { beforeEach, describe, expect, it, vi } from "vitest";
import aboutSectionSchema from "./api/about-section/content-types/about-section/schema.json";
import contactCtaSectionSchema from "./api/contact-cta-section/content-types/contact-cta-section/schema.json";
import footerBlockSchema from "./api/footer-block/content-types/footer-block/schema.json";
import heroSectionSchema from "./api/hero-section/content-types/hero-section/schema.json";
import siteSettingSchema from "./api/site-setting/content-types/site-setting/schema.json";
import { ensurePublicSingletons, PUBLIC_SINGLETON_SEEDS } from "./index";

type ExistingDocument = { publishedAt: string | null };
type CreateCall = { uid: string; options: { data: Record<string, unknown>; status: string } };

const createStrapiStub = (existing: Record<string, ExistingDocument> = {}, failingUid?: string) => {
  const documents = new Map<
    string,
    { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  >();
  const createCalls: CreateCall[] = [];

  const strapi = {
    documents(uid: string) {
      if (!documents.has(uid)) {
        documents.set(uid, {
          findFirst: vi.fn(async () => {
            if (uid === failingUid) throw new Error("database unavailable");
            return existing[uid] ?? null;
          }),
          create: vi.fn(async (options: CreateCall["options"]) => {
            createCalls.push({ uid, options });
            existing[uid] = { publishedAt: "created" };
          }),
        });
      }
      return documents.get(uid)!;
    },
  };

  return { strapi, createCalls, documents };
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

describe("public singleton bootstrap", () => {
  it("creates each absent singleton once as published", async () => {
    const { strapi, createCalls } = createStrapiStub();

    await ensurePublicSingletons(strapi as never);
    await ensurePublicSingletons(strapi as never);

    expect(createCalls).toHaveLength(PUBLIC_SINGLETON_SEEDS.length);
    expect(createCalls).toEqual(
      expect.arrayContaining(
        PUBLIC_SINGLETON_SEEDS.map((seed) =>
          expect.objectContaining({
            uid: seed.uid,
            options: { data: seed.data, status: "published" },
          }),
        ),
      ),
    );
  });

  it("leaves an existing draft singleton untouched", async () => {
    const siteSetting = PUBLIC_SINGLETON_SEEDS[0]!;
    const { strapi, createCalls, documents } = createStrapiStub({
      [siteSetting.uid]: { publishedAt: null },
    });

    await ensurePublicSingletons(strapi as never);

    expect(documents.get(siteSetting.uid)!.findFirst).toHaveBeenCalledWith({ status: "draft" });
    expect(createCalls.filter((call) => call.uid === siteSetting.uid)).toEqual([]);
  });

  it("leaves an existing published singleton untouched", async () => {
    const siteSetting = PUBLIC_SINGLETON_SEEDS[0]!;
    const { strapi, createCalls } = createStrapiStub({
      [siteSetting.uid]: { publishedAt: "2026-01-01T00:00:00.000Z" },
    });

    await ensurePublicSingletons(strapi as never);

    expect(createCalls.filter((call) => call.uid === siteSetting.uid)).toEqual([]);
  });

  it("logs an isolated singleton failure and continues checking the others", async () => {
    const failed = PUBLIC_SINGLETON_SEEDS[0]!;
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { strapi, createCalls, documents } = createStrapiStub({}, failed.uid);

    await ensurePublicSingletons(strapi as never);

    expect(error).toHaveBeenCalledWith(
      `[bootstrap] Failed to seed singleton ${failed.uid}`,
      expect.any(Error),
    );
    expect(documents.get(PUBLIC_SINGLETON_SEEDS[1]!.uid)!.findFirst).toHaveBeenCalled();
    expect(createCalls.map((call) => call.uid)).toEqual(
      PUBLIC_SINGLETON_SEEDS.slice(1).map((seed) => seed.uid),
    );
  });

  it("supplies all schema-required fields for every singleton seed", () => {
    const schemasByUid = {
      "api::site-setting.site-setting": siteSettingSchema,
      "api::footer-block.footer-block": footerBlockSchema,
      "api::hero-section.hero-section": heroSectionSchema,
      "api::about-section.about-section": aboutSectionSchema,
      "api::contact-cta-section.contact-cta-section": contactCtaSectionSchema,
    } as const;

    for (const seed of PUBLIC_SINGLETON_SEEDS) {
      const requiredFields = Object.entries(schemasByUid[seed.uid].attributes)
        .filter(([, attribute]) => attribute.required)
        .map(([name]) => name);

      expect(requiredFields).not.toHaveLength(0);
      for (const field of requiredFields) {
        expect(seed.data[field]).toEqual(expect.any(String));
        expect((seed.data[field] as string).trim()).not.toBe("");
      }
    }
  });
});
