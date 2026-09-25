import { factories } from "@strapi/strapi";

const draftReadPolicy = "global::require-api-token-for-draft";

export default factories.createCoreRouter("api::site-setting.site-setting", {
  config: {
    find: { policies: [draftReadPolicy] },
  },
});
