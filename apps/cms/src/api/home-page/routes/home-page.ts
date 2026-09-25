import { factories } from "@strapi/strapi";

const draftReadPolicy = "global::require-api-token-for-draft";

export default factories.createCoreRouter("api::home-page.home-page", {
  config: {
    find: { policies: [draftReadPolicy] },
  },
});
