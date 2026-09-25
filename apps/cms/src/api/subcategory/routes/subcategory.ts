import { factories } from "@strapi/strapi";

const draftReadPolicy = "global::require-api-token-for-draft";

export default factories.createCoreRouter("api::subcategory.subcategory", {
  config: {
    find: { policies: [draftReadPolicy] },
    findOne: { policies: [draftReadPolicy] },
  },
});
