import { factories } from "@strapi/strapi";

const draftReadPolicy = "global::require-api-token-for-draft";

export default factories.createCoreRouter("api::hero-section.hero-section", {
  config: {
    find: { policies: [draftReadPolicy] },
  },
});
