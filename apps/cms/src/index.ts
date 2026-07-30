/**
 * Strapi v5 bootstrap entry.
 *
 * Idempotent on every container start. Five responsibilities, each
 * wrapped in its own try/catch so a single failure does not abort the
 * rest of the bootstrap or block the container from coming up healthy.
 *
 *  1. Public role: ensure `find` / `findOne` are allowed on the three
 *     catalog content types (product, category, site-setting) so the
 *     public Next.js frontend can read content without a session.
 *     Public permissions are content-API scoped: they use
 *     `strapi.db.query('plugin::users-permissions.permission')` with
 *     `action: "api::<uid>.<op>"`.
 *
 *  2. Public singletons: create missing marketing singleton documents as
 *     published, but never change an existing draft or published document.
 *
 *  3. Bootstrap Super Admin: establish a dedicated, environment-configured
 *     Super Admin before any lower-privilege admin account exists.
 *
 *  4. Editor admin role: a scoped admin role for the client with
 *     `read / create / update` (no delete, no publish) on product
 *     and category only. Admin role permissions live in the action
 *     provider; hand-rolling the action name throws
 *     `YupValidationError: not an existing permission action`. The
 *     right way is to read `strapi.service('admin::permission')
 *     .actionProvider.values()`, filter by `section === "contentTypes"`
 *     and matching subject, then call
 *     `contentTypeService.getPermissionsWithNestedFields(...)` to
 *     expand them with the nested field rules, and finally
 *     `roleService.assignPermissions(roleId, expanded)`.
 *
 *  5. Client admin user: `cliente@ene-muebles.cl` with the Editor
 *     role. Must be created via `strapi.service('admin::user').create`
 *     so the password-hash lifecycle runs. Direct
 *     `strapi.db.query('admin::user').create()` BYPASSES the lifecycle
 *     and stores the password in plaintext, which is the bug that
 *     broke the previous client login.
 */

import type { Core } from "@strapi/strapi";
import bcrypt from "bcryptjs";

const PUBLIC_OPERATIONS = ["find", "findOne"] as const;

const SCOPED_TYPES = [
  "api::product.product",
  "api::category.category",
  "api::site-setting.site-setting",
  // Batch 2: marketing-section singletons consumed read-only by the
  // public Next.js frontend. They are written by the Next.js admin
  // panel via the full STRAPI_ADMIN_TOKEN, not by the Editor role,
  // so they intentionally stay out of EDITOR_CONTENT_TYPES below.
  "api::about-section.about-section",
  "api::hero-section.hero-section",
  "api::contact-cta-section.contact-cta-section",
  "api::footer-block.footer-block",
  // S2: catalog-import — auto-created by the bulk import endpoint and
  // read by the public catalog to filter products by subcategory.
  "api::subcategory.subcategory",
] as const;

const EDITOR_CONTENT_TYPES = ["api::product.product", "api::category.category"] as const;

// Editor gets read/create/update only — no delete, no publish. Delete
// and publish stay reserved for the Super Admin. The client can
// unpublish (active=false) but cannot fully remove entries.
const EDITOR_ACTIONS = ["read", "create", "update"] as const;

// Schema-valid bootstrap value only. Public renderers must never display it.
export const PENDING_RUT_SENTINEL = "Pending confirmation";

type SingletonSeed = {
  uid:
    | "api::site-setting.site-setting"
    | "api::footer-block.footer-block"
    | "api::hero-section.hero-section"
    | "api::about-section.about-section"
    | "api::contact-cta-section.contact-cta-section";
  data: Record<string, unknown>;
};

export const PUBLIC_SINGLETON_SEEDS: readonly SingletonSeed[] = [
  {
    uid: "api::site-setting.site-setting",
    data: {
      siteName: "Ene Muebles",
      whatsappDefaultMessage: "Hola, quisiera información sobre mobiliario.",
      rut: PENDING_RUT_SENTINEL,
    },
  },
  {
    uid: "api::footer-block.footer-block",
    data: {
      copyrightText: `© ${new Date().getFullYear()} Ene Muebles`,
    },
  },
  {
    uid: "api::hero-section.hero-section",
    data: {
      eyebrow: "Ene Muebles",
      title: "Mobiliario para instituciones.",
      primaryCtaLabel: "Ver catálogo",
      primaryCtaHref: "/catalogo",
    },
  },
  {
    uid: "api::about-section.about-section",
    data: {
      eyebrow: "Información",
      title: "Ene Muebles",
    },
  },
  {
    uid: "api::contact-cta-section.contact-cta-section",
    data: {
      title: "Contáctanos",
      buttonLabel: "Contactar",
    },
  },
] as const;

const log = (...args: unknown[]) => {
  // eslint-disable-next-line no-console
  console.log("[bootstrap]", ...args);
};

const logWarn = (...args: unknown[]) => {
  // eslint-disable-next-line no-console
  console.warn("[bootstrap]", ...args);
};

const logError = (msg: string, err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(`[bootstrap] ${msg}`, err);
};

const isActionAllowed = (action: string, allowed: string[]): boolean =>
  allowed.some((prefix) => action.startsWith(prefix));

const actionId = (uid: string, op: string): string => `${uid}.${op}`;

const isValidBootstrapEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isHighEntropyBootstrapPassword = (password: string): boolean =>
  password.length >= 16 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9\s]/.test(password);

const requireHighEntropyBootstrapPassword = (variableName: string, context: string): string => {
  const password = process.env[variableName];
  if (!password || !isHighEntropyBootstrapPassword(password)) {
    throw new Error(
      `${context}: ${variableName} must be at least 16 characters and include lowercase, uppercase, numeric, and symbol characters.`,
    );
  }
  return password;
};

type AdminRole = { id: number };
type AdminUser = { id: number };

export async function ensureBootstrapSuperAdmin(strapi: Core.Strapi): Promise<void> {
  const roleService = strapi.service("admin::role") as {
    getSuperAdmin: () => Promise<AdminRole | null>;
  };
  const userService = strapi.service("admin::user") as {
    findOneByEmail: (email: string) => Promise<AdminUser | null>;
    create: (attributes: Record<string, unknown>) => Promise<AdminUser>;
  };
  const adminUsers = strapi.db.query("admin::user") as {
    findOne: (options: {
      where: { roles: { id: number }; isActive: true; blocked: false };
    }) => Promise<AdminUser | null>;
  };

  const superAdminRole = await roleService.getSuperAdmin();
  if (!superAdminRole) {
    throw new Error(
      "Bootstrap Super Admin cannot be established: Super Admin role is unavailable.",
    );
  }

  const findExistingUsableSuperAdmin = (): Promise<AdminUser | null> =>
    adminUsers.findOne({
      where: { roles: { id: superAdminRole.id }, isActive: true, blocked: false },
    });

  if (await findExistingUsableSuperAdmin()) {
    log("Usable Super Admin already exists; bootstrap Super Admin creation skipped.");
    return;
  }

  const email = process.env.STRAPI_BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim();
  const password = process.env.STRAPI_BOOTSTRAP_SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Bootstrap Super Admin cannot be established: STRAPI_BOOTSTRAP_SUPER_ADMIN_EMAIL and STRAPI_BOOTSTRAP_SUPER_ADMIN_PASSWORD are required.",
    );
  }
  if (!isValidBootstrapEmail(email)) {
    throw new Error("Bootstrap Super Admin cannot be established: configured email is invalid.");
  }
  const validatedPassword = requireHighEntropyBootstrapPassword(
    "STRAPI_BOOTSTRAP_SUPER_ADMIN_PASSWORD",
    "Bootstrap Super Admin cannot be established",
  );

  const existingUser = await userService.findOneByEmail(email);
  if (existingUser) {
    throw new Error(
      "Bootstrap Super Admin cannot be established: configured email belongs to an existing non-Super-Admin user.",
    );
  }

  try {
    await userService.create({
      email,
      firstname: "Bootstrap",
      lastname: "Super Admin",
      username: email,
      password: validatedPassword,
      blocked: false,
      isActive: true,
      roles: [superAdminRole.id],
    });
    log(`Bootstrap Super Admin created (${email}).`);
  } catch (err) {
    // Another instance may have created a usable user after our initial role check.
    // Recheck the role relation rather than assuming a duplicate-email error.
    if (await findExistingUsableSuperAdmin()) {
      log("Usable Super Admin was created concurrently; bootstrap Super Admin creation skipped.");
      return;
    }
    throw new Error("Bootstrap Super Admin cannot be established.", { cause: err });
  }
}

async function ensurePublicRolePermissions(strapi: Core.Strapi): Promise<void> {
  const role = await strapi.db
    .query("plugin::users-permissions.role")
    .findOne({ where: { type: "public" } });

  if (!role) {
    logWarn("Public role not found; skipping public-role permission seeding.");
    return;
  }

  // Snapshot the existing permissions so we don't churn the DB on every boot.
  const current = await strapi.db
    .query("plugin::users-permissions.permission")
    .findMany({ where: { role: role.id } });
  const existingActions = new Set((current as Array<{ action: string }>).map((p) => p.action));

  const toCreate: Array<{ action: string; role: number }> = [];
  for (const uid of SCOPED_TYPES) {
    for (const op of PUBLIC_OPERATIONS) {
      const action = actionId(uid, op);
      if (existingActions.has(action)) {
        log(`Public already allowed: ${action}`);
        continue;
      }
      toCreate.push({ action, role: role.id });
    }
  }

  if (toCreate.length === 0) return;

  for (const perm of toCreate) {
    try {
      await strapi.db.query("plugin::users-permissions.permission").create({ data: perm });
      log(`Granted public: ${perm.action}`);
    } catch (err) {
      logError(`Failed to grant public ${perm.action}`, err);
    }
  }
}

export async function ensurePublicSingletons(strapi: Core.Strapi): Promise<void> {
  for (const singleton of PUBLIC_SINGLETON_SEEDS) {
    try {
      // `status: 'draft'` includes documents that have a published version,
      // so an existing draft OR published singleton is left completely untouched.
      const existing = await strapi.documents(singleton.uid).findFirst({ status: "draft" });
      if (existing) {
        log(`Singleton already exists: ${singleton.uid}`);
        continue;
      }

      await strapi.documents(singleton.uid).create({
        data: singleton.data,
        status: "published",
      });
      log(`Created published singleton: ${singleton.uid}`);
    } catch (err) {
      // Each singleton is independent: a schema or data error must not stop
      // the remaining public documents or the rest of the bootstrap.
      logError(`Failed to seed singleton ${singleton.uid}`, err);
    }
  }
}

async function ensureEditorRole(strapi: Core.Strapi): Promise<number | null> {
  // Strapi v5 seeds three default admin roles: Super Admin, Editor,
  // Author. We pick the existing "Editor" role (id 2 in fresh DBs)
  // and refresh its permissions on every boot. We do NOT create a
  // duplicate role if one already exists.
  const roles = (await strapi.db.query("admin::role").findMany({})) as Array<{
    id: number;
    name: string;
    code: string;
  }>;
  const existing = roles.find((r) => r.name === "Editor" || r.code === "editor");

  if (existing) {
    log(`Editor role already exists (id=${existing.id}); will refresh permissions.`);
    return existing.id;
  }

  try {
    const created = (await strapi.db.query("admin::role").create({
      data: {
        name: "Editor",
        code: "editor",
        description: "Catalog content manager for Ene Muebles (client).",
      },
    })) as { id: number };
    log(`Editor role created (id=${created.id}).`);
    return created.id;
  } catch (err) {
    logError("Editor role creation failed", err);
    return null;
  }
}

async function ensureEditorPermissions(strapi: Core.Strapi, roleId: number): Promise<void> {
  // Strapi v5 admin role permissions live in two systems that must
  // be in sync:
  //   - The actionProvider (the catalog of every valid `action` and
  //     its `subject` UIDs) is exposed by the permission service.
  //   - The role service's `assignPermissions(roleId, permissions)`
  //     REPLACES the role's permission set with what we pass in.
  //   - The content-type service's
  //     `getPermissionsWithNestedFields(actions, options)` expands
  //     the action set into concrete permission rules with the right
  //     `action` (e.g. "plugin::content-manager.collection-types.api::product.product.read")
  //     and `subject` (e.g. "api::product.product") pair.
  //
  // Hand-rolling the action names will throw
  //   YupValidationError: "X is not an existing permission action"
  // because the actionProvider doesn't accept ad-hoc strings.
  const permissionService = strapi.service("admin::permission") as {
    actionProvider: {
      values: () => Array<{
        actionId: string;
        section?: string;
        subjects?: string[] | null;
      }>;
    };
  };
  const contentTypeService = strapi.service("admin::content-type") as {
    getPermissionsWithNestedFields: (
      actions: Array<unknown>,
      options?: { restrictedSubjects?: string[] },
    ) => Array<{ action: string; subject: string | null }>;
  };
  const roleService = strapi.service("admin::role") as {
    assignPermissions: (
      roleId: number,
      permissions: Array<{ action: string; subject: string | null }>,
    ) => Promise<unknown>;
  };

  try {
    const allActions = permissionService.actionProvider.values();
    // The actionProvider emits one entry per (action, subject) pair.
    // For content-type permissions, the subject is the content type
    // UID and the actionId looks like
    //   "plugin::content-manager.collection-types.<uid>.<op>"
    // We filter to our two content types and the read/create/update
    // actions. Delete and publish are intentionally excluded so the
    // client cannot remove entries or push unapproved changes live.
    const relevant = allActions.filter((a) => {
      if (a.section !== "contentTypes") return false;
      if (!Array.isArray(a.subjects)) return false;
      const matchesType = EDITOR_CONTENT_TYPES.some((uid) => a.subjects!.includes(uid));
      if (!matchesType) return false;
      const op = EDITOR_ACTIONS.find((op) => a.actionId.endsWith(`.${op}`));
      return Boolean(op);
    });

    const expanded = contentTypeService.getPermissionsWithNestedFields(relevant, {
      restrictedSubjects: ["plugin::users-permissions.user"],
    });

    if (expanded.length === 0) {
      logWarn("Editor permissions: no matching actions found in actionProvider.");
      return;
    }

    await roleService.assignPermissions(roleId, expanded);
    log(
      `Editor permissions assigned: ${expanded.length} rules across ${EDITOR_CONTENT_TYPES.length} content types.`,
    );
  } catch (err) {
    logError("Failed to assign Editor role permissions", err);
  }
}

export async function ensureClientUser(strapi: Core.Strapi, editorRoleId: number): Promise<void> {
  const email = "cliente@ene-muebles.cl";

  // The user service is the only way to create an admin user that
  // runs the password-hash lifecycle. Direct
  // `strapi.db.query('admin::user').create()` BYPASSES the lifecycle
  // and stores the password in plaintext, which is the bug the
  // previous bootstrap had.
  const userService = strapi.service("admin::user") as {
    findOneByEmail: (email: string) => Promise<{ id: number } | null>;
    create: (attributes: Record<string, unknown>) => Promise<{ id: number }>;
  };

  const existing = await userService.findOneByEmail(email);
  if (existing) {
    log(`Client user already exists (${email}).`);
    return;
  }

  const password = requireHighEntropyBootstrapPassword(
    "CLIENT_ADMIN_PASSWORD",
    "Client Editor cannot be established",
  );

  await userService.create({
    email,
    firstname: "Cliente",
    lastname: "Ene Muebles",
    username: "cliente",
    password,
    blocked: false,
    isActive: true,
    roles: [editorRoleId],
  });
  log(`Client user created (${email}).`);
}

export default {
  /**
   * Runs before the application is initialized.
   * Register custom plugins, fields, or middlewares here.
   */
  register() {},

  /**
   * Runs before the application starts. Idempotent — safe to run
   * on every container start.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // This is intentionally not isolated in a try/catch: continuing to seed
    // lower-privilege admin users without a Super Admin would lock out /admin.
    await ensureBootstrapSuperAdmin(strapi);

    try {
      await ensurePublicRolePermissions(strapi);
    } catch (err) {
      logError("Public-role seeding failed", err);
    }

    await ensurePublicSingletons(strapi);

    const editorRoleId = await ensureEditorRole(strapi);

    if (editorRoleId !== null) {
      try {
        await ensureEditorPermissions(strapi, editorRoleId);
      } catch (err) {
        logError("Editor permissions failed", err);
      }

      await ensureClientUser(strapi, editorRoleId);
    } else {
      logWarn("Skipping Editor permissions and client user: role not found.");
    }

    // Frontend admin user (Ene Muebles admin panel via Next.js).
    // Independent of the Strapi admin role. Lives in a custom
    // content-type so the public site, the Next.js admin, and any
    // future tooling can share the same auth model.
    try {
      await ensureAdminUser(strapi);
    } catch (err) {
      logError("Admin user seeding failed", err);
    }

    log("Bootstrap complete.");
  },
};

async function ensureAdminUser(strapi: Core.Strapi): Promise<void> {
  const email = "cliente@ene-muebles.cl";

  const existing = await strapi.db.query("api::admin-user.admin-user").findOne({
    where: { email },
  });
  if (existing) {
    log(`Admin user already exists (${email}).`);
    return;
  }

  const password = requireHighEntropyBootstrapPassword(
    "CLIENT_ADMIN_PASSWORD",
    "Frontend admin user cannot be established",
  );

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await strapi.db.query("api::admin-user.admin-user").create({
      data: {
        email,
        name: "Cliente",
        passwordHash,
        role: "client",
        active: true,
      },
    });
    log(`Admin user created (${email}) with bcrypt-hashed password.`);
  } catch (err) {
    logError("Failed to create admin user", err);
  }
}
