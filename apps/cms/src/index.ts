/**
 * Strapi v5 bootstrap entry.
 *
 * The slice B bootstrap is intentionally minimal: it boots the
 * application without seeding, mutating content, or auto-creating
 * an admin user. Slice C extends this file with idempotent seeding
 * (public-role Lead denial, featured cap, D&P enforcement).
 */

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
  async bootstrap(/* { strapi }: { strapi: any } */) {
    // Placeholder for slice C bootstrap:
    //   - deny public `lead.find` / `lead.findOne`
    //   - cap `featured=true` to 9 entries across Product
    //   - ensure Draft & Publish is enabled on every scoped type
  },
};
