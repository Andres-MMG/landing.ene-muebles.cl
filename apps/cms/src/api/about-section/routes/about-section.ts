import { factories } from "@strapi/strapi";

const draftReadPolicy = "global::require-api-token-for-draft";

export default factories.createCoreRouter("api::about-section.about-section", {
  config: {
    find: { policies: [draftReadPolicy] },
  },
});
