import { factories } from "@strapi/strapi";

const draftReadPolicy = "global::require-api-token-for-draft";

export default factories.createCoreRouter("api::contact-cta-section.contact-cta-section", {
  config: {
    find: { policies: [draftReadPolicy] },
  },
});
