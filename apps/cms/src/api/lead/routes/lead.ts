/**
 * lead routes — Strapi v5 factory. The core router registers the
 * default CRUD routes; access is denied for anonymous clients because
 * the Public role holds no permission on api::lead.lead (the type is
 * deliberately excluded from SCOPED_TYPES in src/index.ts).
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::lead.lead');
