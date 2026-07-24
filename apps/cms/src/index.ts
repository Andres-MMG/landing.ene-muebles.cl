/**
 * Strapi v5 bootstrap entry.
 *
 * Slice D bootstrap does two things idempotently on every boot:
 *
 *  1. Public role: ensure `find` / `findOne` are allowed for the three
 *     catalog content types (product, category, site-setting) so the public
 *     Next.js frontend can read content without a session.
 *  2. Admin role + user: create an Editor role scoped to the Content
 *     Manager (read/create/update/delete/publish) for the three catalog
 *     types, and a client admin user wired to that role. Both are
 *     idempotent: re-running skip on existing matches.
 *
 * Each operation is wrapped in its own try/catch so a single failure does
 * not abort the rest of the bootstrap or block the container from coming
 * up healthy.
 */

type Strapi = any;

const PUBLIC_OPERATIONS = ['find', 'findOne'] as const;

const EDITOR_PERMISSION_ACTIONS = [
  'admin::content-manager.explorer.read',
  'admin::content-manager.explorer.create',
  'admin::content-manager.explorer.update',
  'admin::content-manager.explorer.delete',
  'admin::content-manager.explorer.publish',
] as const;

const SCOPED_TYPES = [
  'api::product.product',
  'api::category.category',
  'api::site-setting.site-setting',
] as const;

const log = (msg: string, ...rest: unknown[]) => {
  // eslint-disable-next-line no-console
  console.log(`[bootstrap] ${msg}`, ...rest);
};

const logWarn = (msg: string, ...rest: unknown[]) => {
  // eslint-disable-next-line no-console
  console.warn(`[bootstrap] ${msg}`, ...rest);
};

const logError = (msg: string, err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(`[bootstrap] ${msg}`, err);
};

async function ensurePublicRolePermissions(strapi: Strapi): Promise<void> {
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    logWarn('Public role not found; skipping public-role permission seeding.');
    return;
  }

  for (const action of SCOPED_TYPES) {
    for (const operation of PUBLIC_OPERATIONS) {
      try {
        const existing = await strapi
          .query('plugin::users-permissions.permission')
          .findOne({
            where: {
              role: publicRole.id,
              action: `${action}.${operation}`,
            },
          });

        if (existing) {
          log(`Public already allowed: ${action}.${operation}`);
          continue;
        }

        await strapi.query('plugin::users-permissions.permission').create({
          data: {
            role: publicRole.id,
            action: `${action}.${operation}`,
          },
        });
        log(`Granted public: ${action}.${operation}`);
      } catch (err) {
        logError(`Failed to grant public ${action}.${operation}`, err);
      }
    }
  }
}

async function ensureEditorRole(strapi: Strapi): Promise<number | null> {
  // Strapi v5 already seeds three default admin roles (Author, Editor,
  // Super Admin). We always pick the existing "Editor" role and replace
  // its permissions so the role stays scoped to the catalog.
  const existing = await strapi.db.query('admin::role').findOne({
    where: { name: 'Editor' },
  });

  if (existing?.id) {
    log(`Editor role already exists (id=${existing.id}); will refresh permissions.`);
    return existing.id;
  }

  try {
    const created = await strapi.db.query('admin::role').create({
      data: {
        name: 'Editor',
        code: 'editor',
        description: 'Content manager for the catalog (client)',
        permissions: [],
      },
    });
    log(`Editor role created (id=${created.id}).`);
    return created.id;
  } catch (err) {
    logError('Editor role creation failed', err);
    return null;
  }
}

async function ensureEditorPermissions(strapi: Strapi, roleId: number): Promise<void> {
  const role = await strapi.db.query('admin::role').findOne({ where: { id: roleId } });
  if (!role) {
    logWarn(`Editor role (id=${roleId}) not found; skipping permission write.`);
    return;
  }

  const current: Array<{ action: string }> = Array.isArray(role.permissions)
    ? role.permissions
    : [];

  const next = [...current];

  for (const action of EDITOR_PERMISSION_ACTIONS) {
    for (const uid of SCOPED_TYPES) {
      const fullAction = `${action}.${uid}`;
      if (next.some((p) => p.action === fullAction)) continue;
      next.push({ action: fullAction });
    }
  }

  try {
    await strapi.db.query('admin::role').update({
      where: { id: roleId },
      data: { permissions: next },
    });
    log(`Editor permissions updated (${next.length} total).`);
  } catch (err) {
    logError('Failed to update Editor role permissions', err);
  }
}

async function ensureClientUser(strapi: Strapi, editorRoleId: number): Promise<void> {
  const email = 'cliente@ene-muebles.cl';
  const existing = await strapi.db
    .query('admin::user')
    .findOne({ where: { email } });

  if (existing) {
    log(`Client user already exists (${email}).`);
    return;
  }

  try {
    await strapi.db.query('admin::user').create({
      data: {
        email,
        firstname: 'Cliente',
        lastname: 'Ene Muebles',
        username: 'cliente',
        password: 'Cliente2026!',
        blocked: false,
        isActive: true,
        roles: [editorRoleId],
      },
    });
    log(`Client user created (${email}).`);
  } catch (err) {
    logError('Failed to create client user', err);
  }
}

export default {
  /**
   * Runs before the application is initialized.
   * Register custom plugins, fields, or middlewares here.
   */
  register(/* { strapi }: { strapi: any } */) {},

  /**
   * Runs before the application starts. Idempotent — safe to run
   * on every container start.
   */
  async bootstrap({ strapi }: { strapi: Strapi }) {
    try {
      await ensurePublicRolePermissions(strapi);
    } catch (err) {
      logError('Public-role seeding failed', err);
    }

    let editorRoleId: number | null = null;
    try {
      editorRoleId = await ensureEditorRole(strapi);
    } catch (err) {
      logError('Editor role creation failed', err);
    }

    if (editorRoleId !== null) {
      try {
        await ensureEditorPermissions(strapi, editorRoleId);
      } catch (err) {
        logError('Editor permissions failed', err);
      }

      try {
        await ensureClientUser(strapi, editorRoleId);
      } catch (err) {
        logError('Client user creation failed', err);
      }
    }
  },
};
