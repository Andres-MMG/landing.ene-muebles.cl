import { factories } from "@strapi/strapi";

const draftReadPolicy = "global::require-api-token-for-draft";

export default factories.createCoreRouter("api::footer-block.footer-block", {
  config: {
    find: { policies: [draftReadPolicy] },
  },
});
