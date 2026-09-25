import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import aboutSectionSchema from "./api/about-section/content-types/about-section/schema.json";
import catalogPageSchema from "./api/catalog-page/content-types/catalog-page/schema.json";
import contactCtaSectionSchema from "./api/contact-cta-section/content-types/contact-cta-section/schema.json";
import contactPageSchema from "./api/contact-page/content-types/contact-page/schema.json";
import footerBlockSchema from "./api/footer-block/content-types/footer-block/schema.json";
import heroSectionSchema from "./api/hero-section/content-types/hero-section/schema.json";
import homePageSchema from "./api/home-page/content-types/home-page/schema.json";
import siteSettingSchema from "./api/site-setting/content-types/site-setting/schema.json";
import {
  ensureBootstrapSuperAdmin,
  ensureClientUser,
  ensurePublicSingletons,
  PUBLIC_SINGLETON_SEEDS,
  SCOPED_TYPES,
} from "./index";

type ExistingDocument = { publishedAt: string | null };
type CreateCall = { uid: string; options: { data: Record<string, unknown>; status: string } };

const createStrongTestPassword = (label: string): string => `${label}_Aa1-${randomUUID()}`;
const createShortTestPassword = (): string => "a".repeat(15);
const createSingleClassTestPassword = (): string => "a".repeat(16);

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
      "api::home-page.home-page": homePageSchema,
      "api::catalog-page.catalog-page": catalogPageSchema,
      "api::contact-page.contact-page": contactPageSchema,
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

  it("models the homepage editorial copy as explicit required fields", () => {
    expect(homePageSchema.kind).toBe("singleType");
    expect(homePageSchema.options.draftAndPublish).toBe(true);
    expect(Object.keys(homePageSchema.attributes)).toEqual(
      expect.arrayContaining([
        "catalogEyebrow",
        "catalogTitle",
        "catalogBody",
        "catalogCtaLabel",
        "featuredEyebrow",
        "featuredTitle",
        "featuredBody",
        "featuredCtaLabel",
      ]),
    );
    expect(
      Object.entries(homePageSchema.attributes)
        .filter(([, field]) => field.required)
        .map(([name]) => name),
    ).toEqual([
      "catalogEyebrow",
      "catalogTitle",
      "catalogBody",
      "catalogCtaLabel",
      "featuredEyebrow",
      "featuredTitle",
      "featuredBody",
      "featuredCtaLabel",
    ]);
    expect(homePageSchema.attributes.seoTitle.required).toBe(false);
    expect(homePageSchema.attributes.seoDescription.required).toBe(false);
  });

  it("models catalog and printable-catalog copy as explicit required fields", () => {
    expect(catalogPageSchema.kind).toBe("singleType");
    expect(catalogPageSchema.options.draftAndPublish).toBe(true);
    expect(Object.keys(catalogPageSchema.attributes)).toEqual(
      expect.arrayContaining([
        "eyebrow",
        "productCountSuffix",
        "documentationText",
        "printCtaLabel",
        "printCoverTitle",
        "printCoverBody",
        "printIndexTitle",
        "printCategorySubtitle",
        "printPublishedProductsSuffix",
      ]),
    );
    expect(
      Object.entries(catalogPageSchema.attributes)
        .filter(([, field]) => field.required)
        .map(([name]) => name),
    ).toEqual([
      "eyebrow",
      "productCountSuffix",
      "documentationText",
      "printCtaLabel",
      "printCoverTitle",
      "printCoverBody",
      "printIndexTitle",
      "printCategorySubtitle",
      "printPublishedProductsSuffix",
    ]);
    expect(catalogPageSchema.attributes.seoTitle.required).toBe(false);
    expect(catalogPageSchema.attributes.seoDescription.required).toBe(false);
  });

  it("models all contact-page copy as required bounded fields and scopes it publicly", () => {
    const expectedFields = [
      "heroEyebrow",
      "heroTitle",
      "heroBody",
      "whatsappCtaLabel",
      "emailCtaLabel",
      "alternateContactEyebrow",
      "phoneContactLabel",
      "whatsappContactLabel",
      "businessHoursLabel",
      "addressLabel",
      "formEyebrow",
      "formTitle",
      "formBody",
      "nameFieldLabel",
      "institutionFieldLabel",
      "emailFieldLabel",
      "phoneFieldLabel",
      "productFieldLabel",
      "generalInquiryLabel",
      "regionFieldLabel",
      "regionPlaceholder",
      "messageFieldLabel",
      "consentBeforeLink",
      "consentPrivacyLinkLabel",
      "consentAfterLink",
      "responseTimeText",
      "submitLabel",
    ];

    expect(contactPageSchema.kind).toBe("singleType");
    expect(contactPageSchema.options.draftAndPublish).toBe(true);
    expect(
      Object.entries(contactPageSchema.attributes)
        .filter(([, field]) => field.required)
        .map(([name]) => name),
    ).toEqual(expectedFields);
    expect(contactPageSchema.attributes.seoTitle.required).toBe(false);
    expect(contactPageSchema.attributes.seoDescription.required).toBe(false);
    expect(
      Object.values(contactPageSchema.attributes).every(
        (field) => typeof field.maxLength === "number",
      ),
    ).toBe(true);
    expect(SCOPED_TYPES).toContain("api::contact-page.contact-page");
  });

  it("keeps the new About and shared Contact CTA copy explicit without making it required", () => {
    expect(aboutSectionSchema.attributes).toEqual(
      expect.objectContaining({
        pageEyebrow: expect.objectContaining({ type: "string" }),
        pageTitle: expect.objectContaining({ type: "string" }),
        yearsInBusinessLabel: expect.objectContaining({ type: "string" }),
        productCountLabel: expect.objectContaining({ type: "string" }),
        productLineCountLabel: expect.objectContaining({ type: "string" }),
        coverageLabel: expect.objectContaining({ type: "string" }),
        warrantyLabel: expect.objectContaining({ type: "string" }),
        projectCtaTitle: expect.objectContaining({ type: "string" }),
        projectCtaBody: expect.objectContaining({ type: "text" }),
        projectCtaLabel: expect.objectContaining({ type: "string" }),
        values: expect.objectContaining({ type: "json" }),
      }),
    );
    expect(contactCtaSectionSchema.attributes).toEqual(
      expect.objectContaining({
        eyebrow: expect.objectContaining({ type: "string" }),
        emailLabel: expect.objectContaining({ type: "string" }),
      }),
    );
  });

  it("adds CTA microcopy only to the create-only seed for an absent document", () => {
    const seed = PUBLIC_SINGLETON_SEEDS.find(
      ({ uid }) => uid === "api::contact-cta-section.contact-cta-section",
    );
    expect(seed?.data).toEqual(
      expect.objectContaining({ eyebrow: "Hablemos", emailLabel: "Correo" }),
    );
  });

  it("keeps reusable commercial facts explicit in Site Setting", () => {
    expect(siteSettingSchema.attributes).toEqual(
      expect.objectContaining({
        paymentTermsText: expect.objectContaining({ type: "text" }),
        warrantyText: expect.objectContaining({ type: "text" }),
        quoteResponseTimeText: expect.objectContaining({ type: "text" }),
        foundedYear: expect.objectContaining({ type: "integer", min: 1800, max: 2100 }),
      }),
    );
  });
  it("models optional global navigation and product-action copy without seeding it", () => {
    expect(siteSettingSchema.attributes).toEqual(
      expect.objectContaining({
        navigationHomeLabel: { type: "string", required: false, maxLength: 24 },
        navigationCatalogLabel: { type: "string", required: false, maxLength: 24 },
        navigationAboutLabel: { type: "string", required: false, maxLength: 24 },
        navigationContactLabel: { type: "string", required: false, maxLength: 24 },
        headerWhatsappLabel: { type: "string", required: false, maxLength: 24 },
        mobileWhatsappLabel: { type: "string", required: false, maxLength: 80 },
        whatsappProductMessageTemplate: { type: "text", required: false, maxLength: 1000 },
        productCardDetailLabel: { type: "string", required: false, maxLength: 60 },
        productCardWhatsappLabel: { type: "string", required: false, maxLength: 60 },
        productDetailWhatsappLabel: { type: "string", required: false, maxLength: 80 },
        productDetailContactLabel: { type: "string", required: false, maxLength: 80 },
      }),
    );

    const siteSettingSeed = PUBLIC_SINGLETON_SEEDS.find(
      ({ uid }) => uid === "api::site-setting.site-setting",
    );
    expect(siteSettingSeed?.data).not.toEqual(
      expect.objectContaining({
        navigationHomeLabel: expect.anything(),
        whatsappProductMessageTemplate: expect.anything(),
      }),
    );
  });

  it("models and create-only seeds all optional Footer labels", () => {
    const defaults = {
      productCountSuffix: "productos certificados para instituciones",
      catalogHeading: "Catálogo",
      contactHeading: "Contacto",
      legalHeading: "Legal",
      socialHeading: "Redes",
      catalogCtaLabel: "Ver catálogo",
      officeLineLabel: "Línea oficina",
      schoolLineLabel: "Línea escolar",
      aboutLinkLabel: "Sobre nosotros",
      termsLinkLabel: "Términos y condiciones",
      privacyLinkLabel: "Política de privacidad",
      rutLabel: "RUT",
      catalogStampLabel: "Catálogo institucional",
      writtenBackingLabel: "Respaldo escrito",
    };

    for (const field of Object.keys(defaults)) {
      const attribute =
        footerBlockSchema.attributes[field as keyof typeof footerBlockSchema.attributes];
      expect(attribute.required).not.toBe(true);
    }

    const footerSeed = PUBLIC_SINGLETON_SEEDS.find(
      ({ uid }) => uid === "api::footer-block.footer-block",
    );
    expect(footerSeed?.data).toEqual(expect.objectContaining(defaults));
  });

  it("keeps hero-owned captions and proof-rail copy explicit", () => {
    expect(heroSectionSchema.attributes).toEqual(
      expect.objectContaining({
        imageCaption: expect.objectContaining({ type: "string" }),
        galleryCaption: expect.objectContaining({ type: "string" }),
        railSecondaryText: expect.objectContaining({ type: "string" }),
      }),
    );
  });
});

type SuperAdminStubOptions = {
  existingSuperAdmin?: boolean;
  inactiveSuperAdmin?: boolean;
  blockedSuperAdmin?: boolean;
  existingEmailUser?: boolean;
  missingRole?: boolean;
  createError?: Error;
};

const createSuperAdminStrapiStub = ({
  existingSuperAdmin = false,
  inactiveSuperAdmin = false,
  blockedSuperAdmin = false,
  existingEmailUser = false,
  missingRole = false,
  createError,
}: SuperAdminStubOptions = {}) => {
  let hasSuperAdmin = existingSuperAdmin;
  const create = vi.fn(async () => {
    if (createError) throw createError;
    hasSuperAdmin = true;
    return { id: 2 };
  });
  const findRoleUser = vi.fn(
    async (options?: { where?: { isActive?: boolean; blocked?: boolean } }) => {
      if (hasSuperAdmin) return { id: 1 };
      if (inactiveSuperAdmin && options?.where?.isActive !== true) return { id: 1 };
      if (blockedSuperAdmin && options?.where?.blocked !== false) return { id: 1 };
      return null;
    },
  );
  const findOneByEmail = vi.fn(async () => (existingEmailUser ? { id: 9 } : null));

  return {
    strapi: {
      service: vi.fn((uid: string) => {
        if (uid === "admin::role") {
          return { getSuperAdmin: vi.fn(async () => (missingRole ? null : { id: 1 })) };
        }
        return { findOneByEmail, create };
      }),
      db: { query: vi.fn(() => ({ findOne: findRoleUser })) },
    },
    create,
    findOneByEmail,
    findRoleUser,
  };
};

const createEditorStrapiStub = (existingUser = false) => {
  const create = vi.fn(async () => ({ id: 2 }));
  const findOneByEmail = vi.fn(async () => (existingUser ? { id: 1 } : null));

  return {
    strapi: { service: vi.fn(() => ({ findOneByEmail, create })) },
    create,
  };
};

describe("bootstrap Super Admin", () => {
  const environment = process.env;
  const superAdminPassword = createStrongTestPassword("super-admin");
  const editorPassword = createStrongTestPassword("editor");

  beforeEach(() => {
    process.env = {
      ...environment,
      STRAPI_BOOTSTRAP_SUPER_ADMIN_EMAIL: "owner@example.com",
      STRAPI_BOOTSTRAP_SUPER_ADMIN_PASSWORD: superAdminPassword,
      CLIENT_ADMIN_PASSWORD: editorPassword,
    };
  });

  it("creates an active dedicated Super Admin through the admin user service", async () => {
    const { strapi, create } = createSuperAdminStrapiStub();

    await ensureBootstrapSuperAdmin(strapi as never);

    expect(create).toHaveBeenCalledWith({
      email: "owner@example.com",
      firstname: "Bootstrap",
      lastname: "Super Admin",
      username: "owner@example.com",
      password: superAdminPassword,
      blocked: false,
      isActive: true,
      roles: [1],
    });
  });

  it("does nothing when a Super Admin already exists", async () => {
    const { strapi, create, findOneByEmail } = createSuperAdminStrapiStub({
      existingSuperAdmin: true,
    });

    await ensureBootstrapSuperAdmin(strapi as never);

    expect(findOneByEmail).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("creates an active Super Admin when only inactive Super Admin users exist", async () => {
    const { strapi, create, findRoleUser } = createSuperAdminStrapiStub({
      inactiveSuperAdmin: true,
    });

    await ensureBootstrapSuperAdmin(strapi as never);

    expect(findRoleUser).toHaveBeenCalledWith({
      where: { roles: { id: 1 }, isActive: true, blocked: false },
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("creates an unblocked Super Admin when only blocked active Super Admin users exist", async () => {
    const { strapi, create, findRoleUser } = createSuperAdminStrapiStub({
      blockedSuperAdmin: true,
    });

    await ensureBootstrapSuperAdmin(strapi as never);

    expect(findRoleUser).toHaveBeenCalledWith({
      where: { roles: { id: 1 }, isActive: true, blocked: false },
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("rejects an email collision without modifying the existing Editor", async () => {
    const { strapi, create, findRoleUser } = createSuperAdminStrapiStub({
      existingEmailUser: true,
    });

    await expect(ensureBootstrapSuperAdmin(strapi as never)).rejects.toThrow(
      "configured email belongs to an existing non-Super-Admin user",
    );

    expect(create).not.toHaveBeenCalled();
    expect(findRoleUser).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["missing Super Admin role", { missingRole: true }, {}],
    ["missing credentials", {}, { STRAPI_BOOTSTRAP_SUPER_ADMIN_EMAIL: undefined }],
    ["invalid email", {}, { STRAPI_BOOTSTRAP_SUPER_ADMIN_EMAIL: "not-an-email" }],
    ["short password", {}, { STRAPI_BOOTSTRAP_SUPER_ADMIN_PASSWORD: createShortTestPassword() }],
    [
      "password without required character variety",
      {},
      { STRAPI_BOOTSTRAP_SUPER_ADMIN_PASSWORD: createSingleClassTestPassword() },
    ],
  ])("fails closed for %s", async (_name, options, environmentOverrides) => {
    const { strapi, create } = createSuperAdminStrapiStub(options);
    for (const [name, value] of Object.entries(environmentOverrides)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }

    await expect(ensureBootstrapSuperAdmin(strapi as never)).rejects.toThrow(
      "Bootstrap Super Admin cannot be established",
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("accepts a duplicate-create race only after a Super Admin recheck succeeds", async () => {
    const duplicateError = new Error("duplicate email");
    const { strapi, findRoleUser } = createSuperAdminStrapiStub({ createError: duplicateError });
    findRoleUser.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 10 });

    await expect(ensureBootstrapSuperAdmin(strapi as never)).resolves.toBeUndefined();
    expect(findRoleUser).toHaveBeenCalledTimes(2);
  });
});

describe("bootstrap Editor", () => {
  const environment = process.env;
  const editorPassword = createStrongTestPassword("editor");

  beforeEach(() => {
    process.env = { ...environment, CLIENT_ADMIN_PASSWORD: editorPassword };
  });

  it("creates the Editor with a configured high-entropy password", async () => {
    const { strapi, create } = createEditorStrapiStub();

    await ensureClientUser(strapi as never, 2);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ password: editorPassword, roles: [2] }),
    );
  });

  it.each([
    ["missing", undefined],
    ["weak", createSingleClassTestPassword()],
  ])("rejects %s configured credentials before creating the Editor", async (_name, password) => {
    const { strapi, create } = createEditorStrapiStub();
    if (password === undefined) {
      delete process.env.CLIENT_ADMIN_PASSWORD;
    } else {
      process.env.CLIENT_ADMIN_PASSWORD = password;
    }

    await expect(ensureClientUser(strapi as never, 2)).rejects.toThrow(
      "Client Editor cannot be established",
    );
    expect(create).not.toHaveBeenCalled();
  });
});
