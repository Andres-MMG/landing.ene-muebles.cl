/**
 * lead controller — Strapi v5 factory. Only reachable with a valid
 * API token (no Public-role permission is ever granted for this
 * content type; see the privacy note in content-types/lead/schema.json).
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::lead.lead');
